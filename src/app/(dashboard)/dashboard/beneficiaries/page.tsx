import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getBeneficiariesForUi } from "@/lib/queries";
import { BeneficiariesClient } from "./BeneficiariesClient";

export default async function BeneficiariesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const beneficiaries = await getBeneficiariesForUi(session.user.id);

  return <BeneficiariesClient beneficiaries={beneficiaries} />;
}
