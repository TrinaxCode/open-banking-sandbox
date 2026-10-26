"use client";

import { TransferForm } from "@/components/accounts/TransferForm";
import { useT } from "@/components/ui/LanguageSwitcher";
import Link from "next/link";
import type { AccountForUi } from "@/types/ui";

export function TransferPageClient({
  accounts,
  externalFeeCents,
  largeTxThresholdCents = 100_000,
}: {
  accounts: AccountForUi[];
  externalFeeCents: number;
  largeTxThresholdCents?: number;
}) {
  const { t } = useT();

  if (accounts.length === 0) {
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
            {t("transfer.title")}
          </h1>
          <div className="mt-4 rounded-2xl border border-zinc-200 bg-white/80 dark:border-white/[0.08] dark:bg-white/[0.02] p-6 text-center shadow-sm dark:shadow-none">
            <p className="text-sm text-zinc-700 dark:text-zinc-300 font-medium">
              {t("transfer.needTwoAccounts")}
            </p>
            <Link
              href="/dashboard/accounts/new"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 transition-colors group"
            >
              <span>{t("dashboard.openAccount")}</span>
              <svg
                className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
          {t("transfer.title")}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 font-medium">
          {t("transfer.subtitle")}
        </p>
      </div>
      <TransferForm
        accounts={accounts}
        externalFeeCents={externalFeeCents}
        largeTxThresholdCents={largeTxThresholdCents}
      />
    </div>
  );
}
