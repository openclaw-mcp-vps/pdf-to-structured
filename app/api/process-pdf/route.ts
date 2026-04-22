import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ACCESS_COOKIE_NAME, hasPaidAccessCookie } from "@/lib/lemonsqueezy";
import { fetchPdfFromUrl, processPdfBuffer } from "@/lib/pdf-processor";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
    const hasAccess = await hasPaidAccessCookie(accessToken);

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Purchase required before processing PDFs." },
        { status: 402 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const url = formData.get("url");

    let buffer: Buffer;
    let sourceType: "upload" | "url";
    let sourceName: string;

    if (file instanceof File) {
      if (file.size === 0) {
        return NextResponse.json({ error: "Uploaded file is empty." }, { status: 400 });
      }

      if (file.size > 30 * 1024 * 1024) {
        return NextResponse.json(
          { error: "File is too large. Maximum file size is 30MB." },
          { status: 400 }
        );
      }

      if (!file.type.includes("pdf") && !file.name.toLowerCase().endsWith(".pdf")) {
        return NextResponse.json(
          { error: "Only PDF uploads are supported." },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      sourceType = "upload";
      sourceName = file.name;
    } else if (typeof url === "string" && url.trim().length > 0) {
      buffer = await fetchPdfFromUrl(url.trim());
      sourceType = "url";
      sourceName = url.trim();
    } else {
      return NextResponse.json(
        { error: "Upload a PDF file or provide a PDF URL." },
        { status: 400 }
      );
    }

    const response = await processPdfBuffer({
      buffer,
      sourceType,
      sourceName
    });

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process PDF.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
