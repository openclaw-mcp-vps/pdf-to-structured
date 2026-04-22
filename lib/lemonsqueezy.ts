import { createHmac, timingSafeEqual } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

const STORE_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(STORE_DIR, "paid-sessions.json");

export const ACCESS_COOKIE_NAME = "pdf_tool_access";

interface SessionStore {
  sessions: Record<string, { paidAt: string; email?: string }>;
}

async function readStore(): Promise<SessionStore> {
  try {
    const raw = await readFile(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as SessionStore;
    return {
      sessions: parsed.sessions ?? {}
    };
  } catch {
    return { sessions: {} };
  }
}

async function writeStore(store: SessionStore): Promise<void> {
  await mkdir(STORE_DIR, { recursive: true });
  await writeFile(STORE_FILE, JSON.stringify(store, null, 2), "utf8");
}

function getSigningSecret(): string {
  return process.env.STRIPE_WEBHOOK_SECRET || "development-signing-secret";
}

function sign(value: string): string {
  return createHmac("sha256", getSigningSecret()).update(value).digest("hex");
}

export async function markSessionPaid(sessionId: string, email?: string): Promise<void> {
  if (!sessionId) {
    return;
  }

  const store = await readStore();
  store.sessions[sessionId] = {
    paidAt: new Date().toISOString(),
    ...(email ? { email } : {})
  };
  await writeStore(store);
}

export async function isSessionPaid(sessionId: string): Promise<boolean> {
  const store = await readStore();
  return Boolean(store.sessions[sessionId]);
}

export function createAccessToken(sessionId: string): string {
  const issuedAt = Date.now().toString();
  const payload = `${sessionId}.${issuedAt}`;
  const signature = sign(payload);
  return Buffer.from(`${payload}.${signature}`, "utf8").toString("base64url");
}

function decodeAccessToken(token: string): { sessionId: string; issuedAt: number } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(".");
    if (parts.length < 3) {
      return null;
    }

    const signature = parts.pop();
    if (!signature) {
      return null;
    }

    const issuedAtRaw = parts.pop();
    if (!issuedAtRaw) {
      return null;
    }

    const sessionId = parts.join(".");
    const payload = `${sessionId}.${issuedAtRaw}`;
    const expected = sign(payload);

    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signature, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return null;
    }

    const issuedAt = Number(issuedAtRaw);
    if (!Number.isFinite(issuedAt)) {
      return null;
    }

    const maxAgeMs = 1000 * 60 * 60 * 24 * 60;
    if (Date.now() - issuedAt > maxAgeMs) {
      return null;
    }

    return { sessionId, issuedAt };
  } catch {
    return null;
  }
}

export async function hasPaidAccessCookie(token?: string): Promise<boolean> {
  if (!token) {
    return false;
  }

  const decoded = decodeAccessToken(token);
  if (!decoded) {
    return false;
  }

  return isSessionPaid(decoded.sessionId);
}

export function verifyStripeWebhookSignature(params: {
  payload: string;
  signatureHeader: string | null;
}): boolean {
  const { payload, signatureHeader } = params;
  if (!signatureHeader) {
    return false;
  }

  const parts = signatureHeader.split(",").reduce<Record<string, string>>((acc, part) => {
    const [key, value] = part.split("=");
    if (key && value) {
      acc[key.trim()] = value.trim();
    }
    return acc;
  }, {});

  const timestamp = parts.t;
  const signature = parts.v1;

  if (!timestamp || !signature) {
    return false;
  }

  const signedPayload = `${timestamp}.${payload}`;
  const expected = createHmac("sha256", getSigningSecret())
    .update(signedPayload, "utf8")
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");

  return a.length === b.length && timingSafeEqual(a, b);
}
