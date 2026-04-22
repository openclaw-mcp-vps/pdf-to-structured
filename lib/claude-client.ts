import Anthropic from "@anthropic-ai/sdk";

export interface JsonTable {
  id: string;
  title: string;
  columns: string[];
  rows: string[][];
  sourceSectionId: string | null;
}

export interface JsonList {
  ordered: boolean;
  items: string[];
}

export interface JsonSection {
  id: string;
  heading: string;
  level: number;
  paragraphs: string[];
  lists: JsonList[];
  tables: JsonTable[];
  children: JsonSection[];
}

export interface StructuredDocument {
  document: {
    title: string;
    sourceName: string;
    pageCount: number;
    detectedLanguage: string;
    summary: string;
    sections: JsonSection[];
    tables: JsonTable[];
    metadata: {
      extractedAt: string;
      model: string;
      scanned: boolean;
      fallbackUsed: boolean;
      textCharacters: number;
      inputImageCount: number;
    };
  };
}

interface ClaudeExtractionInput {
  sourceName: string;
  pageCount: number;
  plainText: string;
  scanned: boolean;
  pageImages?: string[];
}

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest";

function extractJsonObject(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first === -1 || last === -1 || first >= last) {
    throw new Error("Claude response did not include JSON.");
  }

  return raw.slice(first, last + 1);
}

function createPrompt(input: ClaudeExtractionInput): string {
  const textSample = input.plainText.slice(0, 120_000);

  return [
    "You are a document parser that outputs strict JSON only.",
    "Extract headings, paragraphs, lists, and tables from the provided PDF content.",
    "Return this schema exactly:",
    "{",
    '  "document": {',
    '    "title": "string",',
    `    "sourceName": "${input.sourceName}",`,
    `    "pageCount": ${input.pageCount},`,
    '    "detectedLanguage": "string",',
    '    "summary": "string",',
    '    "sections": [',
    "      {",
    '        "id": "sec-1",',
    '        "heading": "string",',
    '        "level": 1,',
    '        "paragraphs": ["string"],',
    '        "lists": [{"ordered": false, "items": ["string"]}],',
    '        "tables": [{"id":"tbl-1","title":"string","columns":["string"],"rows":[["string"]],"sourceSectionId":"sec-1"}],',
    '        "children": []',
    "      }",
    "    ],",
    '    "tables": [{"id":"tbl-1","title":"string","columns":["string"],"rows":[["string"]],"sourceSectionId":"sec-1"}],',
    '    "metadata": {',
    '      "extractedAt": "ISO-8601",',
    `      "model": "${DEFAULT_MODEL}",`,
    `      "scanned": ${input.scanned ? "true" : "false"},`,
    '      "fallbackUsed": false,',
    `      "textCharacters": ${input.plainText.length},`,
    `      "inputImageCount": ${input.pageImages?.length ?? 0}`,
    "    }",
    "  }",
    "}",
    "Rules:",
    "1. Keep heading hierarchy accurate (level 1/2/3...).",
    "2. Preserve table headers and rows exactly when possible.",
    "3. Keep list order and bullet semantics.",
    "4. Do not wrap output in markdown or commentary.",
    "",
    "Extract from this text:",
    textSample
  ].join("\n");
}

function sanitizeTable(value: unknown, index: number): JsonTable {
  const table = (value ?? {}) as Record<string, unknown>;
  const columns = Array.isArray(table.columns) ? table.columns.filter((cell): cell is string => typeof cell === "string") : [];
  const rows = Array.isArray(table.rows)
    ? table.rows.map((row) => {
        if (!Array.isArray(row)) {
          return [];
        }
        return row.filter((cell): cell is string => typeof cell === "string");
      })
    : [];

  return {
    id: typeof table.id === "string" ? table.id : `tbl-${index + 1}`,
    title: typeof table.title === "string" ? table.title : `Table ${index + 1}`,
    columns,
    rows,
    sourceSectionId: typeof table.sourceSectionId === "string" ? table.sourceSectionId : null
  };
}

function sanitizeSection(value: unknown, path: string): JsonSection {
  const section = (value ?? {}) as Record<string, unknown>;

  const rawChildren = Array.isArray(section.children) ? section.children : [];
  const rawLists = Array.isArray(section.lists) ? section.lists : [];
  const rawTables = Array.isArray(section.tables) ? section.tables : [];

  return {
    id: typeof section.id === "string" ? section.id : path,
    heading: typeof section.heading === "string" ? section.heading : "Untitled section",
    level: typeof section.level === "number" && Number.isFinite(section.level) ? section.level : 1,
    paragraphs: Array.isArray(section.paragraphs)
      ? section.paragraphs.filter((item): item is string => typeof item === "string")
      : [],
    lists: rawLists.map((list) => {
      const listObject = (list ?? {}) as Record<string, unknown>;
      return {
        ordered: Boolean(listObject.ordered),
        items: Array.isArray(listObject.items)
          ? listObject.items.filter((item): item is string => typeof item === "string")
          : []
      };
    }),
    tables: rawTables.map((table, index) => sanitizeTable(table, index)),
    children: rawChildren.map((child, childIndex) => sanitizeSection(child, `${path}.${childIndex + 1}`))
  };
}

function sanitizeResult(raw: unknown, input: ClaudeExtractionInput): StructuredDocument {
  const root = (raw ?? {}) as Record<string, unknown>;
  const maybeDocument = (root.document ?? root) as Record<string, unknown>;

  const sections = Array.isArray(maybeDocument.sections)
    ? maybeDocument.sections.map((section, index) => sanitizeSection(section, `sec-${index + 1}`))
    : [];
  const tables = Array.isArray(maybeDocument.tables)
    ? maybeDocument.tables.map((table, index) => sanitizeTable(table, index))
    : [];

  return {
    document: {
      title: typeof maybeDocument.title === "string" ? maybeDocument.title : input.sourceName,
      sourceName: typeof maybeDocument.sourceName === "string" ? maybeDocument.sourceName : input.sourceName,
      pageCount:
        typeof maybeDocument.pageCount === "number" && Number.isFinite(maybeDocument.pageCount)
          ? maybeDocument.pageCount
          : input.pageCount,
      detectedLanguage: typeof maybeDocument.detectedLanguage === "string" ? maybeDocument.detectedLanguage : "unknown",
      summary:
        typeof maybeDocument.summary === "string"
          ? maybeDocument.summary
          : "Structured extraction completed for document ingestion.",
      sections,
      tables,
      metadata: {
        extractedAt: new Date().toISOString(),
        model: DEFAULT_MODEL,
        scanned: input.scanned,
        fallbackUsed: false,
        textCharacters: input.plainText.length,
        inputImageCount: input.pageImages?.length ?? 0
      }
    }
  };
}

export async function extractStructuredWithClaude(input: ClaudeExtractionInput): Promise<StructuredDocument> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  const client = new Anthropic({ apiKey });
  const content: Array<Record<string, unknown>> = [
    {
      type: "text",
      text: createPrompt(input)
    }
  ];

  for (const image of input.pageImages ?? []) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: "image/png",
        data: image
      }
    });
  }

  const response = await client.messages.create(
    {
      model: DEFAULT_MODEL,
      max_tokens: 4096,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: content as never
        }
      ]
    } as never
  );

  const textOutput = response.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("\n")
    .trim();

  const json = extractJsonObject(textOutput);
  const parsed = JSON.parse(json) as unknown;
  return sanitizeResult(parsed, input);
}
