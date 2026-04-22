import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  ACCESS_COOKIE_NAME,
  createAccessToken,
  hasPaidAccessCookie,
  isSessionPaid
} from "@/lib/lemonsqueezy";

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
  const hasAccess = await hasPaidAccessCookie(accessToken);

  return NextResponse.json({ hasAccess });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { sessionId?: string } | null;
  const sessionId = body?.sessionId?.trim();

  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId." }, { status: 400 });
  }

  const paid = await isSessionPaid(sessionId);
  if (!paid) {
    return NextResponse.json(
      { error: "Session is not marked as paid yet. Please wait a few seconds and retry." },
      { status: 403 }
    );
  }

  const token = createAccessToken(sessionId);
  const response = NextResponse.json({ hasAccess: true });
  response.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 60,
    path: "/"
  });

  return response;
}
