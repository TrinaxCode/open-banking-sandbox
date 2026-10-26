import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getAccountsForUi, getGoalsForUi } from "@/lib/queries";
import { GoalsClient } from "./GoalsClient";

export default async function GoalsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const [goals, accounts] = await Promise.all([
    getGoalsForUi(session.user.id),
    getAccountsForUi(session.user.id),
  ]);

  return <GoalsClient goals={goals} accounts={accounts} />;
}
