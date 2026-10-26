import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getAccountsForUi } from "@/lib/queries";
import { DeleteAccountsClient } from "./DeleteAccountsClient";

export default async function DeleteAccountsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const accounts = await getAccountsForUi(session.user.id);

  return <DeleteAccountsClient accounts={accounts} />;
}
