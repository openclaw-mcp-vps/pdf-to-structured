import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { processLemonWebhook, verifyLemonSignature } from "@/lib/lemonsqueezy";
import { saveWebhookReceipt } from "@/lib/database";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");

  const valid = verifyLemonSignature(rawBody, signature, process.env.LEMON_SQUEEZY_WEBHOOK_SECRET);
  if (!valid) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const typedPayload = payload as {
    meta?: { event_name?: string };
    data?: { id?: string };
  };

  const eventName = typedPayload.meta?.event_name ?? "unknown";
  const eventId = `${eventName}:${typedPayload.data?.id ?? crypto.randomUUID()}`;

  await saveWebhookReceipt(eventId, eventName);
  const outcome = await processLemonWebhook(payload as any);

  return NextResponse.json({
    received: true,
    eventName,
    ...outcome
  });
}
