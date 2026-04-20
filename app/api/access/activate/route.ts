import { NextRequest, NextResponse } from "next/server";
import { getAccessRecord } from "@/lib/database";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => ({}))) as { token?: string };
  const token = payload.token;

  if (!token) {
    return NextResponse.json({ error: "Missing access token" }, { status: 400 });
  }

  const record = await getAccessRecord(token);
  if (!record || record.status !== "paid") {
    return NextResponse.json(
      {
        error: "Payment not confirmed yet. Refresh in a few seconds after checkout completes."
      },
      { status: 409 }
    );
  }

  const response = NextResponse.json({
    success: true,
    plan: record.plan,
    remainingPages: record.pagesPurchased - record.pagesUsed
  });

  response.cookies.set({
    name: "pdf_access_token",
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });

  return response;
}
