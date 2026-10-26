"use client";

import { TransactionsHistory } from "@/components/transactions/TransactionFilters";
import { useT } from "@/components/ui/LanguageSwitcher";
import Link from "next/link";
import type { TransactionForUi } from "@/types/ui";

export function TransactionsPageClient({
  items,
  total,
  page,
  pageCount,
  typeCounts,
  filters,
}: {
  items: TransactionForUi[];
  total: number;
  page: number;
  pageCount: number;
  typeCounts: Record<string, number>;
  filters: Record<string, string | undefined>;
}) {
  const { t } = useT();

  return (
    <div className="animate-fade-in space-y-6 p-4 pt-8 sm:p-8 lg:p-10 max-w-6xl mx-auto w-full">
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
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
          {t("history.title")}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 font-medium">
          {t("history.subtitle")}
        </p>
      </div>
      <TransactionsHistory
        items={items}
        total={total}
        page={page}
        pageCount={pageCount}
        typeCounts={typeCounts}
        filters={filters}
      />
    </div>
  );
}
