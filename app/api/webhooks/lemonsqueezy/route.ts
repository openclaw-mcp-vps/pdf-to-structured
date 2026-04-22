import { NextResponse } from "next/server";
import { addOrUpdatePurchase } from "@/lib/database";
import { normalizeEmail, verifyStripeWebhookSignature } from "@/lib/lemonsqueezy";

export const runtime = "nodejs";

interface StripeCheckoutSession {
  id: string;
  mode?: "payment" | "subscription" | string;
  customer_email?: string | null;
  customer_details?: {
    email?: string | null;
  };
}

interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: StripeCheckoutSession;
  };
}

export async function POST(request: Request) {
  const body = await request.text();

  try {
    verifyStripeWebhookSignature(body, request.headers.get("stripe-signature"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook signature.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const event = JSON.parse(body) as StripeEvent;

    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object;
      const email = session.customer_details?.email ?? session.customer_email;

      if (email) {
        await addOrUpdatePurchase({
          email: normalizeEmail(email),
          source: "stripe",
          mode: session.mode === "subscription" ? "subscription" : "payg",
          purchasedAt: new Date().toISOString(),
          eventId: event.id,
          checkoutSessionId: session.id
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook handler failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

