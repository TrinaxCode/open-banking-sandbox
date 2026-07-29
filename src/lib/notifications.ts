import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = PrismaClient | Prisma.TransactionClient;

export type NotificationType =
  | "low_balance"
  | "large_tx"
  | "scheduled"
  | "goal"
  | "info";

/** Create an in-app notification for a user. */
export async function notify(
  tx: Tx,
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
): Promise<void> {
  await tx.notification.create({
    data: { userId, type, title, body },
  });
}

/**
 * Emit threshold-based alerts after a balance-changing operation.
 * - Large transaction alert when amount >= user's largeTxThreshold.
 * - Low balance alert when the resulting balance drops below the threshold.
 * Respects per-user notification preferences. Never throws — alerting must
 * not break the underlying financial operation.
 */
export async function emitBalanceAlerts(
  tx: Tx,
  params: {
    userId: string;
    amount: number;
    newBalance: number;
    accountLabel: string;
    isDebit: boolean;
  },
): Promise<void> {
  try {
    const user = await tx.user.findUnique({
      where: { id: params.userId },
      select: {
        notifyLargeTx: true,
        notifyLowBalance: true,
        largeTxThreshold: true,
        lowBalanceThreshold: true,
      },
    });
    if (!user) return;

    if (user.notifyLargeTx && params.amount >= user.largeTxThreshold) {
      await notify(
        tx,
        params.userId,
        "large_tx",
        "Large transaction",
        `A transaction of $${params.amount.toFixed(2)} was made on ${params.accountLabel}.`,
      );
    }

    if (
      params.isDebit &&
      user.notifyLowBalance &&
      params.newBalance < user.lowBalanceThreshold
    ) {
      await notify(
        tx,
        params.userId,
        "low_balance",
        "Low balance",
        `${params.accountLabel} balance is now $${params.newBalance.toFixed(2)}.`,
      );
    }
  } catch {
    // Alerting is best-effort; swallow errors.
  }
}
