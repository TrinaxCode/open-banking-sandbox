"use client";

import { useState } from "react";
import { useT } from "@/components/ui/LanguageSwitcher";
import { type TransactionType } from "@/lib/domain";
import { movementIncreasesBalance } from "@/lib/interest";
import { CATEGORY_KEYS, TRANSACTION_TYPE_KEYS } from "@/lib/i18n/labels";
import { TransactionDetailModal } from "@/components/transactions/TransactionDetailModal";
import Link from "next/link";
import type { TransactionForUi } from "@/types/ui";

interface TransactionListProps {
  transactions: TransactionForUi[];
}

function isNegativeAmount(transaction: {
  type: string;
  category?: string | null;
}): boolean {
  return !movementIncreasesBalance(transaction);
}

export function TransactionList({ transactions }: TransactionListProps) {
  const { t, format } = useT();
  const [selectedTx, setSelectedTx] = useState<TransactionForUi | null>(null);

  const typeIcons: Record<TransactionType, string> = {
    deposit: "M12 4.5v15m7.5-7.5h-15",
    withdrawal: "M19.5 12h-15",
    transfer_in:
      "M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5",
    transfer_out:
      "M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5",
    interest:
      "M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    fee: "M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z",
  };

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white py-16 text-center shadow-sm dark:border-white/10 dark:bg-zinc-900 dark:shadow-none">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500 dark:bg-white/[0.05] dark:text-zinc-400">
          <svg
            className="h-7 w-7"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"
            />
          </svg>
        </div>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">
          {t("tx.noTransactions")}
        </p>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          {t("tx.noTransactionsDesc")}
        </p>
        <Link
          href="/dashboard/deposit"
          className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 transition-all hover:bg-zinc-50 hover:text-zinc-900 dark:border-white/10 dark:bg-white/[0.06] dark:text-zinc-200 dark:hover:bg-white/[0.1] dark:hover:text-white"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          {t("tx.makeDeposit")}
        </Link>
      </div>
    );
  }

  return (
    <div
      data-testid="transaction-list"
      className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900 dark:shadow-none"
    >
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50/75 dark:border-white/10 dark:bg-white/[0.02]">
            <th
              scope="col"
              className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-600 dark:text-zinc-400"
            >
              {t("tx.date")}
            </th>
            <th
              scope="col"
              className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-600 dark:text-zinc-400"
            >
              {t("tx.description")}
            </th>
            <th
              scope="col"
              className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-600 dark:text-zinc-400"
            >
              {t("tx.amount")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.04]">
          {transactions.map((tx, index) => {
            const isNegative = isNegativeAmount(tx);
            const formatted = format.currency(isNegative ? -tx.amount : tx.amount, {
              signDisplay: "always",
            });
            return (
              <tr
                key={tx.id}
                onClick={() => setSelectedTx(tx)}
                className="group animate-fade-in cursor-pointer transition-colors hover:bg-zinc-50/80 dark:hover:bg-white/[0.04]"
                style={{
                  animationDelay: `${index * 25}ms`,
                  animationFillMode: "backwards",
                }}
              >
                <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  {format.dateTime(tx.createdAt)}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 transition-transform group-hover:scale-105 dark:bg-white/[0.06] dark:text-zinc-300">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d={typeIcons[tx.type]}
                        />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-zinc-900 transition-colors group-hover:text-primary-700 dark:text-zinc-100 dark:group-hover:text-primary-300">
                          {t(TRANSACTION_TYPE_KEYS[tx.type])}
                        </p>
                        {tx.category && tx.category !== "other" && (
                          <span className="rounded-full bg-zinc-100 border border-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-white/[0.08] dark:border-white/5 dark:text-zinc-300">
                            {t(CATEGORY_KEYS[tx.category])}
                          </span>
                        )}
                      </div>
                      {tx.description && (
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate max-w-[200px]">
                          {tx.description}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td
                  className={`whitespace-nowrap px-5 py-4 text-right text-sm font-semibold tabular-nums ${
                    isNegative
                      ? "text-red-700 dark:text-red-400"
                      : "text-emerald-700 dark:text-emerald-400"
                  }`}
                >
                  {formatted}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Official Transaction Receipt Modal */}
      <TransactionDetailModal
        transaction={selectedTx}
        onClose={() => setSelectedTx(null)}
      />
    </div>
  );
}
