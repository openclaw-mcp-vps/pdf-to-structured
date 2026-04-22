import Stripe from "stripe";
import { NextResponse } from "next/server";

import { saveCompletedCheckoutSession } from "@/lib/lemonsqueezy";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder");

export async function POST(request: Request): Promise<NextResponse> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not configured." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json(
      {
        error: `Invalid webhook signature: ${error instanceof Error ? error.message : "unknown error"}`
      },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    await saveCompletedCheckoutSession({
      sessionId: session.id,
      customerEmail: session.customer_details?.email ?? session.customer_email ?? null,
      amountTotal: session.amount_total ?? null,
      currency: session.currency ?? null,
      completedAt: new Date().toISOString(),
      mode: session.mode === "subscription" ? "subscription" : "payment"
    });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
