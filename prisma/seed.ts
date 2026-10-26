import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { categorize } from "../src/lib/categorize";
import { DEFAULT_DUE_DATE, DEFAULT_INTEREST_RATES } from "../src/lib/domain";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@banking.app";
const PEER_EMAIL = "alice@banking.app";
const DEMO_PASSWORD = "demo-password";

/** Dates relative to `now` keep the analytics charts meaningful over time. */
function daysAgo(days: number, hour = 12): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

async function main() {
  console.log("Seeding database...");

  // Clean existing data (children first so FKs stay valid).
  await prisma.notification.deleteMany();
  await prisma.recurringTransfer.deleteMany();
  await prisma.savingsGoal.deleteMany();
  await prisma.beneficiary.deleteMany();
  await prisma.categoryBudget.deleteMany();
  await prisma.securityLog.deleteMany();
  await prisma.virtualCard.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.jobLock.deleteMany();
  await prisma.rateLimitEntry.deleteMany();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // ── Peer user ─────────────────────────────────────────
  // Gives external transfers a real destination inside the sandbox.
  const peer = await prisma.user.create({
    data: {
      email: PEER_EMAIL,
      name: "Alice Johnson",
      passwordHash,
      accountNumber: "USR-4L1C30",
    },
  });

  const peerChecking = await prisma.account.create({
    data: {
      userId: peer.id,
      type: "checking",
      number: "CHK-AB12CD",
      nickname: "Main",
      balanceCents: 318_420, // $3,184.20
    },
  });

  // ── Demo user ─────────────────────────────────────────
  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      name: "Demo User",
      passwordHash,
      accountNumber: "USR-D3M000",
    },
  });

  const checking = await prisma.account.create({
    data: {
      userId: user.id,
      type: "checking",
      number: "CHK-001001",
      nickname: "Everyday",
      balanceCents: 524_075, // $5,240.75
      interestRate: DEFAULT_INTEREST_RATES.checking,
    },
  });

  const savings = await prisma.account.create({
    data: {
      userId: user.id,
      type: "savings",
      number: "SAV-001001",
      nickname: "Rainy day",
      balanceCents: 1_275_000, // $12,750.00
      interestRate: DEFAULT_INTEREST_RATES.savings,
      // Five days of unposted interest so the first dashboard load has
      // something for the job runner to accrue.
      lastInterestAt: daysAgo(5),
    },
  });

  const credit = await prisma.account.create({
    data: {
      userId: user.id,
      type: "credit",
      number: "CRD-001001",
      nickname: "Travel card",
      balanceCents: -125_050, // -$1,250.50 owed
      creditLimitCents: 500_000, // $5,000.00
      interestRate: DEFAULT_INTEREST_RATES.credit,
      dueDate: DEFAULT_DUE_DATE,
    },
  });

  console.log(`Created demo user ${user.email} with 3 accounts`);

  // ── Transactions ──────────────────────────────────────
  const transactions: Array<{
    accountId: string;
    type: string;
    amountCents: number;
    description: string;
    days: number;
  }> = [
    {
      accountId: checking.id,
      type: "deposit",
      amountCents: 500_000,
      description: "Direct deposit - Salary",
      days: 40,
    },
    {
      accountId: checking.id,
      type: "withdrawal",
      amountCents: 150_000,
      description: "Rent payment",
      days: 38,
    },
    {
      accountId: checking.id,
      type: "withdrawal",
      amountCents: 8_999,
      description: "Electric bill",
      days: 36,
    },
    {
      accountId: checking.id,
      type: "deposit",
      amountCents: 25_000,
      description: "Freelance payment",
      days: 33,
    },
    {
      accountId: checking.id,
      type: "withdrawal",
      amountCents: 4_500,
      description: "Coffee shop",
      days: 30,
    },
    {
      accountId: checking.id,
      type: "withdrawal",
      amountCents: 12_000,
      description: "Groceries",
      days: 28,
    },
    {
      accountId: checking.id,
      type: "withdrawal",
      amountCents: 6_000,
      description: "Internet bill",
      days: 26,
    },
    {
      accountId: checking.id,
      type: "transfer_out",
      amountCents: 50_000,
      description: "Transfer to Rainy day - Monthly savings",
      days: 24,
    },
    {
      accountId: savings.id,
      type: "transfer_in",
      amountCents: 50_000,
      description: "Transfer from Everyday - Monthly savings",
      days: 24,
    },
    {
      accountId: checking.id,
      type: "withdrawal",
      amountCents: 3_499,
      description: "Netflix subscription",
      days: 21,
    },
    {
      accountId: checking.id,
      type: "withdrawal",
      amountCents: 150_000,
      description: "Rent payment",
      days: 8,
    },
    {
      accountId: checking.id,
      type: "deposit",
      amountCents: 500_000,
      description: "Direct deposit - Salary",
      days: 5,
    },
    {
      accountId: checking.id,
      type: "withdrawal",
      amountCents: 8_999,
      description: "Electric bill",
      days: 3,
    },
    // External transfer: the outgoing leg plus the sandbox fee as its own line.
    {
      accountId: checking.id,
      type: "transfer_out",
      amountCents: 20_000,
      description: "Transfer to Alice Johnson (CHK-AB12CD) - Split dinner",
      days: 2,
    },
    {
      accountId: checking.id,
      type: "fee",
      amountCents: 100,
      description: "External transfer fee",
      days: 2,
    },
    {
      accountId: peerChecking.id,
      type: "transfer_in",
      amountCents: 20_000,
      description: "Transfer from external account (CHK-001001) - Split dinner",
      days: 2,
    },
    {
      accountId: credit.id,
      type: "withdrawal",
      amountCents: 125_050,
      description: "Hotel booking",
      days: 12,
    },
    // Interest already posted by the job runner for the savings account.
    {
      accountId: savings.id,
      type: "interest",
      amountCents: 1_222,
      description: "Interest earned (10 days)",
      days: 10,
    },
    {
      accountId: savings.id,
      type: "deposit",
      amountCents: 100_000,
      description: "Savings deposit",
      days: 6,
    },
  ];

  for (const tx of transactions) {
    await prisma.transaction.create({
      data: {
        userId: tx.accountId === peerChecking.id ? peer.id : user.id,
        accountId: tx.accountId,
        type: tx.type,
        amountCents: tx.amountCents,
        description: tx.description,
        category: categorize(
          tx.type,
          tx.description.split(" - ").pop() ?? tx.description,
        ),
        status: "completed",
        createdAt: daysAgo(tx.days),
      },
    });
  }

  console.log(`Created ${transactions.length} transactions`);

  // ── Beneficiaries ─────────────────────────────────────
  await prisma.beneficiary.createMany({
    data: [
      {
        userId: user.id,
        name: "Alice Johnson",
        accountNumber: peerChecking.number,
        nickname: "Roommate",
      },
      {
        userId: user.id,
        name: "Bob's Plumbing",
        accountNumber: "CHK-99XY00",
        nickname: null,
      },
    ],
  });

  // ── Savings goal ──────────────────────────────────────
  await prisma.savingsGoal.create({
    data: {
      userId: user.id,
      accountId: savings.id,
      name: "Emergency Fund",
      targetAmountCents: 1_000_000, // $10,000.00
      currentAmountCents: 350_000, // $3,500.00
      color: "emerald",
      deadline: new Date(new Date().getFullYear() + 1, 11, 31),
    },
  });

  // ── Scheduled transfer (upcoming) ─────────────────────
  await prisma.recurringTransfer.create({
    data: {
      userId: user.id,
      fromAccountId: checking.id,
      targetAccountNumber: savings.number,
      amountCents: 50_000, // $500.00
      frequency: "monthly",
      description: "Monthly savings",
      nextRunAt: daysAgo(-7, 9),
    },
  });

  // ── Notifications ─────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      {
        userId: user.id,
        type: "info",
        title: "Welcome to Trinax Bank",
        body: "Explore analytics, savings goals, beneficiaries and scheduled transfers.",
        createdAt: daysAgo(45),
      },
      {
        userId: user.id,
        type: "interest",
        title: "Interest earned",
        body: "Your Rainy day account earned $12.22 in interest.",
        createdAt: daysAgo(10),
      },
      {
        userId: user.id,
        type: "low_balance",
        title: "Low balance",
        body: "Travel card balance is now -$1,250.50.",
        createdAt: daysAgo(12),
      },
    ],
  });

  // ── Category Budgets ──────────────────────────────────
  await prisma.categoryBudget.createMany({
    data: [
      { userId: user.id, category: "food", amountCents: 60_000 },
      { userId: user.id, category: "shopping", amountCents: 40_000 },
      { userId: user.id, category: "bills", amountCents: 85_000 },
      { userId: user.id, category: "transport", amountCents: 25_000 },
      { userId: user.id, category: "entertainment", amountCents: 20_000 },
    ],
  });

  // ── Virtual Cards ─────────────────────────────────────
  await prisma.virtualCard.createMany({
    data: [
      {
        userId: user.id,
        cardNumber: "4532891044218834",
        cardHolder: "DEMO USER",
        expiryDate: "08/29",
        cvv: "482",
        isFrozen: false,
        isTemporary: false,
        createdAt: daysAgo(30, 16),
      },
      {
        userId: user.id,
        cardNumber: "4532119873409215",
        cardHolder: "DEMO USER",
        expiryDate: "11/26",
        cvv: "917",
        isFrozen: false,
        isTemporary: true,
        expiresAt: daysAgo(-1, 16),
        maxUses: 1,
        usageCount: 0,
        createdAt: daysAgo(0, 10),
      },
    ],
  });

  // ── Security Logs ─────────────────────────────────────
  await prisma.securityLog.createMany({
    data: [
      {
        userId: user.id,
        action: "login",
        details: "Successful web login via Chrome on Linux",
        ipAddress: "192.168.1.45",
        createdAt: daysAgo(1, 14),
      },
      {
        userId: user.id,
        action: "account_created",
        details: "Account CHK-001001 (Everyday Checking) opened",
        ipAddress: "192.168.1.45",
        createdAt: daysAgo(60, 10),
      },
      {
        userId: user.id,
        action: "card_created",
        details: "Virtual Visa Card created for online purchases",
        ipAddress: "192.168.1.45",
        createdAt: daysAgo(30, 16),
      },
    ],
  });

  console.log(
    "Created beneficiaries, a savings goal, scheduled transfer, notifications, budgets and security logs",
  );
  console.log("");
  console.log("  Sign in:   " + DEMO_EMAIL + " / " + DEMO_PASSWORD);
  console.log("  Peer user: " + PEER_EMAIL + " / " + DEMO_PASSWORD);
  console.log("");
  console.log("Seed completed!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
