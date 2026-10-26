import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getAccountsForUi, getCardsForUi } from "@/lib/queries";
import { CardsPageClient } from "./CardsPageClient";

export default async function CardsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const [cards, accounts] = await Promise.all([
    getCardsForUi(session.user.id),
    getAccountsForUi(session.user.id),
  ]);

  return <CardsPageClient cards={cards} accounts={accounts} />;
}
