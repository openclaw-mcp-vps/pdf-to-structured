import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const TOOL_ACCESS_COOKIE = "pdf_tool_access";

const DATA_DIR = path.join(process.cwd(), ".data");
const PURCHASE_FILE = path.join(DATA_DIR, "purchases.json");

type PurchaseRecord = {
  sessionId: string;
  customerEmail: string | null;
  amountTotal: number | null;
  currency: string | null;
  completedAt: string;
  mode: "payment" | "subscription";
};

type PurchaseStore = Record<string, PurchaseRecord>;

const fallbackSigningSecret = "local-dev-signing-secret";

function getSigningSecret(): string {
  return process.env.STRIPE_WEBHOOK_SECRET || fallbackSigningSecret;
}

async function ensureStore(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(PURCHASE_FILE, "utf8");
  } catch {
    await writeFile(PURCHASE_FILE, JSON.stringify({}, null, 2), "utf8");
  }
}

async function readStore(): Promise<PurchaseStore> {
  await ensureStore();
  const raw = await readFile(PURCHASE_FILE, "utf8");
  try {
    return JSON.parse(raw) as PurchaseStore;
  } catch {
    return {};
  }
}

async function writeStore(store: PurchaseStore): Promise<void> {
  await ensureStore();
  await writeFile(PURCHASE_FILE, JSON.stringify(store, null, 2), "utf8");
}

export async function saveCompletedCheckoutSession(record: PurchaseRecord): Promise<void> {
  const store = await readStore();
  store[record.sessionId] = record;
  await writeStore(store);
}

export async function isSessionPaid(sessionId: string): Promise<boolean> {
  if (!sessionId) {
    return false;
  }
  const store = await readStore();
  return Boolean(store[sessionId]);
}

export function createToolAccessToken(sessionId: string): string {
  const signature = createHmac("sha256", getSigningSecret()).update(sessionId).digest("hex");
  return `${sessionId}.${signature}`;
}

function verifyToolAccessToken(token?: string): string | null {
  if (!token) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [sessionId, signature] = parts;
  if (!sessionId || !signature) {
    return null;
  }

  const expected = createHmac("sha256", getSigningSecret()).update(sessionId).digest("hex");
  const actualBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  if (actualBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }

  return sessionId;
}

export async function isToolAccessGranted(token?: string): Promise<boolean> {
  const sessionId = verifyToolAccessToken(token);
  if (!sessionId) {
    return false;
  }

  return isSessionPaid(sessionId);
}
