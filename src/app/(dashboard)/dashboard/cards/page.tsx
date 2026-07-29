import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CardsPageClient } from "./CardsPageClient";

export default async function CardsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const cards = await prisma.virtualCard.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <CardsPageClient cards={JSON.parse(JSON.stringify(cards))} />
  );
}
