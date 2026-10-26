"use client";

import { BalanceChart } from "@/components/dashboard/BalanceChart";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { AccountList } from "@/components/dashboard/AccountList";
import { TransactionList } from "@/components/dashboard/TransactionList";
import { useT } from "@/components/ui/LanguageSwitcher";
import Link from "next/link";
import type { AccountForUi, TransactionForUi } from "@/types/ui";

interface DashboardClientProps {
  userName: string;
  totalBalance: number;
  previousBalance: number;
  accounts: AccountForUi[];
  transactions: TransactionForUi[];
  chartTransactions?: TransactionForUi[];
}

export function DashboardClient({
  userName,
  totalBalance,
  previousBalance,
  accounts,
  transactions,
  chartTransactions,
}: DashboardClientProps) {
  const { t, format } = useT();

  return (
    <main className="flex-1 space-y-10 p-4 pt-6 sm:p-8 lg:p-10 max-w-6xl mx-auto w-full">
      <div className="animate-fade-in space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
          {t("dashboard.welcome")}, {userName}
        </h1>
        <p className="text-sm text-zinc-600 font-normal dark:text-zinc-400">
          {t("dashboard.subtitle")}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <BalanceChart
            balance={totalBalance}
            previousBalance={previousBalance}
            transactions={chartTransactions ?? transactions}
          />
        </div>
        <div className="lg:col-span-1">
          <QuickActions />
        </div>
      </div>

      <section className="animate-slide-up space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
              {t("dashboard.accounts")}
            </h2>
            <p className="text-xs text-zinc-600 font-medium dark:text-zinc-400">
              {accounts.length} · {format.currency(totalBalance)}
            </p>
          </div>
        </div>
        <AccountList accounts={accounts} />
      </section>

      <section className="animate-slide-up space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
              {t("dashboard.transactions")}
            </h2>
            <p className="text-xs text-zinc-600 font-medium dark:text-zinc-400">
              {t("dashboard.latest").replace("{0}", String(transactions.length))}
            </p>
          </div>
          <Link
            href="/dashboard/transactions"
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-all hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200 dark:hover:border-white/20 dark:hover:bg-white/[0.08] dark:hover:text-white"
          >
            {t("dashboard.viewAll")}
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 4.5l7.5 7.5-7.5 7.5"
              />
            </svg>
          </Link>
        </div>
        <TransactionList transactions={transactions} />
      </section>
    </main>
  );
}
