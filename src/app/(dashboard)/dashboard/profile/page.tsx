import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getProfileForUi, getSecurityLogsForUi } from "@/lib/queries";
import { ProfilePageContent } from "@/components/profile/ProfilePageContent";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const [profile, securityLogs] = await Promise.all([
    getProfileForUi(session.user.id),
    getSecurityLogsForUi(session.user.id, 20),
  ]);
  if (!profile) redirect("/login");

  return (
    <ProfilePageContent
      userName={profile.name ?? ""}
      userEmail={profile.email}
      createdAt={profile.createdAt}
      accountNumber={profile.accountNumber}
      totalBalance={profile.totalBalance}
      accountCount={profile.accountCount}
      notifyLowBalance={profile.notifyLowBalance}
      notifyLargeTx={profile.notifyLargeTx}
      lowBalanceThreshold={profile.lowBalanceThreshold}
      largeTxThreshold={profile.largeTxThreshold}
      securityLogs={securityLogs}
    />
  );
}
