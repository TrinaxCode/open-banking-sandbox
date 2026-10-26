import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewAccountPageClient } from "./NewAccountPageClient";

export default async function NewAccountPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const existingTypes = await prisma.account.findMany({
    where: { userId: session.user.id },
    select: { type: true },
  });

  return <NewAccountPageClient usedTypes={existingTypes.map((a) => a.type)} />;
}
