import { NextResponse, type NextRequest } from "next/server";

import { isToolAccessGranted, TOOL_ACCESS_COOKIE } from "@/lib/lemonsqueezy";
import { fetchPdfBufferFromUrl, processPdfBuffer } from "@/lib/pdf-processor";

export const runtime = "nodejs";

function getFileName(fileName: string | undefined): string {
  if (!fileName) {
    return "uploaded.pdf";
  }
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
}

async function parseIncomingPdf(request: NextRequest): Promise<{ buffer: Buffer; source: string }> {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const fileEntry = formData.get("file");
    const urlEntry = String(formData.get("url") || "").trim();

    if (fileEntry instanceof File && fileEntry.size > 0) {
      if (fileEntry.type && !fileEntry.type.includes("pdf")) {
        throw new Error("Only PDF files are supported.");
      }

      const arrayBuffer = await fileEntry.arrayBuffer();
      return {
        buffer: Buffer.from(arrayBuffer),
        source: getFileName(fileEntry.name)
      };
    }

    if (urlEntry) {
      return fetchPdfBufferFromUrl(urlEntry);
    }

    throw new Error("Please upload a PDF file or provide a PDF URL.");
  }

  const body = (await request.json()) as { url?: string };
  const url = body?.url?.trim();
  if (!url) {
    throw new Error("Missing PDF URL.");
  }

  return fetchPdfBufferFromUrl(url);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const accessToken = request.cookies.get(TOOL_ACCESS_COOKIE)?.value;
  const hasAccess = await isToolAccessGranted(accessToken);

  if (!hasAccess) {
    return NextResponse.json(
      {
        error: "Purchase required. Complete checkout, then unlock the tool with your Stripe session ID."
      },
      { status: 402 }
    );
  }

  try {
    const { buffer, source } = await parseIncomingPdf(request);
    const result = await processPdfBuffer({
      pdfBuffer: buffer,
      source
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "PDF processing failed."
      },
      { status: 400 }
    );
  }
}
