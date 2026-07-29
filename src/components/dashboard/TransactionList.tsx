"use client";

import { useT } from "@/components/ui/LanguageSwitcher";
import type { Transaction } from "@prisma/client";
import Link from "next/link";

interface TransactionListProps {
  transactions: Transaction[];
}

function formatAmount(amount: number, type: string): { formatted: string; isNegative: boolean } {
  const isNegative = type === "withdrawal" || type === "transfer_out";
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    signDisplay: "always",
  }).format(isNegative ? -amount : amount);
  return { formatted, isNegative };
}

function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function TransactionList({ transactions }: TransactionListProps) {
  const { t } = useT();

  const typeMeta: Record<string, { icon: string; label: string }> = {
    deposit: { icon: "M12 4.5v15m7.5-7.5h-15", label: t("tx.deposit") },
    withdrawal: { icon: "M19.5 12h-15", label: t("tx.withdrawal") },
    transfer_in: { icon: "M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5", label: t("tx.transferIn") },
    transfer_out: { icon: "M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5", label: t("tx.transferOut") },
  };

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.04] bg-white/[0.01] py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03]">
          <svg className="h-7 w-7 text-white/15" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-white/25">{t("tx.noTransactions")}</p>
        <p className="mt-1 text-xs text-white/15">{t("tx.noTransactionsDesc")}</p>
        <Link
          href="/dashboard/deposit"
          className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-4 py-2 text-xs font-medium text-white/50 transition-all hover:bg-white/[0.08] hover:text-white/80"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {t("tx.makeDeposit")}
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.04]">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-white/[0.04]">
            <th scope="col" className="px-5 py-3.5 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-white/30">{t("tx.date")}</th>
            <th scope="col" className="px-5 py-3.5 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-white/30">{t("tx.description")}</th>
            <th scope="col" className="px-5 py-3.5 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-white/30">{t("tx.amount")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.03]">
          {transactions.map((tx, index) => {
            const { formatted, isNegative } = formatAmount(tx.amount, tx.type);
            const meta = typeMeta[tx.type] ?? typeMeta.deposit;
            return (
              <tr
                key={tx.id}
                className="animate-fade-in transition-colors hover:bg-white/[0.015]"
                style={{ animationDelay: `${index * 25}ms`, animationFillMode: "backwards" }}
              >
                <td className="whitespace-nowrap px-5 py-4 text-sm text-white/40">
                  {formatDate(tx.createdAt)}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/[0.04]">
                      <svg className="h-3.5 w-3.5 text-white/30" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d={meta.icon} />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white/80">{meta.label}</p>
                        {tx.category && tx.category !== "other" && (
                          <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium text-white/40">
                            {t(`category.${tx.category}`)}
                          </span>
                        )}
                      </div>
                      {tx.description && (
                        <p className="text-xs text-white/30 truncate max-w-[200px]">{tx.description}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className={`whitespace-nowrap px-5 py-4 text-right text-sm font-medium tabular-nums ${
                  isNegative ? "text-red-400" : "text-emerald-400"
                }`}>
                  {formatted}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
