import crypto from "node:crypto";
import { createPendingAccessToken, markAccessPaid, PlanType } from "@/lib/database";

const checkoutApiUrl = "https://api.lemonsqueezy.com/v1/checkouts";

export function verifyLemonSignature(rawBody: string, signature: string | null, secret: string | undefined) {
  if (!signature || !secret) {
    return false;
  }

  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  if (digest.length !== signature.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

export function createAccessToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

export async function createHostedCheckout(params: {
  token: string;
  plan: PlanType;
  email?: string;
  requestOrigin: string;
}) {
  const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
  const storeId = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_STORE_ID;
  const paygVariantId = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID;
  const subscriptionVariantId =
    process.env.NEXT_PUBLIC_LEMON_SQUEEZY_SUBSCRIPTION_PRODUCT_ID ?? paygVariantId;
  const variantId = params.plan === "subscription" ? subscriptionVariantId : paygVariantId;

  if (!apiKey || !storeId || !variantId) {
    throw new Error("Missing Lemon Squeezy environment variables.");
  }

  await createPendingAccessToken(params.token, params.plan);

  const pagesForPlan = params.plan === "subscription" ? 1000 : 200;
  const redirectUrl = `${params.requestOrigin}/upload?access_token=${params.token}`;

  const body = {
    data: {
      type: "checkouts",
      attributes: {
        checkout_data: {
          email: params.email,
          custom: {
            access_token: params.token,
            plan: params.plan,
            pages: String(pagesForPlan)
          }
        },
        checkout_options: {
          embed: true,
          media: false,
          logo: true
        },
        product_options: {
          redirect_url: redirectUrl
        }
      },
      relationships: {
        store: {
          data: {
            type: "stores",
            id: storeId
          }
        },
        variant: {
          data: {
            type: "variants",
            id: variantId
          }
        }
      }
    }
  };

  const response = await fetch(checkoutApiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Lemon checkout creation failed: ${response.status} ${detail}`);
  }

  const payload = (await response.json()) as {
    data?: {
      attributes?: {
        url?: string;
      };
    };
  };

  const checkoutUrl = payload.data?.attributes?.url;
  if (!checkoutUrl) {
    throw new Error("No checkout URL returned by Lemon Squeezy.");
  }

  return { checkoutUrl, pagesForPlan };
}

interface LemonWebhookPayload {
  meta?: {
    event_name?: string;
    custom_data?: Record<string, unknown>;
  };
  data?: {
    id?: string;
    attributes?: {
      identifier?: string;
      user_email?: string;
      custom_data?: Record<string, unknown>;
    };
  };
}

export async function processLemonWebhook(payload: LemonWebhookPayload) {
  const eventName = payload.meta?.event_name ?? "unknown";
  const orderId = payload.data?.attributes?.identifier ?? payload.data?.id;

  const fromMeta = payload.meta?.custom_data ?? {};
  const fromAttrs = payload.data?.attributes?.custom_data ?? {};
  const token =
    (fromMeta.access_token as string | undefined) ?? (fromAttrs.access_token as string | undefined) ?? "";

  if (!token) {
    return { handled: false, reason: "No access token in webhook custom data." };
  }

  const plan = ((fromMeta.plan as string | undefined) ?? (fromAttrs.plan as string | undefined) ?? "payg") as PlanType;
  const pages = Number((fromMeta.pages as string | undefined) ?? (fromAttrs.pages as string | undefined) ?? "200");

  const paidEvents = new Set([
    "order_created",
    "order_refunded_reverted",
    "subscription_created",
    "subscription_payment_success",
    "subscription_payment_recovered"
  ]);

  if (!paidEvents.has(eventName)) {
    return { handled: false, reason: `Event ${eventName} does not grant access.` };
  }

  await markAccessPaid({
    token,
    orderId,
    email: payload.data?.attributes?.user_email,
    pagesPurchased: Number.isFinite(pages) && pages > 0 ? pages : plan === "subscription" ? 1000 : 200,
    plan
  });

  return { handled: true, token, plan };
}
