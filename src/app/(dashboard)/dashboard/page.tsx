import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const data = await getDashboardData(session.user.id);
  if (!data) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a]">
      <DashboardClient
        userName={data.name?.split(" ")[0] ?? "User"}
        totalBalance={data.totalBalance}
        previousBalance={data.totalBalance * 0.9}
        accounts={JSON.parse(JSON.stringify(data.accounts))}
        transactions={JSON.parse(JSON.stringify(data.transactions))}
      />
    </div>
  );
}
