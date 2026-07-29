"use client";

import { useState, useMemo } from "react";
import type { Transaction } from "@prisma/client";
import { useT } from "@/components/ui/LanguageSwitcher";
import { TransactionList } from "@/components/dashboard/TransactionList";
import { TRANSACTION_CATEGORIES } from "@/lib/validations";
import { exportTransactionsCsv } from "@/lib/csv";

interface TransactionFiltersProps {
  transactions: Transaction[];
}

const TX_TYPES = ["all", "deposit", "withdrawal", "transfer_in", "transfer_out"];

const txTypeLabels: Record<string, string> = {
  all: "history.all",
  deposit: "tx.deposits",
  withdrawal: "tx.withdrawals",
  transfer_in: "tx.transfersIn",
  transfer_out: "tx.transfersOut",
};

export function TransactionFilters({ transactions }: TransactionFiltersProps) {
  const { t } = useT();
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filtered = useMemo(() => {
    const fromTs = fromDate ? new Date(fromDate).getTime() : null;
    // Include the whole "to" day by adding 24h.
    const toTs = toDate ? new Date(toDate).getTime() + 86_400_000 : null;
    return transactions.filter((tx) => {
      if (typeFilter !== "all" && tx.type !== typeFilter) return false;
      if (categoryFilter !== "all" && (tx.category || "other") !== categoryFilter)
        return false;
      const ts = new Date(tx.createdAt).getTime();
      if (fromTs !== null && ts < fromTs) return false;
      if (toTs !== null && ts >= toTs) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const desc = (tx.description ?? "").toLowerCase();
        const ref = (tx.reference ?? "").toLowerCase();
        if (!desc.includes(q) && !ref.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, typeFilter, categoryFilter, searchQuery, fromDate, toDate]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: transactions.length };
    TX_TYPES.filter((t) => t !== "all").forEach((type) => {
      c[type] = transactions.filter((tx) => tx.type === type).length;
    });
    return c;
  }, [transactions]);

  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Type pills */}
        <div className="flex flex-wrap gap-1.5">
          {TX_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                typeFilter === type
                  ? "bg-white/10 text-white"
                  : "bg-white/[0.03] text-white/40 hover:bg-white/[0.06] hover:text-white/60"
              }`}
            >
              {t(txTypeLabels[type])}
              <span className="ml-1.5 text-[10px] opacity-60">({counts[type] ?? 0})</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative ml-auto">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/20" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder={t("tx.search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-40 rounded-lg border border-white/[0.06] bg-white/[0.03] py-1.5 pl-9 pr-3 text-xs text-white/70 placeholder:text-white/20 focus:outline-none focus:border-white/10 transition-colors"
          />
        </div>
      </div>

      {/* Secondary filters: category, date range, export */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs text-white/70 focus:outline-none focus:border-white/10"
          aria-label={t("tx.category")}
        >
          <option value="all" className="bg-[#0a0a0a]">{t("tx.allCategories")}</option>
          {TRANSACTION_CATEGORIES.map((c) => (
            <option key={c} value={c} className="bg-[#0a0a0a]">
              {t(`category.${c}`)}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-1.5 text-[11px] text-white/30">
          {t("tx.from")}
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-1.5 text-xs text-white/70 focus:outline-none focus:border-white/10"
          />
        </label>
        <label className="flex items-center gap-1.5 text-[11px] text-white/30">
          {t("tx.to")}
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-1.5 text-xs text-white/70 focus:outline-none focus:border-white/10"
          />
        </label>

        {(categoryFilter !== "all" || fromDate || toDate || typeFilter !== "all" || searchQuery) && (
          <button
            onClick={() => {
              setTypeFilter("all");
              setCategoryFilter("all");
              setSearchQuery("");
              setFromDate("");
              setToDate("");
            }}
            className="rounded-lg bg-white/[0.03] px-3 py-1.5 text-xs text-white/40 hover:bg-white/[0.06] hover:text-white/60"
          >
            {t("tx.reset")}
          </button>
        )}

        <button
          onClick={() => exportTransactionsCsv(filtered)}
          disabled={filtered.length === 0}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/60 transition-all hover:bg-white/[0.08] hover:text-white/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          {t("tx.export")}
        </button>
      </div>

      {/* Results */}
      <p className="text-[11px] text-white/20">
        {t("tx.showing").replace("{0}", String(filtered.length)).replace("{1}", String(transactions.length))}
      </p>

      <TransactionList transactions={filtered} />
    </div>
  );
}
