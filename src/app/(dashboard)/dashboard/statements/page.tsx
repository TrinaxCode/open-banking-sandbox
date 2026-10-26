import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getAccountsForUi, getStatementForUi } from "@/lib/queries";
import { StatementsClient } from "./StatementsClient";

export default async function StatementsPage({
  searchParams,
}: {
  searchParams?: Promise<{ accountId?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const params = searchParams ? await searchParams : undefined;
  const accounts = await getAccountsForUi(session.user.id);
  const now = new Date();
  const targetAccount =
    (params?.accountId && accounts.find((a) => a.id === params.accountId)) || accounts[0];
  const initialStatement = targetAccount
    ? await getStatementForUi(
        session.user.id,
        targetAccount.id,
        now.getFullYear(),
        now.getMonth() + 1,
      )
    : null;

  return <StatementsClient accounts={accounts} initialStatement={initialStatement} />;
}
