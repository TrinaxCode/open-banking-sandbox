"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useT } from "@/components/ui/LanguageSwitcher";
import { formatCurrency, formatDate } from "@/lib/i18n/format";
import { accountTypeKey } from "@/lib/i18n/labels";
import type { AccountForUi } from "@/types/ui";
import type { AccountStatementData } from "@/lib/services/statements";

interface StatementsClientProps {
  accounts: AccountForUi[];
  initialStatement: AccountStatementData | null;
}

export function StatementsClient({ accounts, initialStatement }: StatementsClientProps) {
  const { t, locale } = useT();
  const [statement, setStatement] = useState<AccountStatementData | null>(
    initialStatement,
  );
  const [selectedAccountId, setSelectedAccountId] = useState(
    initialStatement?.account.id ?? accounts[0]?.id ?? "",
  );

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Available months: past 12 months
  const monthOptions: Array<{ year: number; month: number; label: string }> = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yr = d.getFullYear();
    const mo = d.getMonth() + 1;
    const label = d.toLocaleString(locale === "es" ? "es-ES" : "en-US", {
      month: "long",
      year: "numeric",
    });
    monthOptions.push({ year: yr, month: mo, label });
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAccountId) return;
    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/statement?accountId=${selectedAccountId}&year=${selectedYear}&month=${selectedMonth}`,
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error || t("statements.error"));
          return;
        }
        const data = await res.json();
        setStatement(data.statement);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("statements.error"));
      }
    });
  }

  function handlePrint() {
    window.print();
  }

  function handleExportCsv() {
    if (!statement) return;
    const escapeCsv = (val: string) =>
      val.includes(",") || val.includes('"') || val.includes("\n")
        ? `"${val.replace(/"/g, '""')}"`
        : val;

    const header = [
      "Date",
      "Type",
      "Description",
      "Notes",
      "Reference",
      "SignedAmountUSD",
      "RunningBalanceUSD",
    ].join(",");

    const rows = statement.transactions.map((tx) => {
      const signed = (tx.isCredit ? tx.amount : -tx.amount).toFixed(2);
      const running = tx.balanceAfter.toFixed(2);
      const dateStr =
        typeof tx.date === "string" ? tx.date : new Date(tx.date).toISOString();
      return [
        escapeCsv(dateStr),
        escapeCsv(tx.type),
        escapeCsv(tx.description),
        escapeCsv(tx.notes ?? ""),
        escapeCsv(tx.reference ?? tx.id.slice(-8).toUpperCase()),
        signed,
        running,
      ].join(",");
    });

    const csvContent = [header, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `statement-${statement.account.number.toLowerCase()}-${statement.period.year}-${String(statement.period.month).padStart(2, "0")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleExportJson() {
    if (!statement) return;
    const blob = new Blob([JSON.stringify(statement, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `statement-${statement.account.number.toLowerCase()}-${statement.period.year}-${String(statement.period.month).padStart(2, "0")}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Controls — hidden in print */}
      <div className="print:hidden space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              {t("statements.title")}
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {t("statements.subtitle")}
            </p>
          </div>
          {statement && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {t("statements.exportCsv")}
              </button>
              <button
                type="button"
                onClick={handleExportJson}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {t("statements.exportJson")}
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.72 13.829c-.24-1.076-.672-2.115-1.284-3.08a8.97 8.97 0 00-2.316-2.527m16.88 0a8.97 8.97 0 00-2.316 2.527c-.612.965-1.044 2.004-1.284 3.08m-11.96 0c.24 1.076.672 2.115 1.284 3.08a8.97 8.97 0 002.316 2.527m8.36 0a8.97 8.97 0 002.316-2.527c.612-.965 1.044-2.004 1.284-3.08m-11.96 0h11.96"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.75 6.75h10.5a2.25 2.25 0 012.25 2.25v7.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 16.5v-7.5a2.25 2.25 0 012.25-2.25z"
                  />
                </svg>
                {t("statements.print")}
              </button>
            </div>
          )}
        </div>

        {/* Filter Selection Card */}
        <form
          onSubmit={handleGenerate}
          className="rounded-2xl border border-zinc-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="statement-account"
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
              >
                {t("statements.selectAccount")}
              </label>
              <select
                id="statement-account"
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="mt-1.5 block w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-white/10 dark:bg-zinc-800 dark:text-white"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.nickname ? `${acc.nickname} (${acc.number})` : acc.number} —{" "}
                    {formatCurrency(acc.balance, locale)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="statement-period"
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
              >
                {t("statements.selectPeriod")}
              </label>
              <select
                id="statement-period"
                value={`${selectedYear}-${selectedMonth}`}
                onChange={(e) => {
                  const parts = e.target.value.split("-").map(Number);
                  const y = parts[0];
                  const m = parts[1];
                  if (
                    y !== undefined &&
                    m !== undefined &&
                    !Number.isNaN(y) &&
                    !Number.isNaN(m)
                  ) {
                    setSelectedYear(y);
                    setSelectedMonth(m);
                  }
                }}
                className="mt-1.5 block w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-white/10 dark:bg-zinc-800 dark:text-white"
              >
                {monthOptions.map((opt) => (
                  <option
                    key={`${opt.year}-${opt.month}`}
                    value={`${opt.year}-${opt.month}`}
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={isPending || !selectedAccountId}
                className="w-full rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600 disabled:opacity-50"
              >
                {isPending ? "..." : t("statements.generate")}
              </button>
            </div>
          </div>
          {error && (
            <div className="mt-3 text-xs font-medium text-rose-700 dark:text-rose-400">
              {error}
            </div>
          )}
        </form>
      </div>

      {/* Statement Document View */}
      {statement && (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-10 dark:border-white/10 dark:bg-zinc-900 print:m-0 print:border-none print:p-0 print:shadow-none print:text-black">
          {/* Statement Header */}
          <div className="flex flex-col justify-between border-b border-zinc-200 pb-6 sm:flex-row sm:items-start dark:border-white/10 print:border-zinc-300">
            <div className="flex items-center gap-3.5">
              <Image
                src="/logo.webp"
                alt="Trinax Bank"
                width={48}
                height={48}
                className="rounded-xl print:h-10 print:w-10"
              />
              <div>
                <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white print:text-black">
                  {t("statements.institution")}
                </h2>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 print:text-zinc-600">
                  Sandboxed Open Banking Network
                </p>
              </div>
            </div>

            <div className="mt-4 text-left sm:mt-0 sm:text-right">
              <span className="inline-block rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-zinc-700 dark:bg-white/10 dark:text-zinc-300 print:border print:border-zinc-300">
                {t("statements.statementId")}: {statement.statementId}
              </span>
              <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-white print:text-black">
                {statement.period.label}
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 print:text-zinc-600">
                {t("statements.date")}:{" "}
                {formatDate(statement.generatedAt.toISOString(), locale)}
              </p>
            </div>
          </div>

          {/* Customer & Account Details */}
          <div className="mt-6 grid grid-cols-1 gap-6 border-b border-zinc-200 pb-6 sm:grid-cols-2 dark:border-white/10 print:border-zinc-300">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 print:text-zinc-600">
                {t("statements.accountHolder")}
              </span>
              <h3 className="mt-1 text-base font-bold text-zinc-900 dark:text-white print:text-black">
                {statement.user.name || "Trinax Customer"}
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 print:text-zinc-600">
                {t("statements.customerId")} {statement.user.accountNumber}
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 print:text-zinc-600">
                {statement.user.email}
              </p>
            </div>

            <div className="sm:text-right">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 print:text-zinc-600">
                {t("statements.accountDetails")}
              </span>
              <h3 className="mt-1 text-base font-bold text-zinc-900 dark:text-white print:text-black">
                {statement.account.nickname
                  ? `${statement.account.nickname} (${statement.account.number})`
                  : statement.account.number}
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 print:text-zinc-600">
                {t("statements.typeLabel")}{" "}
                {t(accountTypeKey(statement.account.type)).toUpperCase()} |{" "}
                {t("statements.currencyLabel")} {statement.account.currency}
              </p>
            </div>
          </div>

          {/* Financial Summary Box */}
          <div className="my-6 rounded-xl border border-zinc-100 bg-zinc-50 p-5 dark:border-white/5 dark:bg-zinc-800/40 print:border-zinc-200 print:bg-zinc-50">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 print:text-zinc-600">
              {t("statements.summaryTitle")}
            </h4>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
              <div>
                <span className="text-xs text-zinc-600 dark:text-zinc-400 print:text-zinc-600">
                  {t("statements.openingBalance")}
                </span>
                <p className="text-sm font-bold text-zinc-900 dark:text-white print:text-black">
                  {formatCurrency(statement.summary.openingBalance, locale)}
                </p>
              </div>
              <div>
                <span className="text-xs text-zinc-600 dark:text-zinc-400 print:text-zinc-600">
                  {t("statements.depositsCredits")}
                </span>
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 print:text-emerald-700">
                  +{formatCurrency(statement.summary.totalDeposits, locale)}
                </p>
              </div>
              <div>
                <span className="text-xs text-zinc-600 dark:text-zinc-400 print:text-zinc-600">
                  {t("statements.withdrawalsDebits")}
                </span>
                <p className="text-sm font-bold text-rose-700 dark:text-rose-400 print:text-rose-700">
                  -{formatCurrency(statement.summary.totalWithdrawals, locale)}
                </p>
              </div>
              <div>
                <span className="text-xs text-zinc-600 dark:text-zinc-400 print:text-zinc-600">
                  {t("statements.feesCharged")}
                </span>
                <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300 print:text-zinc-800">
                  {formatCurrency(statement.summary.totalFees, locale)}
                </p>
              </div>
              <div>
                <span className="text-xs text-zinc-600 dark:text-zinc-400 print:text-zinc-600">
                  {t("statements.interestEarned")}
                </span>
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 print:text-emerald-700">
                  {formatCurrency(statement.summary.totalInterest, locale)}
                </p>
              </div>
              <div>
                <span className="text-xs text-zinc-600 dark:text-zinc-400 print:text-zinc-600">
                  {t("statements.netChange")}
                </span>
                <p
                  className={`text-sm font-bold ${statement.summary.netChange >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}
                >
                  {statement.summary.netChange >= 0 ? "+" : ""}
                  {formatCurrency(statement.summary.netChange, locale)}
                </p>
              </div>
              <div>
                <span className="text-xs text-zinc-600 dark:text-zinc-400 print:text-zinc-600">
                  {t("statements.closingBalance")}
                </span>
                <p className="text-sm font-bold text-zinc-950 dark:text-white print:text-black">
                  {formatCurrency(statement.summary.closingBalance, locale)}
                </p>
              </div>
            </div>
          </div>

          {/* Itemized Transactions Table */}
          <div className="mt-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 print:text-zinc-600">
              {t("statements.ledgerTitle")}
            </h4>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-600 dark:border-white/10 dark:text-zinc-400 print:border-zinc-300 print:text-zinc-700">
                    <th className="py-2.5 pr-3 font-semibold">{t("statements.date")}</th>
                    <th className="py-2.5 px-3 font-semibold">
                      {t("statements.description")}
                    </th>
                    <th className="py-2.5 px-3 font-semibold">
                      {t("statements.reference")}
                    </th>
                    <th className="py-2.5 px-3 text-right font-semibold">
                      {t("statements.amount")}
                    </th>
                    <th className="py-2.5 pl-3 text-right font-semibold">
                      {t("statements.runningBalance")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-white/5 print:divide-zinc-200">
                  {statement.transactions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 text-center text-zinc-600 dark:text-zinc-400"
                      >
                        {t("statements.noTransactions")}
                      </td>
                    </tr>
                  ) : (
                    statement.transactions.map((tx) => (
                      <tr
                        key={tx.id}
                        className="hover:bg-zinc-50/50 dark:hover:bg-white/[0.02]"
                      >
                        <td className="py-3 pr-3 text-zinc-600 dark:text-zinc-400 print:text-zinc-800">
                          {formatDate(tx.date.toISOString(), locale)}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-medium text-zinc-900 dark:text-white print:text-black">
                            {tx.description}
                          </span>
                          {tx.notes && (
                            <span className="block text-[11px] text-zinc-600 dark:text-zinc-400">
                              {t("statements.notePrefix")} {tx.notes}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-zinc-600 dark:text-zinc-400 font-mono text-[11px]">
                          {tx.reference ?? "—"}
                        </td>
                        <td
                          className={`py-3 px-3 text-right font-semibold ${
                            tx.isCredit
                              ? "text-emerald-700 dark:text-emerald-400 print:text-emerald-700"
                              : "text-zinc-900 dark:text-white print:text-black"
                          }`}
                        >
                          {tx.isCredit ? "+" : "-"}
                          {formatCurrency(tx.amount, locale)}
                        </td>
                        <td className="py-3 pl-3 text-right font-medium text-zinc-900 dark:text-white print:text-black">
                          {formatCurrency(tx.balanceAfter, locale)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Statement Disclaimer Footer */}
          <div className="mt-10 border-t border-zinc-200 pt-6 text-center text-xs text-zinc-600 dark:border-white/10 dark:text-zinc-400 print:border-zinc-300 print:text-zinc-500">
            <p>{t("statements.officialNotice")}</p>
            <p className="mt-1">
              Trinax Bank Inc. • Member FDIC Simulation • Equal Housing Lender
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
