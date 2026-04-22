import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import { mkdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import pdf from "pdf-parse";
import { fromPath } from "pdf2pic";
import { ensureUploadDirectory } from "@/lib/database";
import { extractStructuredWithClaude, type StructuredDocument, type JsonSection, type JsonTable } from "@/lib/claude-client";

const MAX_VISION_PAGES = 8;
const PRICE_PER_PAGE_USD = 0.05;

export interface UploadReceipt {
  uploadId: string;
  fileName: string;
  pageCount: number;
  bytes: number;
}

interface LoadedPdf {
  buffer: Buffer;
  sourceName: string;
}

function safeUploadPath(uploadId: string): string {
  if (!/^[a-f0-9-]{20,80}$/i.test(uploadId)) {
    throw new Error("Invalid upload identifier.");
  }

  return path.join(process.cwd(), ".uploads", `${uploadId}.pdf`);
}

function isLikelyHeading(line: string): boolean {
  if (line.length > 120) {
    return false;
  }

  if (/^\d+(\.\d+)*\s+/.test(line)) {
    return true;
  }

  const uppercaseRatio = line.replace(/[^A-Z]/g, "").length / Math.max(line.length, 1);
  if (uppercaseRatio > 0.65 && line.length >= 4) {
    return true;
  }

  return /^([A-Z][A-Za-z0-9]+(\s+[A-Z][A-Za-z0-9]+){0,8})$/.test(line);
}

function headingLevel(line: string): number {
  const matched = line.match(/^(\d+(?:\.\d+)*)\s+/);
  if (!matched) {
    return 1;
  }

  return Math.min(4, matched[1].split(".").length);
}

function parsePipeTable(line: string): string[] | null {
  if (!line.includes("|")) {
    return null;
  }

  const cells = line
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);

  return cells.length >= 2 ? cells : null;
}

function buildFallbackStructure(text: string, sourceName: string, pageCount: number, scanned: boolean): StructuredDocument {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const topSections: JsonSection[] = [];
  const sectionStack: JsonSection[] = [];
  const globalTables: JsonTable[] = [];
  let sectionCounter = 0;
  let tableCounter = 0;

  function createSection(heading: string, level: number): JsonSection {
    sectionCounter += 1;
    return {
      id: `sec-${sectionCounter}`,
      heading,
      level,
      paragraphs: [],
      lists: [],
      tables: [],
      children: []
    };
  }

  let currentSection = createSection("Document Overview", 1);
  topSections.push(currentSection);
  sectionStack.push(currentSection);

  let activeTable: JsonTable | null = null;

  for (const line of lines) {
    const maybeTableRow = parsePipeTable(line);
    if (maybeTableRow) {
      if (!activeTable) {
        tableCounter += 1;
        activeTable = {
          id: `tbl-${tableCounter}`,
          title: `Table ${tableCounter}`,
          columns: maybeTableRow,
          rows: [],
          sourceSectionId: currentSection.id
        };
        currentSection.tables.push(activeTable);
        globalTables.push(activeTable);
      } else {
        activeTable.rows.push(maybeTableRow);
      }
      continue;
    }

    activeTable = null;

    if (isLikelyHeading(line)) {
      const level = headingLevel(line);
      const newSection = createSection(line.replace(/^\d+(\.\d+)*\s+/, ""), level);

      while (sectionStack.length > 0 && sectionStack[sectionStack.length - 1].level >= level) {
        sectionStack.pop();
      }

      const parent = sectionStack[sectionStack.length - 1];
      if (parent) {
        parent.children.push(newSection);
      } else {
        topSections.push(newSection);
      }

      sectionStack.push(newSection);
      currentSection = newSection;
      continue;
    }

    const listMatch = line.match(/^([-*•]|\d+[.)])\s+(.+)/);
    if (listMatch) {
      const ordered = /^\d/.test(listMatch[1]);
      const lastList = currentSection.lists[currentSection.lists.length - 1];
      if (lastList && lastList.ordered === ordered) {
        lastList.items.push(listMatch[2]);
      } else {
        currentSection.lists.push({
          ordered,
          items: [listMatch[2]]
        });
      }
      continue;
    }

    currentSection.paragraphs.push(line);
  }

  const firstParagraph =
    topSections
      .flatMap((section) => [section.paragraphs[0], ...section.children.flatMap((child) => child.paragraphs)])
      .find((line) => typeof line === "string" && line.length > 20) ?? "Document parsed with fallback extraction.";

  return {
    document: {
      title: sourceName,
      sourceName,
      pageCount,
      detectedLanguage: "unknown",
      summary: firstParagraph,
      sections: topSections,
      tables: globalTables,
      metadata: {
        extractedAt: new Date().toISOString(),
        model: "fallback-parser",
        scanned,
        fallbackUsed: true,
        textCharacters: text.length,
        inputImageCount: 0
      }
    }
  };
}

async function renderPdfPagesForVision(buffer: Buffer, pageCount: number): Promise<string[]> {
  const targetPages = Math.min(pageCount, MAX_VISION_PAGES);
  if (targetPages <= 0) {
    return [];
  }

  const tempRoot = path.join(os.tmpdir(), "pdf-to-structured");
  await mkdir(tempRoot, { recursive: true });
  const tempDir = path.join(tempRoot, crypto.randomUUID());
  await mkdir(tempDir, { recursive: true });
  const sourcePath = path.join(tempDir, "source.pdf");

  try {
    await writeFile(sourcePath, buffer);
    const converter = fromPath(sourcePath, {
      density: 180,
      saveFilename: "page",
      savePath: tempDir,
      format: "png",
      width: 1240,
      height: 1754
    });

    const images: string[] = [];
    for (let pageNumber = 1; pageNumber <= targetPages; pageNumber += 1) {
      const rendered = (await converter(pageNumber, { responseType: "base64" })) as { base64?: string } | undefined;
      if (rendered?.base64) {
        images.push(rendered.base64);
      }
    }

    return images;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function calculatePriceEstimate(pageCount: number): number {
  return Number((pageCount * PRICE_PER_PAGE_USD).toFixed(2));
}

export async function storeUploadedPdf(file: File): Promise<UploadReceipt> {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Only PDF files are supported.");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const parsed = await pdf(bytes);
  const pageCount = parsed.numpages ?? 1;

  const uploadDirectory = await ensureUploadDirectory();
  const uploadId = crypto.randomUUID();
  const targetPath = path.join(uploadDirectory, `${uploadId}.pdf`);
  await writeFile(targetPath, bytes);

  return {
    uploadId,
    fileName: file.name,
    pageCount,
    bytes: file.size
  };
}

export async function loadUploadedPdf(uploadId: string, sourceName?: string): Promise<LoadedPdf> {
  const targetPath = safeUploadPath(uploadId);
  const buffer = await readFile(targetPath);
  return {
    buffer,
    sourceName: sourceName?.trim() || `${uploadId}.pdf`
  };
}

export async function fetchPdfFromUrl(url: string): Promise<LoadedPdf> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("Invalid URL.");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Only HTTP/HTTPS URLs are supported.");
  }

  const response = await fetch(parsedUrl.toString(), {
    method: "GET",
    redirect: "follow"
  });

  if (!response.ok) {
    throw new Error(`Failed to download PDF. Upstream responded with ${response.status}.`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("pdf") && !parsedUrl.pathname.toLowerCase().endsWith(".pdf")) {
    throw new Error("URL does not appear to point to a PDF.");
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  const fileName = parsedUrl.pathname.split("/").pop() || "document.pdf";
  return {
    buffer: bytes,
    sourceName: fileName
  };
}

export interface ProcessedPdfResult extends StructuredDocument {
  pricing: {
    pageCount: number;
    estimatedCostUsd: number;
  };
}

export async function processPdfBuffer(buffer: Buffer, sourceName: string): Promise<ProcessedPdfResult> {
  const parsed = await pdf(buffer);
  const pageCount = parsed.numpages ?? 1;
  const rawText = (parsed.text ?? "").trim();
  const cleanedText = rawText.replace(/\n{3,}/g, "\n\n");
  const charactersPerPage = cleanedText.length / Math.max(pageCount, 1);
  const scanned = charactersPerPage < 120;

  let structured: StructuredDocument;
  try {
    const images = scanned ? await renderPdfPagesForVision(buffer, pageCount) : [];
    structured = await extractStructuredWithClaude({
      sourceName,
      pageCount,
      plainText: cleanedText,
      scanned,
      pageImages: images
    });
  } catch {
    structured = buildFallbackStructure(cleanedText, sourceName, pageCount, scanned);
  }

  structured.document.metadata = {
    ...structured.document.metadata,
    extractedAt: new Date().toISOString(),
    textCharacters: cleanedText.length
  };

  return {
    ...structured,
    pricing: {
      pageCount,
      estimatedCostUsd: calculatePriceEstimate(pageCount)
    },
    document: {
      ...structured.document,
      summary: structured.document.summary || "Extraction complete.",
      metadata: {
        ...structured.document.metadata,
        model: structured.document.metadata.model,
        scanned,
        fallbackUsed: structured.document.metadata.fallbackUsed,
        textCharacters: cleanedText.length,
        inputImageCount: structured.document.metadata.inputImageCount
      }
    }
  };
}

export async function deleteUploadedPdf(uploadId: string): Promise<void> {
  const targetPath = safeUploadPath(uploadId);
  await unlink(targetPath);
}
