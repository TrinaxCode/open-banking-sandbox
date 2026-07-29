import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfilePageContent } from "@/components/profile/ProfilePageContent";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user) redirect("/login");

  const memberSince = new Intl.DateTimeFormat("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(user.createdAt));

  const accounts = await prisma.account.findMany({
    where: { userId: user.id },
  });
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  return (
    <ProfilePageContent
      userName={user.name ?? ""}
      userEmail={user.email}
      memberSince={memberSince}
      accountNumber={user.accountNumber}
      totalBalance={totalBalance}
      accountCount={accounts.length}
      notifyLowBalance={user.notifyLowBalance}
      notifyLargeTx={user.notifyLargeTx}
      lowBalanceThreshold={user.lowBalanceThreshold}
      largeTxThreshold={user.largeTxThreshold}
    />
  );
}
