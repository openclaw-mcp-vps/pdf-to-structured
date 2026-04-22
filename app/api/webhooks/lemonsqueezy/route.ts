import { NextResponse } from "next/server";

import {
  markSessionPaid,
  verifyStripeWebhookSignature
} from "@/lib/lemonsqueezy";

export const runtime = "nodejs";

interface StripeLikeWebhook {
  type?: string;
  data?: {
    object?: {
      id?: string;
      customer_details?: {
        email?: string;
      };
      payment_status?: string;
    };
  };
}

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  const isValid = verifyStripeWebhookSignature({
    payload,
    signatureHeader: signature
  });

  if (!isValid) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  const event = JSON.parse(payload) as StripeLikeWebhook;

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const sessionId = event.data?.object?.id;
    const email = event.data?.object?.customer_details?.email;

    if (sessionId) {
      await markSessionPaid(sessionId, email);
    }
  }

  return NextResponse.json({ received: true });
}
