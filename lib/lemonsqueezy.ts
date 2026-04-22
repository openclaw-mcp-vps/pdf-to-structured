import crypto from "node:crypto";

export const ACCESS_COOKIE_NAME = "pdf_to_structured_access";
const ACCESS_TTL_SECONDS = 60 * 60 * 24 * 30;

interface AccessTokenPayload {
  email: string;
  issuedAt: number;
  expiresAt: number;
}

function getSigningSecret(): string {
  return process.env.STRIPE_WEBHOOK_SECRET ?? "dev-signing-secret-change-me";
}

function toBase64Url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function fromBase64Url(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function signTokenPayload(encodedPayload: string): string {
  return crypto.createHmac("sha256", getSigningSecret()).update(encodedPayload).digest("base64url");
}

export function createAccessToken(email: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: AccessTokenPayload = {
    email: email.trim().toLowerCase(),
    issuedAt: now,
    expiresAt: now + ACCESS_TTL_SECONDS
  };

  const encoded = toBase64Url(JSON.stringify(payload));
  const signature = signTokenPayload(encoded);
  return `${encoded}.${signature}`;
}

export function verifyAccessToken(token: string | undefined | null): AccessTokenPayload | null {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signTokenPayload(encodedPayload);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload)) as AccessTokenPayload;
    const now = Math.floor(Date.now() / 1000);
    if (!payload.email || payload.expiresAt <= now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function extractCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) {
    return null;
  }

  const pair = cookieHeader
    .split(";")
    .map((chunk) => chunk.trim())
    .find((chunk) => chunk.startsWith(`${name}=`));

  if (!pair) {
    return null;
  }

  const value = pair.slice(name.length + 1);
  return value ? decodeURIComponent(value) : null;
}

export function requestHasAccess(cookieHeader: string | null): boolean {
  const token = extractCookie(cookieHeader, ACCESS_COOKIE_NAME);
  return verifyAccessToken(token) !== null;
}

function parseStripeSignatureHeader(header: string): { timestamp: string; signatures: string[] } {
  const pieces = header.split(",");
  let timestamp = "";
  const signatures: string[] = [];

  for (const piece of pieces) {
    const [key, value] = piece.split("=", 2);
    if (key === "t" && value) {
      timestamp = value;
    }

    if (key === "v1" && value) {
      signatures.push(value);
    }
  }

  return { timestamp, signatures };
}

export function verifyStripeWebhookSignature(payload: string, signatureHeader: string | null): void {
  const signingSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signingSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured.");
  }

  if (!signatureHeader) {
    throw new Error("Missing Stripe signature header.");
  }

  const { timestamp, signatures } = parseStripeSignatureHeader(signatureHeader);
  if (!timestamp || signatures.length === 0) {
    throw new Error("Malformed Stripe signature header.");
  }

  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto.createHmac("sha256", signingSecret).update(signedPayload).digest("hex");
  const isValid = signatures.some((signature) => {
    const expectedBuffer = Buffer.from(expected);
    const providedBuffer = Buffer.from(signature);
    return expectedBuffer.length === providedBuffer.length && crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  });

  if (!isValid) {
    throw new Error("Invalid Stripe webhook signature.");
  }

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds)) {
    throw new Error("Invalid Stripe timestamp.");
  }

  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - timestampSeconds);
  if (ageSeconds > 300) {
    throw new Error("Stripe webhook timestamp is outside the replay window.");
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

