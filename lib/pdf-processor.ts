import { PDFParse } from "pdf-parse";

import { extractStructuredWithClaude } from "@/lib/claude";
import type { PdfStructuredResponse } from "@/types/pdf-response";

type ProcessPdfInput = {
  pdfBuffer: Buffer;
  source: string;
};

const MAX_PDF_BYTES = 25 * 1024 * 1024;
const PRICE_PER_PAGE_USD = 0.05;

function sanitizeSource(source: string): string {
  return source.replace(/\s+/g, " ").trim();
}

function clampPageCount(value: number): number {
  if (!Number.isFinite(value) || value < 1) {
    return 1;
  }
  return Math.max(1, Math.floor(value));
}

function sanitizeForResponse(result: PdfStructuredResponse): PdfStructuredResponse {
  return {
    ...result,
    source: sanitizeSource(result.source),
    pageCount: clampPageCount(result.pageCount),
    estimatedCostUsd: Number(result.estimatedCostUsd.toFixed(2)),
    warnings: result.warnings.map((warning) => warning.trim()).filter(Boolean)
  };
}

export function assertPdfSize(pdfBuffer: Buffer): void {
  if (pdfBuffer.byteLength > MAX_PDF_BYTES) {
    throw new Error("PDF is too large. The maximum supported size is 25MB per document.");
  }
}

export async function fetchPdfBufferFromUrl(url: string): Promise<{ buffer: Buffer; source: string }> {
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only HTTP(S) URLs are supported.");
  }

  const response = await fetch(parsed.toString(), {
    method: "GET",
    headers: {
      Accept: "application/pdf"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch PDF URL (${response.status}).`);
  }

  const contentLength = Number(response.headers.get("content-length") || "0");
  if (contentLength > MAX_PDF_BYTES) {
    throw new Error("The remote PDF is larger than 25MB.");
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("pdf") && !parsed.pathname.toLowerCase().endsWith(".pdf")) {
    throw new Error("The provided URL does not appear to be a PDF.");
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  assertPdfSize(buffer);

  return {
    buffer,
    source: parsed.toString()
  };
}

async function extractPdfTextAndPageCount(pdfBuffer: Buffer): Promise<{ text: string; pageCount: number }> {
  const parser = new PDFParse({ data: pdfBuffer });

  try {
    const textResult = await parser.getText();
    return {
      text: textResult.text?.trim() || "",
      pageCount: clampPageCount(textResult.total || textResult.pages?.length || 1)
    };
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

export async function processPdfBuffer({ pdfBuffer, source }: ProcessPdfInput): Promise<PdfStructuredResponse> {
  assertPdfSize(pdfBuffer);

  let extractedText = "";
  let pageCount = 1;

  try {
    const extracted = await extractPdfTextAndPageCount(pdfBuffer);
    extractedText = extracted.text;
    pageCount = extracted.pageCount;
  } catch (error) {
    extractedText = "";
    pageCount = 1;
    console.warn("pdf-parse failed, relying on Claude vision", error);
  }

  const structured = await extractStructuredWithClaude({
    pdfBuffer,
    rawText: extractedText,
    source,
    pageCount
  });

  const response: PdfStructuredResponse = {
    documentTitle: structured.documentTitle,
    source: sanitizeSource(source),
    pageCount,
    estimatedCostUsd: Number((pageCount * PRICE_PER_PAGE_USD).toFixed(2)),
    processedAt: new Date().toISOString(),
    sections: structured.sections,
    tables: structured.tables,
    warnings: structured.warnings,
    model: {
      provider: structured.fallback ? "local-heuristic" : "anthropic",
      name: structured.modelName,
      usedVision: structured.usedVision,
      fallback: structured.fallback
    }
  };

  return sanitizeForResponse(response);
}
