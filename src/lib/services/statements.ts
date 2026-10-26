/**
 * Account Statements Service.
 *
 * Generates official monthly account statements with opening balance,
 * itemized transactions with running balance, categories, references,
 * total deposits, total withdrawals, fees, interest, and closing balance.
 *
 * Adheres strictly to the money boundary:
 * - All intermediate arithmetic done in integer cents.
 * - Converted to decimal units at the service boundary.
 */

import type { PrismaClient } from "@prisma/client";
import { fromCents } from "@/lib/money";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { fail, ok, type Result, toFailure } from "@/lib/services/result";

export interface StatementTransactionItem {
  id: string;
  date: Date;
  description: string;
  category: string;
  reference: string | null;
  type: string;
  isCredit: boolean; // true if increases balance, false if decreases balance
  amount: number;
  amountCents: number;
  balanceAfter: number;
  balanceAfterCents: number;
  notes?: string | null;
}

export interface AccountStatementData {
  statementId: string;
  generatedAt: Date;
  account: {
    id: string;
    number: string;
    nickname: string | null;
    type: string;
    currency: string;
  };
  user: {
    name: string | null;
    accountNumber: string;
    email: string;
  };
  period: {
    year: number;
    month: number;
    startDate: Date;
    endDate: Date;
    label: string;
  };
  summary: {
    openingBalance: number;
    openingBalanceCents: number;
    totalDeposits: number;
    totalDepositsCents: number;
    totalWithdrawals: number;
    totalWithdrawalsCents: number;
    totalFees: number;
    totalFeesCents: number;
    totalInterest: number;
    totalInterestCents: number;
    netChange: number;
    netChangeCents: number;
    closingBalance: number;
    closingBalanceCents: number;
  };
  transactions: StatementTransactionItem[];
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Signed effect of one ledger row on this account, in cents.
 *
 * Every movement is stored on the account it changed (`accountId`). The
 * counterparty id is a reference only, so a transfer or its fee must not be
 * applied a second time. Credit-card interest is stored as a positive amount
 * but posted by decreasing the balance; other interest is income.
 */
function signedAmountCents(
  type: string,
  amountCents: number,
  accountType: string,
): number {
  const increases =
    type === "interest" && accountType === "credit"
      ? false
      : type === "deposit" || type === "transfer_in" || type === "interest";
  return increases ? amountCents : -amountCents;
}

export async function getAccountStatement(
  userId: string,
  accountId: string,
  year: number,
  month: number, // 1 to 12
  client: PrismaClient = defaultPrisma,
): Promise<Result<AccountStatementData>> {
  try {
    if (month < 1 || month > 12) {
      return fail("validation_error", "Month must be between 1 and 12");
    }

    // Verify account ownership
    const account = await client.account.findUnique({
      where: { id: accountId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            accountNumber: true,
            email: true,
          },
        },
      },
    });

    if (!account || account.userId !== userId) {
      return fail("not_found", "Account not found");
    }

    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));

    // Opening balance is the current balance undone by every later movement
    // on this account. Only rows whose accountId is this account count.
    const transactionsSinceStart = await client.transaction.findMany({
      where: {
        accountId: account.id,
        createdAt: { gte: startDate },
      },
      select: {
        type: true,
        amountCents: true,
      },
    });

    let netChangeSinceStartCents = 0;
    for (const tx of transactionsSinceStart) {
      netChangeSinceStartCents += signedAmountCents(
        tx.type,
        tx.amountCents,
        account.type,
      );
    }

    const openingBalanceCents = account.balanceCents - netChangeSinceStartCents;

    // Transactions within [startDate, endDate) on this account only.
    const monthTransactions = await client.transaction.findMany({
      where: {
        accountId: account.id,
        createdAt: { gte: startDate, lt: endDate },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });

    let runningCents = openingBalanceCents;
    let totalDepositsCents = 0;
    let totalWithdrawalsCents = 0;
    let totalFeesCents = 0;
    let totalInterestCents = 0;

    const items: StatementTransactionItem[] = [];

    for (const tx of monthTransactions) {
      const delta = signedAmountCents(tx.type, tx.amountCents, account.type);
      const isCredit = delta > 0;
      runningCents += delta;

      if (tx.type === "interest") {
        // A charge is a negative interest total, so it is not a deposit and
        // the summary identity (deposits + interest - withdrawals - fees) holds.
        totalInterestCents += delta;
      } else if (isCredit) {
        totalDepositsCents += tx.amountCents;
      } else if (tx.type === "fee") {
        totalFeesCents += tx.amountCents;
      } else {
        totalWithdrawalsCents += tx.amountCents;
      }

      items.push({
        id: tx.id,
        date: tx.createdAt,
        description: tx.description ?? "Transaction",
        category: tx.category,
        reference: tx.reference,
        type: tx.type,
        isCredit,
        amount: fromCents(tx.amountCents),
        amountCents: tx.amountCents,
        balanceAfter: fromCents(runningCents),
        balanceAfterCents: runningCents,
        notes: tx.notes,
      });
    }

    const netChangeCents =
      totalDepositsCents + totalInterestCents - totalWithdrawalsCents - totalFeesCents;
    const closingBalanceCents = openingBalanceCents + netChangeCents;

    const statementId = `STMT-${account.number}-${year}-${String(month).padStart(2, "0")}`;
    const periodLabel = `${MONTH_NAMES[month - 1]} ${year}`;

    return ok({
      statementId,
      generatedAt: new Date(),
      account: {
        id: account.id,
        number: account.number,
        nickname: account.nickname,
        type: account.type,
        currency: "USD",
      },
      user: {
        name: account.user.name,
        accountNumber: account.user.accountNumber,
        email: account.user.email,
      },
      period: {
        year,
        month,
        startDate,
        endDate,
        label: periodLabel,
      },
      summary: {
        openingBalance: fromCents(openingBalanceCents),
        openingBalanceCents,
        totalDeposits: fromCents(totalDepositsCents),
        totalDepositsCents,
        totalWithdrawals: fromCents(totalWithdrawalsCents),
        totalWithdrawalsCents,
        totalFees: fromCents(totalFeesCents),
        totalFeesCents,
        totalInterest: fromCents(totalInterestCents),
        totalInterestCents,
        netChange: fromCents(netChangeCents),
        netChangeCents,
        closingBalance: fromCents(closingBalanceCents),
        closingBalanceCents,
      },
      transactions: items,
    });
  } catch (err) {
    return toFailure(err, "Failed to generate account statement");
  }
}
