import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type PlanType = "payg" | "subscription";

export interface AccessRecord {
  token: string;
  status: "pending" | "paid" | "expired";
  plan: PlanType;
  pagesPurchased: number;
  pagesUsed: number;
  orderId?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

interface StoredWebhook {
  id: string;
  eventName: string;
  receivedAt: string;
}

interface DatabaseState {
  accessRecords: Record<string, AccessRecord>;
  webhooks: StoredWebhook[];
}

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "store.json");

let writeQueue: Promise<void> = Promise.resolve();

const initialState: DatabaseState = {
  accessRecords: {},
  webhooks: []
};

async function ensureDbFile() {
  await mkdir(dataDir, { recursive: true });

  try {
    await readFile(dbPath, "utf8");
  } catch {
    await writeFile(dbPath, JSON.stringify(initialState, null, 2), "utf8");
  }
}

async function readDb(): Promise<DatabaseState> {
  await ensureDbFile();
  const raw = await readFile(dbPath, "utf8");
  try {
    return JSON.parse(raw) as DatabaseState;
  } catch {
    return initialState;
  }
}

async function mutateDb(mutator: (db: DatabaseState) => void | Promise<void>) {
  writeQueue = writeQueue.then(async () => {
    const db = await readDb();
    await mutator(db);
    await writeFile(dbPath, JSON.stringify(db, null, 2), "utf8");
  });

  await writeQueue;
}

export async function createPendingAccessToken(token: string, plan: PlanType) {
  const now = new Date().toISOString();
  const record: AccessRecord = {
    token,
    status: "pending",
    plan,
    pagesPurchased: plan === "subscription" ? 1000 : 0,
    pagesUsed: 0,
    createdAt: now,
    updatedAt: now
  };

  await mutateDb((db) => {
    db.accessRecords[token] = record;
  });

  return record;
}

export async function markAccessPaid(params: {
  token: string;
  orderId?: string;
  email?: string;
  pagesPurchased?: number;
  plan?: PlanType;
}) {
  const now = new Date().toISOString();

  await mutateDb((db) => {
    const existing = db.accessRecords[params.token];
    const plan = params.plan ?? existing?.plan ?? "payg";
    const purchasedPages =
      params.pagesPurchased ?? (plan === "subscription" ? 1000 : existing?.pagesPurchased ?? 200);

    db.accessRecords[params.token] = {
      token: params.token,
      status: "paid",
      plan,
      pagesPurchased: purchasedPages,
      pagesUsed: existing?.pagesUsed ?? 0,
      orderId: params.orderId ?? existing?.orderId,
      email: params.email ?? existing?.email,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };
  });
}

export async function getAccessRecord(token: string | undefined | null) {
  if (!token) {
    return null;
  }

  const db = await readDb();
  return db.accessRecords[token] ?? null;
}

export async function hasPaidAccess(token: string | undefined | null) {
  const record = await getAccessRecord(token);
  if (!record || record.status !== "paid") {
    return false;
  }

  return record.pagesUsed < record.pagesPurchased;
}

export async function consumePages(token: string, pages: number) {
  if (pages <= 0) {
    return { ok: true as const, remaining: 0 };
  }

  let result: { ok: boolean; remaining: number } = { ok: false, remaining: 0 };

  await mutateDb((db) => {
    const record = db.accessRecords[token];
    if (!record || record.status !== "paid") {
      result = { ok: false, remaining: 0 };
      return;
    }

    const remaining = record.pagesPurchased - record.pagesUsed;
    if (remaining < pages) {
      result = { ok: false, remaining };
      return;
    }

    record.pagesUsed += pages;
    record.updatedAt = new Date().toISOString();
    db.accessRecords[token] = record;
    result = {
      ok: true,
      remaining: record.pagesPurchased - record.pagesUsed
    };
  });

  return result;
}

export async function saveWebhookReceipt(id: string, eventName: string) {
  await mutateDb((db) => {
    const alreadyExists = db.webhooks.some((hook) => hook.id === id);
    if (alreadyExists) {
      return;
    }

    db.webhooks.unshift({
      id,
      eventName,
      receivedAt: new Date().toISOString()
    });

    db.webhooks = db.webhooks.slice(0, 300);
  });
}
