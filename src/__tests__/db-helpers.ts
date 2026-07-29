import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { execSync } from "child_process";

/**
 * Create a fresh isolated test database and return a PrismaClient.
 * Each call creates the tables from the schema.
 */
let testDbCounter = 0;

export async function createTestDb(): Promise<PrismaClient> {
  // Combine time, a process-local counter, and randomness so concurrent test
  // suites never collide on the same SQLite file (which caused "table already
  // exists" failures when multiple node-env suites ran in parallel).
  testDbCounter += 1;
  const unique = `${Date.now()}-${testDbCounter}-${Math.floor(Math.random() * 1e6)}`;
  const dbName = `test-${unique}.db`;
  const testDbUrl = `file:${dbName}`;

  const prisma = new PrismaClient({
    datasources: { db: { url: testDbUrl } },
  });

  // Push schema to create tables
  execSync(`DATABASE_URL="${testDbUrl}" npx prisma db push --skip-generate --accept-data-loss`, {
    cwd: process.cwd(),
    stdio: "pipe",
  });

  return prisma;
}

export interface TestUser {
  user: {
    id: string;
    email: string;
    name: string | null;
    accountNumber: string;
  };
  accounts: {
    id: string;
    type: string;
    number: string;
    balance: number;
  }[];
  transactions: {
    id: string;
    type: string;
    amount: number;
    description: string | null;
  }[];
}

/**
 * Seed the test database with a standard user, accounts, and transactions.
 * Cleans existing data first to avoid unique constraint conflicts.
 */
export async function seedTestUser(prisma: PrismaClient): Promise<TestUser> {
  // Clean existing data in correct order (respect FK constraints)
  await prisma.transaction.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("test-password", 10);

  const user = await prisma.user.create({
    data: {
      email: "test@example.com",
      name: "Test User",
      passwordHash,
      accountNumber: "ACC-TEST-001",
    },
  });

  const checking = await prisma.account.create({
    data: {
      userId: user.id,
      type: "checking",
      number: "CHK-TEST-001",
      balance: 5000,
    },
  });

  const savings = await prisma.account.create({
    data: {
      userId: user.id,
      type: "savings",
      number: "SAV-TEST-001",
      balance: 10000,
    },
  });

  const tx1 = await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId: checking.id,
      type: "deposit",
      amount: 5000,
      description: "Salary",
    },
  });

  const tx2 = await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId: checking.id,
      type: "withdrawal",
      amount: 100,
      description: "Groceries",
    },
  });

  await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId: savings.id,
      type: "deposit",
      amount: 1000,
      description: "Savings deposit",
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
      { id: checking.id, type: checking.type, number: checking.number, balance: checking.balance },
      { id: savings.id, type: savings.type, number: savings.number, balance: savings.balance },
    ],
    transactions: [
      { id: tx1.id, type: tx1.type, amount: tx1.amount, description: tx1.description },
      { id: tx2.id, type: tx2.type, amount: tx2.amount, description: tx2.description },
    ],
  };
}
