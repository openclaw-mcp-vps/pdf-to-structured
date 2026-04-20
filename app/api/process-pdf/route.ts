import { NextRequest, NextResponse } from "next/server";
import { consumePages, getAccessRecord } from "@/lib/database";
import { processPdfBuffer } from "@/lib/pdf-processor";

export const runtime = "nodejs";

type InputPayload = {
  url?: string;
};

async function fetchPdfFromUrl(url: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("URL is invalid.");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only HTTP and HTTPS URLs are supported.");
  }

  const response = await fetch(parsed.toString());
  if (!response.ok) {
    throw new Error(`Could not download PDF. Received HTTP ${response.status}.`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("pdf") && !parsed.pathname.toLowerCase().endsWith(".pdf")) {
    throw new Error("URL does not appear to point to a PDF file.");
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function readRequestData(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const url = form.get("url")?.toString().trim();
    const file = form.get("file");

    if (file instanceof File && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      return {
        buffer,
        source: file.name || "uploaded-file.pdf"
      };
    }

    if (url) {
      const buffer = await fetchPdfFromUrl(url);
      return {
        buffer,
        source: url
      };
    }

    throw new Error("Provide a PDF file upload or URL.");
  }

  const body = (await request.json().catch(() => ({}))) as InputPayload;
  if (body.url) {
    const buffer = await fetchPdfFromUrl(body.url);
    return {
      buffer,
      source: body.url
    };
  }

  throw new Error("Request must include multipart form data or JSON with a PDF URL.");
}

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get("pdf_access_token")?.value;
  const accessRecord = await getAccessRecord(accessToken);

  if (!accessRecord || accessRecord.status !== "paid") {
    return NextResponse.json(
      {
        error: "Payment required. Complete checkout first to unlock PDF processing."
      },
      { status: 402 }
    );
  }

  if (accessRecord.pagesUsed >= accessRecord.pagesPurchased) {
    return NextResponse.json(
      {
        error: "No pages remaining. Purchase more pages to continue.",
        pagesRemaining: 0
      },
      { status: 402 }
    );
  }

  try {
    const { buffer, source } = await readRequestData(request);

    if (buffer.length > 24 * 1024 * 1024) {
      return NextResponse.json(
        {
          error: "PDF is too large. Maximum size is 24MB."
        },
        { status: 413 }
      );
    }

    const result = await processPdfBuffer(buffer, source);
    const consumption = await consumePages(accessToken!, result.metadata.pageCount);

    if (!consumption.ok) {
      return NextResponse.json(
        {
          error: "Not enough pages remaining for this file.",
          pagesRequired: result.metadata.pageCount,
          pagesRemaining: consumption.remaining
        },
        { status: 402 }
      );
    }

    return NextResponse.json({
      ...result,
      billing: {
        pagesCharged: result.metadata.pageCount,
        rateUsdPerPage: 0.05,
        chargeUsd: result.metadata.estimatedCostUsd,
        pagesRemaining: consumption.remaining
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "PDF processing failed"
      },
      { status: 400 }
    );
  }
}
