import { NextResponse } from "next/server";

import { createToolAccessToken, isSessionPaid, TOOL_ACCESS_COOKIE } from "@/lib/lemonsqueezy";

export const runtime = "nodejs";

type UnlockRequest = {
  sessionId?: string;
};

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json().catch(() => ({}))) as UnlockRequest;
  const sessionId = body.sessionId?.trim();

  if (!sessionId) {
    return NextResponse.json({ error: "Missing Stripe session ID." }, { status: 400 });
  }

  const paid = await isSessionPaid(sessionId);
  if (!paid) {
    return NextResponse.json(
      {
        error:
          "That session ID has not been confirmed yet. Wait for Stripe webhook delivery, then try again."
      },
      { status: 403 }
    );
  }

  const response = NextResponse.json({ success: true }, { status: 200 });
  response.cookies.set({
    name: TOOL_ACCESS_COOKIE,
    value: createToolAccessToken(sessionId),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/"
  });

  return response;
}
