import { NextResponse } from "next/server";
import { requestHasAccess } from "@/lib/lemonsqueezy";
import { storeUploadedPdf } from "@/lib/pdf-processor";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!requestHasAccess(request.headers.get("cookie"))) {
      return NextResponse.json(
        {
          error: "Payment required. Complete checkout first, then unlock with your purchase email."
        },
        { status: 402 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing PDF file in form data." }, { status: 400 });
    }

    const upload = await storeUploadedPdf(file);
    return NextResponse.json(upload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

