import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getBudgetsForUi } from "@/lib/queries";
import { BudgetsClient } from "./BudgetsClient";

export default async function BudgetsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const summary = await getBudgetsForUi(session.user.id);

  return <BudgetsClient initialSummary={summary} />;
}
