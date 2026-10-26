import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { externalTransferFeeCents } from "@/lib/fees";
import { prisma } from "@/lib/prisma";
import { getAccountsForUi } from "@/lib/queries";
import { TransferPageClient } from "./TransferPageClient";

export default async function TransferPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const [accounts, userPrefs] = await Promise.all([
    getAccountsForUi(session.user.id),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { largeTxThresholdCents: true },
    }),
  ]);

  return (
    <TransferPageClient
      accounts={accounts}
      externalFeeCents={externalTransferFeeCents()}
      largeTxThresholdCents={userPrefs?.largeTxThresholdCents ?? 100_000}
    />
  );
}
