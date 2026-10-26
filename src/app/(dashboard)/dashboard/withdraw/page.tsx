import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getAccountsForUi } from "@/lib/queries";
import { WithdrawPageClient } from "./WithdrawPageClient";

export default async function WithdrawPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const accounts = await getAccountsForUi(session.user.id);

  return <WithdrawPageClient accounts={accounts} />;
}
