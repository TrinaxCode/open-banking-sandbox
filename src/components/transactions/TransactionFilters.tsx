"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/ui/LanguageSwitcher";
import { TransactionList } from "@/components/dashboard/TransactionList";
import { TRANSACTION_CATEGORIES, TRANSACTION_TYPES } from "@/lib/domain";
import { CATEGORY_KEYS, TRANSACTION_TYPE_FILTER_KEYS } from "@/lib/i18n/labels";
import type { TranslationKey } from "@/lib/i18n";
import { downloadCsv } from "@/lib/csv";
import { exportTransactions } from "@/lib/actions";
import type { TransactionForUi } from "@/types/ui";

export interface HistoryFilters {
  type?: string;
  category?: string;
  q?: string;
  from?: string;
  to?: string;
}

interface TransactionsHistoryProps {
  items: TransactionForUi[];
  total: number;
  page: number;
  pageCount: number;
  typeCounts: Record<string, number>;
  filters: HistoryFilters;
}

const TYPE_FILTERS = ["all", ...TRANSACTION_TYPES] as const;
type TypeFilter = (typeof TYPE_FILTERS)[number];

const txTypeLabels: Record<TypeFilter, TranslationKey> = {
  all: "history.all",
  ...TRANSACTION_TYPE_FILTER_KEYS,
};

const SEARCH_DEBOUNCE_MS = 400;

/**
 * Filtering, pagination and export all live in the URL, so the server does the
 * work (indexed queries over the whole history) and any view is shareable.
 */
export function TransactionsHistory({
  items,
  total,
  page,
  pageCount,
  typeCounts,
  filters,
}: TransactionsHistoryProps) {
  const { t } = useT();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(filters.q ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // The debounce effect must not re-run when the server sends new props.
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const activeFilters = Object.values(filters).some(Boolean);

  function hrefFor(next: HistoryFilters, nextPage = 1): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
    }
    if (nextPage > 1) params.set("page", String(nextPage));
    const query = params.toString();
    return query ? `/dashboard/transactions?${query}` : "/dashboard/transactions";
  }

  function apply(next: HistoryFilters, nextPage = 1) {
    startTransition(() => {
      router.replace(hrefFor(next, nextPage), { scroll: false });
    });
  }

  useEffect(() => {
    const currentQuery = filtersRef.current.q ?? "";
    if (search === currentQuery) return;

    const timer = setTimeout(() => {
      apply({ ...filtersRef.current, q: search || undefined });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function handleExport() {
    setIsExporting(true);
    setError(null);

    const formData = new FormData();
    for (const [key, value] of Object.entries(filters)) {
      if (value) formData.set(key, value);
    }

    const result = await exportTransactions(formData);
    setIsExporting(false);

    if (result.error || !result.csv) {
      setError(result.error ?? t("tx.exportError"));
      return;
    }
    downloadCsv(result.csv);
  }

  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Type pills */}
        <div className="flex flex-wrap gap-1.5">
          {TYPE_FILTERS.map((type) => {
            const active = type === "all" ? !filters.type : filters.type === type;
            return (
              <button
                key={type}
                onClick={() =>
                  apply({
                    ...filters,
                    type: type === "all" ? undefined : type,
                  })
                }
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  active
                    ? "bg-zinc-900 text-white dark:bg-white/10 dark:text-white shadow-sm"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 hover:text-zinc-900 dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:bg-white/[0.08] dark:hover:text-white"
                }`}
              >
                {t(txTypeLabels[type])}
                <span className="ml-1.5 text-[10px]">({typeCounts[type] ?? 0})</span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative ml-auto">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500 dark:text-zinc-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="text"
            aria-label={t("tx.search")}
            placeholder={t("tx.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-40 sm:w-48 rounded-lg border border-zinc-200 bg-white py-1.5 pl-9 pr-3 text-xs text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white dark:placeholder:text-zinc-400 dark:focus:border-white/20 transition-colors"
          />
        </div>
      </div>

      {/* Secondary filters: category, date range, export */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filters.category ?? "all"}
          onChange={(e) =>
            apply({
              ...filters,
              category: e.target.value === "all" ? undefined : e.target.value,
            })
          }
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-zinc-400 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white dark:focus:border-white/20"
          aria-label={t("tx.category")}
        >
          <option
            value="all"
            className="bg-white text-zinc-900 dark:bg-[#0a0a0a] dark:text-zinc-200"
          >
            {t("tx.allCategories")}
          </option>
          {TRANSACTION_CATEGORIES.map((c) => (
            <option
              key={c}
              value={c}
              className="bg-white text-zinc-900 dark:bg-[#0a0a0a] dark:text-zinc-200"
            >
              {t(CATEGORY_KEYS[c])}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-400">
          {t("tx.from")}
          <input
            type="date"
            value={filters.from ?? ""}
            onChange={(e) => apply({ ...filters, from: e.target.value || undefined })}
            className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-zinc-400 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white dark:focus:border-white/20"
          />
        </label>
        <label className="flex items-center gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-400">
          {t("tx.to")}
          <input
            type="date"
            value={filters.to ?? ""}
            onChange={(e) => apply({ ...filters, to: e.target.value || undefined })}
            className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-zinc-400 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white dark:focus:border-white/20"
          />
        </label>

        {activeFilters && (
          <button
            onClick={() => {
              setSearch("");
              apply({});
            }}
            className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-200 hover:text-zinc-900 dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:bg-white/[0.08] dark:hover:text-white"
          >
            {t("tx.reset")}
          </button>
        )}

        <button
          onClick={handleExport}
          disabled={isExporting || total === 0}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-transparent dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:bg-white/[0.08] dark:hover:text-white"
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
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
            />
          </svg>
          {isExporting ? t("tx.exporting") : t("tx.export")}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-700 dark:text-premium-coral">
          {error}
        </div>
      )}

      {/* Results */}
      <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
        {t("tx.showing")
          .replace("{0}", String(items.length))
          .replace("{1}", String(total))}
        {isPending && <span className="ml-2 text-zinc-600 dark:text-zinc-400">…</span>}
      </p>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center dark:border-white/[0.04] dark:bg-white/[0.01]">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{t("tx.noResults")}</p>
        </div>
      ) : (
        <TransactionList transactions={items} />
      )}

      {pageCount > 1 && (
        <div className="flex items-center justify-between gap-3 pt-1">
          <button
            onClick={() => apply(filters, page - 1)}
            disabled={page <= 1}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-30 dark:border-transparent dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:bg-white/[0.08] dark:hover:text-white"
          >
            {t("tx.previous")}
          </button>
          <span className="text-[11px] text-zinc-600 dark:text-zinc-400">
            {t("tx.page").replace("{0}", String(page)).replace("{1}", String(pageCount))}
          </span>
          <button
            onClick={() => apply(filters, page + 1)}
            disabled={page >= pageCount}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-30 dark:border-transparent dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:bg-white/[0.08] dark:hover:text-white"
          >
            {t("tx.next")}
          </button>
        </div>
      )}
    </div>
  );
}
