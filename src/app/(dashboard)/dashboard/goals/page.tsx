import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { GoalsClient } from "./GoalsClient";
import type { ComponentProps } from "react";

type GoalsClientProps = ComponentProps<typeof GoalsClient>;

export default async function GoalsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const [goals, accounts] = await Promise.all([
    prisma.savingsGoal.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.account.findMany({
      where: { userId: session.user.id },
    }),
  ]);

  return (
    <GoalsClient
      goals={serialize(goals) as unknown as GoalsClientProps["goals"]}
      accounts={serialize(accounts) as unknown as GoalsClientProps["accounts"]}
    />
  );
}
