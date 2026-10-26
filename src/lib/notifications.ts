import type { Prisma, PrismaClient } from "@prisma/client";
import { formatCents } from "@/lib/money";
import type { NotificationType } from "@/lib/domain";

type Tx = PrismaClient | Prisma.TransactionClient;

export type { NotificationType };

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
 * - Large transaction alert when the amount reaches the user's threshold.
 * - Low balance alert when the resulting balance drops below the threshold.
 * Respects per-user notification preferences. Never throws — alerting must
 * not break the underlying financial operation.
 */
export async function emitBalanceAlerts(
  tx: Tx,
  params: {
    userId: string;
    amountCents: number;
    newBalanceCents: number;
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
        largeTxThresholdCents: true,
        lowBalanceThresholdCents: true,
      },
    });
    if (!user) return;

    if (user.notifyLargeTx && params.amountCents >= user.largeTxThresholdCents) {
      await notify(
        tx,
        params.userId,
        "large_tx",
        "Large transaction",
        `A transaction of ${formatCents(params.amountCents)} was made on ${params.accountLabel}.`,
      );
    }

    if (
      params.isDebit &&
      user.notifyLowBalance &&
      params.newBalanceCents < user.lowBalanceThresholdCents
    ) {
      await notify(
        tx,
        params.userId,
        "low_balance",
        "Low balance",
        `${params.accountLabel} balance is now ${formatCents(params.newBalanceCents)}.`,
      );
    }
  } catch {
    // Alerting is best-effort; swallow errors.
  }
}
