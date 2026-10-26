import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getAccountDetailForUi } from "@/lib/queries";
import { AccountDetailClient } from "@/components/accounts/AccountDetailClient";

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const account = await getAccountDetailForUi(session.user.id, id);
  if (!account) notFound();

  return <AccountDetailClient account={account} />;
}
