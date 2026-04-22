import { NextResponse } from "next/server";
import { requestHasAccess } from "@/lib/lemonsqueezy";
import { deleteUploadedPdf, fetchPdfFromUrl, loadUploadedPdf, processPdfBuffer } from "@/lib/pdf-processor";

export const runtime = "nodejs";
export const maxDuration = 300;

interface ProcessRequest {
  uploadId?: string;
  sourceName?: string;
  url?: string;
}

export async function POST(request: Request) {
  let uploadIdToCleanup: string | null = null;

  try {
    if (!requestHasAccess(request.headers.get("cookie"))) {
      return NextResponse.json(
        {
          error: "Payment required. Complete checkout first, then unlock with your purchase email."
        },
        { status: 402 }
      );
    }

    const body = (await request.json()) as ProcessRequest;
    if (!body.uploadId && !body.url) {
      return NextResponse.json({ error: "Provide either uploadId or url." }, { status: 400 });
    }

    const loaded = body.uploadId
      ? await loadUploadedPdf(body.uploadId, body.sourceName)
      : await fetchPdfFromUrl(body.url ?? "");
    uploadIdToCleanup = body.uploadId ?? null;

    const structured = await processPdfBuffer(loaded.buffer, loaded.sourceName);
    return NextResponse.json({ data: structured });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Processing failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    if (uploadIdToCleanup) {
      try {
        await deleteUploadedPdf(uploadIdToCleanup);
      } catch {
        // File may already be removed; this should not fail the request.
      }
    }
  }
}
