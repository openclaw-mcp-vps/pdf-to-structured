import pdfParse from "pdf-parse";
import { extractStructureFromPageImage, isClaudeConfigured, VisionPageResult } from "@/lib/claude-client";

export interface ExtractedTable {
  page: number;
  caption?: string;
  headers: string[];
  rows: string[][];
}

export interface DocumentSection {
  id: string;
  level: number;
  title: string;
  paragraphs: string[];
  lists: string[][];
  children: DocumentSection[];
}

export interface StructuredPdfResult {
  metadata: {
    source: string;
    pageCount: number;
    extractionMode: "native-text" | "vision-fallback";
    extractedAt: string;
    estimatedCostUsd: number;
  };
  sections: DocumentSection[];
  tables: ExtractedTable[];
  orphanParagraphs: string[];
  notes: string[];
}

interface ParsedTextOutput {
  sections: DocumentSection[];
  tables: ExtractedTable[];
  orphanParagraphs: string[];
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 48);
}

function guessHeadingLevel(line: string) {
  const numbered = line.match(/^(\d+(?:\.\d+)*)\s+/);
  if (numbered?.[1]) {
    return Math.min(numbered[1].split(".").length, 4);
  }

  if (line === line.toUpperCase() && line.length <= 80) {
    return 1;
  }

  if (/^[A-Z][A-Za-z0-9\s,:-]{3,80}$/.test(line) && !line.endsWith(".")) {
    return 2;
  }

  return 0;
}

function splitColumns(line: string) {
  if (line.includes("|")) {
    return line
      .split("|")
      .map((part) => part.trim())
      .filter(Boolean);
  }

  const tabSplit = line.split(/\t+/).map((part) => part.trim()).filter(Boolean);
  if (tabSplit.length >= 2) {
    return tabSplit;
  }

  const spaced = line.split(/\s{3,}/).map((part) => part.trim()).filter(Boolean);
  if (spaced.length >= 2) {
    return spaced;
  }

  return [];
}

function parseTextStructure(rawText: string): ParsedTextOutput {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line, index, arr) => !(line === "" && arr[index - 1] === ""));

  const root: DocumentSection = {
    id: "root",
    level: 0,
    title: "Document",
    paragraphs: [],
    lists: [],
    children: []
  };

  const stack: DocumentSection[] = [root];
  const tables: ExtractedTable[] = [];
  const orphanParagraphs: string[] = [];

  let paragraphBuffer: string[] = [];
  let listBuffer: string[] = [];
  let pendingTableRows: string[][] = [];

  const flushParagraph = () => {
    if (!paragraphBuffer.length) {
      return;
    }

    const text = paragraphBuffer.join(" ").replace(/\s+/g, " ").trim();
    paragraphBuffer = [];
    if (!text) {
      return;
    }

    if (stack.length <= 1) {
      orphanParagraphs.push(text);
    } else {
      stack[stack.length - 1].paragraphs.push(text);
    }
  };

  const flushList = () => {
    if (!listBuffer.length) {
      return;
    }

    const section = stack[stack.length - 1];
    section.lists.push([...listBuffer]);
    listBuffer = [];
  };

  const flushTable = () => {
    if (pendingTableRows.length < 2) {
      pendingTableRows = [];
      return;
    }

    const [headers, ...rows] = pendingTableRows;
    tables.push({
      page: 1,
      headers,
      rows
    });

    pendingTableRows = [];
  };

  for (const line of lines) {
    if (!line) {
      flushParagraph();
      flushList();
      flushTable();
      continue;
    }

    const cols = splitColumns(line);
    if (cols.length >= 2) {
      flushParagraph();
      flushList();
      pendingTableRows.push(cols);
      continue;
    }

    flushTable();

    const headingLevel = guessHeadingLevel(line);
    if (headingLevel > 0) {
      flushParagraph();
      flushList();

      while (stack.length > headingLevel) {
        stack.pop();
      }

      const parent = stack[stack.length - 1] ?? root;
      const section: DocumentSection = {
        id: `${slugify(line)}-${parent.children.length + 1}`,
        level: headingLevel,
        title: line,
        paragraphs: [],
        lists: [],
        children: []
      };
      parent.children.push(section);
      stack.push(section);
      continue;
    }

    const listMatch = line.match(/^([-*\u2022]|\d+[.)])\s+(.+)$/);
    if (listMatch?.[2]) {
      flushParagraph();
      listBuffer.push(listMatch[2].trim());
      continue;
    }

    flushList();
    paragraphBuffer.push(line);
  }

  flushParagraph();
  flushList();
  flushTable();

  return {
    sections: root.children,
    tables,
    orphanParagraphs
  };
}

function mergeVisionIntoSections(baseSections: DocumentSection[], pages: VisionPageResult[]) {
  if (!pages.length) {
    return baseSections;
  }

  const merged = [...baseSections];

  for (const page of pages) {
    for (const [index, visionSection] of page.sections.entries()) {
      merged.push({
        id: `vision-page-${page.page}-section-${index + 1}`,
        level: Math.min(Math.max(visionSection.level || 1, 1), 4),
        title: visionSection.title || `Page ${page.page} Section ${index + 1}`,
        paragraphs: visionSection.paragraphs ?? [],
        lists: visionSection.listItems?.length ? [visionSection.listItems] : [],
        children: []
      });
    }
  }

  return merged;
}

function mergeVisionTables(baseTables: ExtractedTable[], pages: VisionPageResult[]) {
  const extraTables = pages.flatMap((page) =>
    page.tables.map((table) => ({
      page: page.page,
      caption: table.caption,
      headers: table.headers ?? [],
      rows: table.rows ?? []
    }))
  );

  return [...baseTables, ...extraTables];
}

async function extractVisionPages(pdfBuffer: Buffer, numPages: number) {
  const { fromBuffer } = await import("pdf2pic");

  const converter = fromBuffer(pdfBuffer, {
    density: 180,
    format: "png",
    width: 1400,
    height: 1800
  });

  const pages: VisionPageResult[] = [];

  for (let page = 1; page <= numPages; page += 1) {
    const image = (await converter(page, { responseType: "base64" })) as {
      base64?: string;
    };

    if (!image.base64) {
      continue;
    }

    const cleaned = image.base64.includes(",") ? image.base64.split(",")[1] : image.base64;
    const extraction = await extractStructureFromPageImage({
      page,
      base64Image: cleaned,
      mediaType: "image/png"
    });
    pages.push(extraction);
  }

  return pages;
}

export async function processPdfBuffer(pdfBuffer: Buffer, source: string): Promise<StructuredPdfResult> {
  const parsed = await pdfParse(pdfBuffer);
  const pageCount = Math.max(1, parsed.numpages || 1);
  const text = parsed.text?.trim() ?? "";
  const textSignal = text.replace(/\s+/g, "").length;

  const parsedText = parseTextStructure(text);

  let notes: string[] = [];
  let extractionMode: StructuredPdfResult["metadata"]["extractionMode"] = "native-text";
  let sections = parsedText.sections;
  let tables = parsedText.tables;

  if (textSignal < pageCount * 120) {
    extractionMode = "vision-fallback";
    if (isClaudeConfigured()) {
      try {
        const visionPages = await extractVisionPages(pdfBuffer, pageCount);
        sections = mergeVisionIntoSections(sections, visionPages);
        tables = mergeVisionTables(tables, visionPages);
        notes = visionPages.flatMap((page) => page.notes ?? []).filter(Boolean);
      } catch (error) {
        notes.push(`Vision fallback failed: ${String(error)}`);
      }
    } else {
      notes.push("Vision fallback skipped because ANTHROPIC_API_KEY is not configured.");
    }
  }

  if (sections.length === 0 && parsedText.orphanParagraphs.length > 0) {
    sections = [
      {
        id: "body-1",
        level: 1,
        title: "Document Body",
        paragraphs: parsedText.orphanParagraphs,
        lists: [],
        children: []
      }
    ];
  }

  return {
    metadata: {
      source,
      pageCount,
      extractionMode,
      extractedAt: new Date().toISOString(),
      estimatedCostUsd: Number((pageCount * 0.05).toFixed(2))
    },
    sections,
    tables,
    orphanParagraphs: parsedText.orphanParagraphs,
    notes
  };
}
