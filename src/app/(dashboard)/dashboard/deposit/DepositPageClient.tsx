"use client";

import { DepositForm } from "@/components/accounts/DepositForm";
import { useT } from "@/components/ui/LanguageSwitcher";
import Link from "next/link";
import type { Account } from "@prisma/client";

export function DepositPageClient({ accounts }: { accounts: Account[] }) {
  const { t } = useT();

  return (
    <div className="mx-auto max-w-2xl animate-fade-in space-y-8 p-4 sm:p-6 lg:p-8">
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
          {t("common.back")}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">{t("deposit.title")}</h1>
        <p className="mt-1 text-sm text-white/30">{t("deposit.subtitle")}</p>
      </div>
      <DepositForm accounts={accounts} />
    </div>
  );
}
