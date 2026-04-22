import pdfParse from "pdf-parse";

import {
  CLAUDE_MODEL_NAME,
  extractStructuredWithClaude
} from "@/lib/claude";
import type {
  PdfContentNode,
  PdfSection,
  PdfTable,
  ProcessedPdfResponse,
  StructuredPdfResult
} from "@/types/pdf-data";

const PRICE_PER_PAGE = 0.05;

function normalizeWhitespace(value: string): string {
  return value.replace(/[\t ]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function looksLikeHeading(line: string): boolean {
  const clean = line.trim();
  if (!clean || clean.length > 90) {
    return false;
  }

  if (/^\d+(\.\d+)*\s+/.test(clean)) {
    return true;
  }

  if (/^[A-Z0-9\s\-:]{4,}$/.test(clean) && /[A-Z]/.test(clean)) {
    return true;
  }

  return /^[A-Z][\w\s,&\-:]{2,}$/.test(clean) && !/[.!?]$/.test(clean);
}

function inferHeadingLevel(line: string): number {
  const numbered = line.match(/^(\d+(?:\.\d+)*)\s+/);
  if (!numbered) {
    return line.length < 32 ? 1 : 2;
  }
  return Math.min(numbered[1].split(".").length, 4);
}

function parseDelimitedTable(block: string): PdfTable | null {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const pipeLines = lines.filter((line) => line.includes("|"));
  if (pipeLines.length < 2) {
    return null;
  }

  const parsed = pipeLines
    .map((line) =>
      line
        .split("|")
        .map((cell) => cell.trim())
        .filter(Boolean)
    )
    .filter((row) => row.length > 1);

  if (parsed.length < 2) {
    return null;
  }

  const headers = parsed[0];
  const rows = parsed.slice(1).filter((row) => row.length === headers.length);

  if (!rows.length) {
    return null;
  }

  return {
    type: "table",
    headers,
    rows
  };
}

function parseList(block: string): PdfContentNode | null {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return null;
  }

  const ordered = lines.every((line) => /^\d+[.)]\s+/.test(line));
  const unordered = lines.every((line) => /^[-*•]\s+/.test(line));

  if (!ordered && !unordered) {
    return null;
  }

  const items = lines.map((line) => line.replace(/^([-*•]|\d+[.)])\s+/, "").trim());

  return {
    type: "list",
    ordered,
    items
  };
}

function fallbackStructureFromText(text: string): Pick<StructuredPdfResult, "sections" | "tables"> {
  const normalized = normalizeWhitespace(text);
  const blocks = normalized.split(/\n\n+/);

  const sections: PdfSection[] = [];
  const tables: PdfTable[] = [];

  let current: PdfSection = {
    type: "section",
    heading: "Document",
    level: 1,
    children: []
  };

  for (const block of blocks) {
    const firstLine = block.split("\n")[0]?.trim() ?? "";

    if (looksLikeHeading(firstLine)) {
      if (current.children.length > 0 || sections.length === 0) {
        sections.push(current);
      }
      current = {
        type: "section",
        heading: firstLine,
        level: inferHeadingLevel(firstLine),
        children: []
      };
      const remainder = block
        .split("\n")
        .slice(1)
        .join("\n")
        .trim();
      if (remainder) {
        current.children.push({ type: "paragraph", text: remainder });
      }
      continue;
    }

    const asTable = parseDelimitedTable(block);
    if (asTable) {
      current.children.push(asTable);
      tables.push(asTable);
      continue;
    }

    const asList = parseList(block);
    if (asList) {
      current.children.push(asList);
      continue;
    }

    current.children.push({ type: "paragraph", text: block });
  }

  if (current.children.length > 0) {
    sections.push(current);
  }

  if (!sections.length) {
    sections.push({
      type: "section",
      heading: "Document",
      level: 1,
      children: [{ type: "paragraph", text: normalized }]
    });
  }

  return { sections, tables };
}

export async function fetchPdfFromUrl(url: string): Promise<Buffer> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid URL. Please provide a full http(s) URL.");
  }

  if (!["https:", "http:"].includes(parsed.protocol)) {
    throw new Error("Only http and https URLs are supported.");
  }

  const response = await fetch(parsed, {
    headers: {
      "user-agent": "pdf-to-structured/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Could not fetch PDF URL. HTTP ${response.status}.`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (buffer.length === 0) {
    throw new Error("Fetched file is empty.");
  }

  if (buffer.length > 30 * 1024 * 1024) {
    throw new Error("PDF is too large. Maximum size is 30MB.");
  }

  return buffer;
}

export async function processPdfBuffer(params: {
  buffer: Buffer;
  sourceType: "upload" | "url";
  sourceName: string;
}): Promise<ProcessedPdfResponse> {
  const parsed = await pdfParse(params.buffer);
  const pageCount = Math.max(parsed.numpages || 1, 1);
  const fallback = fallbackStructureFromText(parsed.text || "");

  const claudeOutput = await extractStructuredWithClaude({
    pdfBase64: params.buffer.toString("base64"),
    sourceName: params.sourceName,
    fallbackText: parsed.text || ""
  }).catch(() => null);

  const structured = claudeOutput ?? fallback;

  const result: StructuredPdfResult = {
    metadata: {
      sourceType: params.sourceType,
      sourceName: params.sourceName,
      pageCount,
      model: claudeOutput ? CLAUDE_MODEL_NAME : "local-fallback-parser",
      generatedAt: new Date().toISOString()
    },
    sections: structured.sections,
    tables: structured.tables
  };

  return {
    result,
    pricing: {
      pricePerPage: PRICE_PER_PAGE,
      pages: pageCount,
      estimatedCost: Number((pageCount * PRICE_PER_PAGE).toFixed(2))
    }
  };
}
