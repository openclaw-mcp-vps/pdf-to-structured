import Anthropic from "@anthropic-ai/sdk";

import type { PdfList, PdfSection, PdfTable } from "@/types/pdf-response";

type ClaudeExtractionInput = {
  pdfBuffer: Buffer;
  rawText: string;
  source: string;
  pageCount: number;
};

type ClaudeExtractionOutput = {
  documentTitle: string;
  sections: PdfSection[];
  tables: PdfTable[];
  warnings: string[];
  modelName: string;
  usedVision: boolean;
  fallback: boolean;
};

type PartialStructuredResponse = {
  documentTitle?: string;
  sections?: unknown;
  tables?: unknown;
  warnings?: unknown;
};

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || "claude-3-7-sonnet-20250219";
const MAX_RAW_TEXT_CHARS = 55_000;

function createSectionId(prefix: string, index: number): string {
  return `${prefix}-${index + 1}`;
}

function clampParagraph(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeTable(table: unknown, index: number): PdfTable {
  const tableObj = (table ?? {}) as Record<string, unknown>;
  const headers = Array.isArray(tableObj.headers)
    ? tableObj.headers.map((cell) => String(cell ?? "").trim()).filter(Boolean)
    : [];
  const rows = Array.isArray(tableObj.rows)
    ? tableObj.rows
        .map((row) => (Array.isArray(row) ? row.map((cell) => String(cell ?? "").trim()) : []))
        .filter((row) => row.length > 0)
    : [];

  return {
    id: String(tableObj.id ?? `table-${index + 1}`),
    title: String(tableObj.title ?? `Table ${index + 1}`).trim(),
    headers,
    rows,
    page: typeof tableObj.page === "number" ? tableObj.page : undefined
  };
}

function normalizeList(list: unknown): PdfList {
  const listObj = (list ?? {}) as Record<string, unknown>;
  const items = Array.isArray(listObj.items)
    ? listObj.items.map((item) => clampParagraph(String(item ?? ""))).filter(Boolean)
    : [];

  return {
    ordered: Boolean(listObj.ordered),
    items
  };
}

function normalizeSection(section: unknown, index: number): PdfSection {
  const sectionObj = (section ?? {}) as Record<string, unknown>;
  const children = Array.isArray(sectionObj.children)
    ? sectionObj.children.map((child, childIndex) => normalizeSection(child, childIndex))
    : [];

  const paragraphs = Array.isArray(sectionObj.paragraphs)
    ? sectionObj.paragraphs.map((paragraph) => clampParagraph(String(paragraph ?? ""))).filter(Boolean)
    : [];

  const lists = Array.isArray(sectionObj.lists) ? sectionObj.lists.map((list) => normalizeList(list)) : [];
  const tables = Array.isArray(sectionObj.tables)
    ? sectionObj.tables.map((table, tableIndex) => normalizeTable(table, tableIndex))
    : [];

  return {
    id: String(sectionObj.id ?? createSectionId("section", index)),
    title: String(sectionObj.title ?? `Section ${index + 1}`).trim(),
    level: Number.isFinite(sectionObj.level) ? Number(sectionObj.level) : 1,
    paragraphs,
    lists,
    tables,
    children
  };
}

function extractJsonObject(text: string): string | null {
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || first >= last) {
    return null;
  }
  return text.slice(first, last + 1);
}

function extractTextFromClaudeResponse(message: unknown): string {
  const response = message as { content?: Array<{ type?: string; text?: string }> };
  if (!Array.isArray(response.content)) {
    return "";
  }

  return response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("\n")
    .trim();
}

function isLikelyHeading(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) {
    return false;
  }

  if (/^(#{1,6})\s+/.test(trimmed)) {
    return true;
  }

  if (/^\d+(\.\d+){0,3}\s+/.test(trimmed)) {
    return true;
  }

  const words = trimmed.split(/\s+/);
  if (words.length > 10 || words.length < 2) {
    return false;
  }

  const uppercaseRatio = trimmed.replace(/[^A-Z]/g, "").length / Math.max(trimmed.replace(/\s+/g, "").length, 1);
  return uppercaseRatio > 0.55;
}

function inferHeadingLevel(line: string): number {
  const markdownMatch = line.match(/^(#{1,6})\s+/);
  if (markdownMatch) {
    return markdownMatch[1].length;
  }

  const numericMatch = line.match(/^(\d+(?:\.\d+)*)\s+/);
  if (numericMatch) {
    return Math.min(numericMatch[1].split(".").length, 6);
  }

  return 1;
}

function parseInlineTable(lines: string[], startIndex: number): { table: PdfTable | null; consumed: number } {
  const rows: string[][] = [];
  let cursor = startIndex;

  while (cursor < lines.length) {
    const line = lines[cursor].trim();
    if (!line.includes("|")) {
      break;
    }

    const cells = line
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean);

    if (cells.length < 2) {
      break;
    }

    rows.push(cells);
    cursor += 1;
  }

  if (rows.length < 2) {
    return { table: null, consumed: 0 };
  }

  const [headers, ...bodyRows] = rows;
  const table: PdfTable = {
    id: `table-${startIndex + 1}`,
    title: "Detected Table",
    headers,
    rows: bodyRows
  };

  return {
    table,
    consumed: cursor - startIndex
  };
}

function fallbackExtraction(rawText: string, source: string, pageCount: number): ClaudeExtractionOutput {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const rootSections: PdfSection[] = [];
  const stack: PdfSection[] = [];
  const fallbackWarnings: string[] = [];
  let paragraphBuffer: string[] = [];
  let currentSection: PdfSection | null = null;
  let unnamedCounter = 0;

  const flushParagraphs = (): void => {
    if (!paragraphBuffer.length) {
      return;
    }

    if (!currentSection) {
      unnamedCounter += 1;
      currentSection = {
        id: `section-body-${unnamedCounter}`,
        title: "Document Body",
        level: 1,
        paragraphs: [],
        lists: [],
        tables: [],
        children: []
      };
      rootSections.push(currentSection);
      stack.length = 0;
      stack.push(currentSection);
    }

    currentSection.paragraphs.push(clampParagraph(paragraphBuffer.join(" ")));
    paragraphBuffer = [];
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    const tableResult = parseInlineTable(lines, i);
    if (tableResult.table && tableResult.consumed > 0) {
      flushParagraphs();
      if (!currentSection) {
        currentSection = {
          id: "section-body",
          title: "Document Body",
          level: 1,
          paragraphs: [],
          lists: [],
          tables: [],
          children: []
        };
        rootSections.push(currentSection);
        stack.length = 0;
        stack.push(currentSection);
      }
      currentSection.tables.push(tableResult.table);
      i += tableResult.consumed - 1;
      continue;
    }

    if (isLikelyHeading(line)) {
      flushParagraphs();
      const level = inferHeadingLevel(line);
      const section: PdfSection = {
        id: createSectionId("section", rootSections.length + stack.length),
        title: line.replace(/^(#{1,6})\s+/, "").trim(),
        level,
        paragraphs: [],
        lists: [],
        tables: [],
        children: []
      };

      while (stack.length && stack[stack.length - 1].level >= level) {
        stack.pop();
      }

      if (!stack.length) {
        rootSections.push(section);
      } else {
        stack[stack.length - 1].children.push(section);
      }

      stack.push(section);
      currentSection = section;
      continue;
    }

    const bulletMatch = line.match(/^([\-\*\u2022]|\d+\.)\s+(.+)/);
    if (bulletMatch) {
      flushParagraphs();
      if (!currentSection) {
        currentSection = {
          id: "section-body",
          title: "Document Body",
          level: 1,
          paragraphs: [],
          lists: [],
          tables: [],
          children: []
        };
        rootSections.push(currentSection);
      }
      currentSection.lists.push({
        ordered: /^\d+\./.test(bulletMatch[1]),
        items: [bulletMatch[2].trim()]
      });
      continue;
    }

    paragraphBuffer.push(line);
  }

  flushParagraphs();

  if (!rootSections.length) {
    fallbackWarnings.push("No section headings were detected. Output is grouped into a single body section.");
  }

  const allTables: PdfTable[] = [];
  const walkTables = (sections: PdfSection[]): void => {
    for (const section of sections) {
      allTables.push(...section.tables);
      walkTables(section.children);
    }
  };
  walkTables(rootSections);

  return {
    documentTitle: source,
    sections: rootSections,
    tables: allTables,
    warnings: fallbackWarnings,
    modelName: "heuristic-parser",
    usedVision: false,
    fallback: true
  };
}

function normalizeClaudePayload(payload: PartialStructuredResponse): {
  documentTitle: string;
  sections: PdfSection[];
  tables: PdfTable[];
  warnings: string[];
} {
  const sections = Array.isArray(payload.sections)
    ? payload.sections.map((section, index) => normalizeSection(section, index))
    : [];
  const tables = Array.isArray(payload.tables)
    ? payload.tables.map((table, index) => normalizeTable(table, index))
    : [];
  const warnings = Array.isArray(payload.warnings)
    ? payload.warnings.map((warning) => clampParagraph(String(warning))).filter(Boolean)
    : [];

  return {
    documentTitle: String(payload.documentTitle ?? "Untitled PDF").trim() || "Untitled PDF",
    sections,
    tables,
    warnings
  };
}

export async function extractStructuredWithClaude({
  pdfBuffer,
  rawText,
  source,
  pageCount
}: ClaudeExtractionInput): Promise<ClaudeExtractionOutput> {
  if (!process.env.ANTHROPIC_API_KEY) {
    const fallback = fallbackExtraction(rawText, source, pageCount);
    fallback.warnings.unshift("ANTHROPIC_API_KEY is not configured, so a heuristic parser was used.");
    return fallback;
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = [
    "Extract this PDF into strict JSON.",
    "Return only JSON. Do not include markdown fences or explanatory text.",
    "Schema:",
    "{",
    '  "documentTitle": "string",',
    '  "sections": [',
    "    {",
    '      "id": "string",',
    '      "title": "string",',
    '      "level": 1,',
    '      "paragraphs": ["..."],',
    '      "lists": [{"ordered": false, "items": ["..."]}],',
    '      "tables": [{"id": "table-1", "title": "string", "headers": ["..."], "rows": [["..."]]}],',
    '      "children": []',
    "    }",
    "  ],",
    '  "tables": [{"id": "table-1", "title": "string", "headers": ["..."], "rows": [["..."]]}],',
    '  "warnings": ["..."]',
    "}",
    "Rules:",
    "- Preserve heading hierarchy in sections/children.",
    "- Keep paragraphs concise but faithful.",
    "- Preserve table headers and rows as arrays.",
    "- Keep list order and bullet semantics.",
    "- If OCR is uncertain, include a warning.",
    `Known page count: ${pageCount}.`,
    `Source label: ${source}.`
  ].join("\n");

  try {
    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 8192,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: pdfBuffer.toString("base64")
              }
            },
            {
              type: "text",
              text: prompt
            },
            {
              type: "text",
              text: `Raw text extracted with pdf-parse (truncated to ${MAX_RAW_TEXT_CHARS} chars):\n${rawText.slice(0, MAX_RAW_TEXT_CHARS)}`
            }
          ]
        }
      ]
    } as never);

    const rawOutput = extractTextFromClaudeResponse(response);
    const jsonText = extractJsonObject(rawOutput);

    if (!jsonText) {
      const fallback = fallbackExtraction(rawText, source, pageCount);
      fallback.warnings.unshift("Claude response did not contain valid JSON, so a heuristic parser was used.");
      return fallback;
    }

    const parsed = JSON.parse(jsonText) as PartialStructuredResponse;
    const normalized = normalizeClaudePayload(parsed);

    if (!normalized.sections.length && !normalized.tables.length) {
      const fallback = fallbackExtraction(rawText, source, pageCount);
      fallback.warnings.unshift("Claude returned empty content, so a heuristic parser was used.");
      return fallback;
    }

    return {
      ...normalized,
      modelName: DEFAULT_MODEL,
      usedVision: true,
      fallback: false
    };
  } catch (error) {
    const fallback = fallbackExtraction(rawText, source, pageCount);
    fallback.warnings.unshift(
      `Claude extraction failed (${error instanceof Error ? error.message : "unknown error"}), so a heuristic parser was used.`
    );
    return fallback;
  }
}
