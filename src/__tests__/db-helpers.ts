import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

/**
 * Create a fresh isolated test database and return a PrismaClient.
 * Each call creates the tables from the schema.
 *
 * The test database is built with `db push` (not `migrate deploy`) on purpose:
 * it is schema-driven, disposable and much faster than replaying migrations.
 *
 * One process pushes a shared template; every suite copies that file. Parallel
 * `db push` calls were exceeding Vitest's 10s hook timeout.
 */
let testDbCounter = 0;

/** Databases created by this test file, so cleanup only removes its own. */
const createdDatabases = new Set<string>();

const SCHEMA_DIR = path.join(process.cwd(), "prisma");
const TEMPLATE_NAME = "test-template.db";
const TEMPLATE_PATH = path.join(SCHEMA_DIR, TEMPLATE_NAME);
const TEMPLATE_READY = path.join(SCHEMA_DIR, "test-template.ready");
const TEMPLATE_LOCK = path.join(SCHEMA_DIR, "test-template.lock");

function sleepMs(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function schemaMtime(): number {
  return fs.statSync(path.join(SCHEMA_DIR, "schema.prisma")).mtimeMs;
}

function templateIsFresh(): boolean {
  try {
    // The ready marker is written only after `db push` returns, so a copy never
    // sees the empty file SQLite creates at the start of the push.
    return (
      fs.statSync(TEMPLATE_READY).mtimeMs >= schemaMtime() &&
      fs.statSync(TEMPLATE_PATH).size > 0
    );
  } catch {
    return false;
  }
}

function lockHolderAlive(): boolean {
  try {
    const pid = Number(fs.readFileSync(TEMPLATE_LOCK, "utf8"));
    if (!Number.isInteger(pid) || pid <= 0) return false;
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Build `prisma/test-template.db` once. Other workers wait and then copy it. */
function ensureTemplate(): void {
  if (templateIsFresh()) return;

  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (templateIsFresh()) return;

    let fd: number;
    try {
      fd = fs.openSync(TEMPLATE_LOCK, "wx");
    } catch {
      if (!lockHolderAlive()) {
        try {
          fs.unlinkSync(TEMPLATE_LOCK);
        } catch {
          // Another waiter removed it first.
        }
      }
      sleepMs(50);
      continue;
    }

    try {
      fs.writeFileSync(fd, String(process.pid));
      if (!templateIsFresh()) {
        for (const file of [TEMPLATE_READY, TEMPLATE_PATH]) {
          try {
            fs.unlinkSync(file);
          } catch {
            // First build: the template is not there yet.
          }
        }
        execSync("npx prisma db push --skip-generate --accept-data-loss", {
          cwd: process.cwd(),
          stdio: "pipe",
          env: { ...process.env, DATABASE_URL: `file:${TEMPLATE_NAME}` },
        });
        if (!fs.existsSync(TEMPLATE_PATH) || fs.statSync(TEMPLATE_PATH).size === 0) {
          throw new Error("prisma db push did not create the test template database");
        }
        fs.writeFileSync(TEMPLATE_READY, "ok");
      }
      return;
    } catch (err) {
      for (const file of [TEMPLATE_READY, TEMPLATE_PATH]) {
        try {
          fs.unlinkSync(file);
        } catch {
          // Nothing to clean up.
        }
      }
      throw err;
    } finally {
      fs.closeSync(fd);
      try {
        fs.unlinkSync(TEMPLATE_LOCK);
      } catch {
        // The lock is already gone.
      }
    }
  }

  throw new Error("Timed out creating the shared test database template");
}

export async function createTestDb(): Promise<PrismaClient> {
  ensureTemplate();

  // Combine pid, time, a process-local counter, and randomness so concurrent
  // suites never collide on the same SQLite file.
  testDbCounter += 1;
  const unique = `${process.pid}-${Date.now()}-${testDbCounter}-${Math.floor(Math.random() * 1e6)}`;
  const dbName = `test-${unique}.db`;
  createdDatabases.add(dbName);
  fs.copyFileSync(TEMPLATE_PATH, path.join(SCHEMA_DIR, dbName));

  return new PrismaClient({
    datasources: { db: { url: `file:${dbName}` } },
  });
}

/**
 * Remove the temporary SQLite files this test file created.
 *
 * Prisma resolves relative `file:` URLs against the schema directory, so the
 * databases land next to `schema.prisma` (`prisma/`) even though the URL looks
 * relative to the repository root. Only files created here are removed: suites
 * run in parallel, and deleting a sibling's live database breaks it.
 */
export function cleanupTestDbs(): void {
  for (const dbName of createdDatabases) {
    for (const dir of [".", "prisma"]) {
      for (const suffix of ["", "-journal", "-wal", "-shm"]) {
        try {
          fs.unlinkSync(`${dir}/${dbName}${suffix}`);
        } catch {}
      }
    }
  }
  createdDatabases.clear();
}

export interface TestUser {
  user: {
    id: string;
    email: string;
    name: string | null;
    accountNumber: string;
  };
  /** Balances are in cents, as stored. */
  accounts: {
    id: string;
    type: string;
    number: string;
    balanceCents: number;
  }[];
  transactions: {
    id: string;
    type: string;
    amountCents: number;
    description: string | null;
  }[];
  checkingAccountId: string;
  savingsAccountId: string;
  checkingAccountNumber: string;
  savingsAccountNumber: string;
}

/**
 * Seed the test database with a standard user, accounts, and transactions.
 * Cleans existing data first to avoid unique constraint conflicts.
 */
export async function seedTestUser(prisma: PrismaClient): Promise<TestUser> {
  // Clean existing data in correct order (respect FK constraints)
  await prisma.categoryBudget.deleteMany();
  await prisma.securityLog.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("test-password", 10);

  const user = await prisma.user.create({
    data: {
      email: "test@example.com",
      name: "Test User",
      passwordHash,
      accountNumber: "USR-T35T01",
    },
  });

  const checking = await prisma.account.create({
    data: {
      userId: user.id,
      type: "checking",
      number: "CHK-T35T01",
      balanceCents: 500_000, // $5,000.00
    },
  });

  const savings = await prisma.account.create({
    data: {
      userId: user.id,
      type: "savings",
      number: "SAV-T35T01",
      balanceCents: 1_000_000, // $10,000.00
      interestRate: 3.5,
    },
  });

  const tx1 = await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId: checking.id,
      type: "deposit",
      amountCents: 500_000,
      description: "Salary",
      category: "income",
    },
  });

  const tx2 = await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId: checking.id,
      type: "withdrawal",
      amountCents: 10_000,
      description: "Groceries",
      category: "other",
    },
  });

  await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId: savings.id,
      type: "deposit",
      amountCents: 100_000,
      description: "Savings deposit",
      category: "income",
    },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      accountNumber: user.accountNumber,
    },
    accounts: [
      {
        id: checking.id,
        type: checking.type,
        number: checking.number,
        balanceCents: checking.balanceCents,
      },
      {
        id: savings.id,
        type: savings.type,
        number: savings.number,
        balanceCents: savings.balanceCents,
      },
    ],
    transactions: [
      {
        id: tx1.id,
        type: tx1.type,
        amountCents: tx1.amountCents,
        description: tx1.description,
      },
      {
        id: tx2.id,
        type: tx2.type,
        amountCents: tx2.amountCents,
        description: tx2.description,
      },
    ],
    checkingAccountId: checking.id,
    savingsAccountId: savings.id,
    checkingAccountNumber: checking.number,
    savingsAccountNumber: savings.number,
  };
}

export interface PeerUser {
  user: { id: string; email: string; name: string };
  account: { id: string; number: string; balanceCents: number };
}

/**
 * A second user with one checking account, used to exercise external transfers
 * (fees, recipient notifications) without leaving the sandbox.
 */
export async function seedPeerUser(
  prisma: PrismaClient,
  overrides: {
    email?: string;
    name?: string;
    number?: string;
    balanceCents?: number;
  } = {},
): Promise<PeerUser> {
  const passwordHash = await bcrypt.hash("peer-password", 4);

  const user = await prisma.user.create({
    data: {
      email: overrides.email ?? "peer@example.com",
      name: overrides.name ?? "Peer User",
      passwordHash,
      accountNumber: "USR-P33R01",
    },
  });

  const account = await prisma.account.create({
    data: {
      userId: user.id,
      type: "checking",
      number: overrides.number ?? "CHK-P33R01",
      balanceCents: overrides.balanceCents ?? 0,
    },
  });

  return {
    user: { id: user.id, email: user.email, name: user.name ?? "Peer User" },
    account: {
      id: account.id,
      number: account.number,
      balanceCents: account.balanceCents,
    },
  };
}
