import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";

export interface PurchaseRecord {
  email: string;
  source: "stripe";
  mode: "payg" | "subscription";
  purchasedAt: string;
  eventId: string;
  checkoutSessionId?: string;
}

interface PurchaseStore {
  purchases: PurchaseRecord[];
}

const DATA_DIR = path.join(process.cwd(), ".data");
const PURCHASES_PATH = path.join(DATA_DIR, "purchases.json");
const UPLOAD_DIR = path.join(process.cwd(), ".uploads");

async function ensureDir(targetPath: string): Promise<void> {
  await mkdir(targetPath, { recursive: true });
}

async function readStore(): Promise<PurchaseStore> {
  await ensureDir(DATA_DIR);

  try {
    const payload = await readFile(PURCHASES_PATH, "utf8");
    const parsed = JSON.parse(payload) as Partial<PurchaseStore>;
    return {
      purchases: Array.isArray(parsed.purchases) ? parsed.purchases : []
    };
  } catch (error) {
    const maybeErr = error as NodeJS.ErrnoException;
    if (maybeErr.code === "ENOENT") {
      return { purchases: [] };
    }

    throw error;
  }
}

async function writeStore(store: PurchaseStore): Promise<void> {
  await ensureDir(DATA_DIR);
  await writeFile(PURCHASES_PATH, JSON.stringify(store, null, 2), "utf8");
}

export async function addOrUpdatePurchase(record: PurchaseRecord): Promise<void> {
  const store = await readStore();
  const existingIndex = store.purchases.findIndex(
    (purchase) => purchase.eventId === record.eventId || purchase.email === record.email
  );

  if (existingIndex >= 0) {
    store.purchases[existingIndex] = record;
  } else {
    store.purchases.push(record);
  }

  await writeStore(store);
}

export async function findPurchaseByEmail(email: string): Promise<PurchaseRecord | null> {
  const store = await readStore();
  const normalizedEmail = email.trim().toLowerCase();
  const purchase = store.purchases.find((item) => item.email === normalizedEmail);
  return purchase ?? null;
}

export async function listPurchases(): Promise<PurchaseRecord[]> {
  const store = await readStore();
  return store.purchases;
}

export async function ensureUploadDirectory(): Promise<string> {
  await ensureDir(UPLOAD_DIR);
  return UPLOAD_DIR;
}

