import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { ScheduledClient } from "./ScheduledClient";

export default async function ScheduledPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const [transfers, accounts] = await Promise.all([
    prisma.recurringTransfer.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.account.findMany({
      where: { userId: session.user.id },
    }),
  ]);

  return (
    <ScheduledClient
      transfers={transfers.map((tr) => ({
        ...tr,
        createdAt: tr.createdAt.toISOString(),
        nextRunAt: tr.nextRunAt.toISOString(),
        lastRunAt: tr.lastRunAt ? tr.lastRunAt.toISOString() : null,
      }))}
      accounts={serialize(accounts)}
    />
  );
}
