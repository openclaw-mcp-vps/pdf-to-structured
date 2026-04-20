import { NextRequest, NextResponse } from "next/server";
import { createAccessToken, createHostedCheckout } from "@/lib/lemonsqueezy";
import { PlanType } from "@/lib/database";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json().catch(() => ({}))) as {
      plan?: PlanType;
      email?: string;
    };

    const plan: PlanType = payload.plan === "subscription" ? "subscription" : "payg";
    const token = createAccessToken();
    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      request.headers.get("origin") ||
      new URL(request.url).origin ||
      "http://localhost:3000";

    const { checkoutUrl, pagesForPlan } = await createHostedCheckout({
      token,
      plan,
      email: payload.email,
      requestOrigin: origin
    });

    return NextResponse.json({
      checkoutUrl,
      token,
      plan,
      pagesForPlan
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Checkout creation failed"
      },
      { status: 500 }
    );
  }
}
