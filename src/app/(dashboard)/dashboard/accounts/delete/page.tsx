import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DeleteAccountsClient } from "./DeleteAccountsClient";

export default async function DeleteAccountsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id },
  });

  return (
    <DeleteAccountsClient accounts={JSON.parse(JSON.stringify(accounts))} />
  );
}
