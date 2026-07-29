import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BeneficiariesClient } from "./BeneficiariesClient";

export default async function BeneficiariesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const beneficiaries = await prisma.beneficiary.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <BeneficiariesClient
      beneficiaries={beneficiaries.map((b) => ({
        ...b,
        createdAt: b.createdAt.toISOString(),
      }))}
    />
  );
}
