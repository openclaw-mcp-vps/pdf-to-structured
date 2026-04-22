import { NextResponse } from "next/server";
import { findPurchaseByEmail } from "@/lib/database";
import { ACCESS_COOKIE_NAME, createAccessToken, normalizeEmail } from "@/lib/lemonsqueezy";

export const runtime = "nodejs";

interface UnlockRequest {
  email?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as UnlockRequest;
    if (!body.email) {
      return NextResponse.json({ error: "Email is required to unlock access." }, { status: 400 });
    }

    const email = normalizeEmail(body.email);
    const purchase = await findPurchaseByEmail(email);

    if (!purchase) {
      return NextResponse.json(
        {
          error:
            "No paid checkout found for that email yet. If you paid just now, webhook delivery can take a minute."
        },
        { status: 404 }
      );
    }

    const token = createAccessToken(email);
    const response = NextResponse.json({
      ok: true,
      email,
      mode: purchase.mode
    });

    response.cookies.set({
      name: ACCESS_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unlock failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

