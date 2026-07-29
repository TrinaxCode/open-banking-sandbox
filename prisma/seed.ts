import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { categorize } from "../src/lib/categorize";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clean existing data
  await prisma.notification.deleteMany();
  await prisma.recurringTransfer.deleteMany();
  await prisma.savingsGoal.deleteMany();
  await prisma.beneficiary.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  // Create demo user
  const passwordHash = await bcrypt.hash("demo-password", 10);

  const user = await prisma.user.create({
    data: {
      email: "demo@banking.app",
      name: "Demo User",
      passwordHash,
      accountNumber: "ACC-1001",
    },
  });

  console.log(`Created demo user: ${user.email}`);

  // Create accounts
  const checkingAccount = await prisma.account.create({
    data: {
      userId: user.id,
      type: "checking",
      number: "CHK-1001",
      balance: 5240.75,
    },
  });

  const savingsAccount = await prisma.account.create({
    data: {
      userId: user.id,
      type: "savings",
      number: "SAV-1001",
      balance: 12750.0,
      interestRate: 3.5,
    },
  });

  console.log(`Created ${2} accounts`);

  // Create transactions
  const transactions = [
    {
      userId: user.id,
      accountId: checkingAccount.id,
      type: "deposit" as const,
      amount: 5000.0,
      description: "Direct deposit - Salary",
      status: "completed",
      createdAt: new Date("2026-06-01"),
    },
    {
      userId: user.id,
      accountId: checkingAccount.id,
      type: "withdrawal" as const,
      amount: 1500.0,
      description: "Rent payment",
      status: "completed",
      createdAt: new Date("2026-06-03"),
    },
    {
      userId: user.id,
      accountId: checkingAccount.id,
      type: "withdrawal" as const,
      amount: 89.99,
      description: "Electric bill",
      status: "completed",
      createdAt: new Date("2026-06-05"),
    },
    {
      userId: user.id,
      accountId: checkingAccount.id,
      type: "deposit" as const,
      amount: 250.0,
      description: "Freelance payment",
      status: "completed",
      createdAt: new Date("2026-06-08"),
    },
    {
      userId: user.id,
      accountId: checkingAccount.id,
      type: "withdrawal" as const,
      amount: 45.0,
      description: "Coffee shop",
      status: "completed",
      createdAt: new Date("2026-06-10"),
    },
    {
      userId: user.id,
      accountId: checkingAccount.id,
      type: "withdrawal" as const,
      amount: 120.0,
      description: "Groceries",
      status: "completed",
      createdAt: new Date("2026-06-12"),
    },
    {
      userId: user.id,
      accountId: savingsAccount.id,
      type: "deposit" as const,
      amount: 1000.0,
      description: "Transfer to savings",
      status: "completed",
      createdAt: new Date("2026-06-02"),
    },
    {
      userId: user.id,
      accountId: savingsAccount.id,
      type: "deposit" as const,
      amount: 500.0,
      description: "Savings deposit",
      status: "completed",
      createdAt: new Date("2026-06-15"),
    },
    {
      userId: user.id,
      accountId: checkingAccount.id,
      type: "withdrawal" as const,
      amount: 60.0,
      description: "Internet bill",
      status: "completed",
      createdAt: new Date("2026-06-16"),
    },
    {
      userId: user.id,
      accountId: checkingAccount.id,
      type: "deposit" as const,
      amount: 5000.0,
      description: "Direct deposit - Salary",
      status: "completed",
      createdAt: new Date("2026-06-18"),
    },
  ];

  for (const tx of transactions) {
    // Auto-assign a spending category from the description.
    await prisma.transaction.create({
      data: { ...tx, category: categorize(tx.type, tx.description) },
    });
  }

  console.log(`Created ${transactions.length} transactions`);

  // Beneficiaries
  await prisma.beneficiary.createMany({
    data: [
      { userId: user.id, name: "Alice Johnson", accountNumber: "CHK-AB12CD", nickname: "Roommate" },
      { userId: user.id, name: "Bob's Plumbing", accountNumber: "CHK-99XY00", nickname: null },
    ],
  });

  // Savings goal (linked to savings account)
  await prisma.savingsGoal.create({
    data: {
      userId: user.id,
      accountId: savingsAccount.id,
      name: "Emergency Fund",
      targetAmount: 10000,
      currentAmount: 3500,
      color: "emerald",
      deadline: new Date("2026-12-31"),
    },
  });

  // Scheduled recurring transfer (monthly to savings)
  await prisma.recurringTransfer.create({
    data: {
      userId: user.id,
      fromAccountId: checkingAccount.id,
      targetAccountNumber: savingsAccount.number,
      amount: 500,
      frequency: "monthly",
      description: "Monthly savings",
      nextRunAt: new Date("2026-07-01"),
    },
  });

  // Welcome notification
  await prisma.notification.create({
    data: {
      userId: user.id,
      type: "info",
      title: "Welcome to Trinax Bank",
      body: "Explore analytics, savings goals, beneficiaries and scheduled transfers.",
    },
  });

  console.log("Created beneficiaries, a savings goal, a scheduled transfer, and a notification");
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
