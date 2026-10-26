import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { externalTransferFeeCents } from "@/lib/fees";
import { getAccountsForUi, getScheduledForUi } from "@/lib/queries";
import { ScheduledClient } from "./ScheduledClient";

export default async function ScheduledPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const [transfers, accounts] = await Promise.all([
    getScheduledForUi(session.user.id),
    getAccountsForUi(session.user.id),
  ]);

  return (
    <ScheduledClient
      transfers={transfers}
      accounts={accounts}
      externalFeeCents={externalTransferFeeCents()}
    />
  );
}
