"use client";

import { WithdrawForm } from "@/components/accounts/WithdrawForm";
import { useT } from "@/components/ui/LanguageSwitcher";
import Link from "next/link";
import type { AccountForUi } from "@/types/ui";

export function WithdrawPageClient({ accounts }: { accounts: AccountForUi[] }) {
  const { t } = useT();

  return (
    <div className="mx-auto max-w-2xl animate-fade-in space-y-8 p-4 sm:p-6 lg:p-8">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors font-medium"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
          {t("common.back")}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">
          {t("withdraw.title")}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 font-medium">
          {t("withdraw.subtitle")}
        </p>
      </div>
      <WithdrawForm accounts={accounts} />
    </div>
  );
}
