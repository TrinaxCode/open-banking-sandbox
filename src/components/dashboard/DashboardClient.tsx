"use client";

import { BalanceChart } from "@/components/dashboard/BalanceChart";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { AccountList } from "@/components/dashboard/AccountList";
import { TransactionList } from "@/components/dashboard/TransactionList";
import { useT } from "@/components/ui/LanguageSwitcher";
import Link from "next/link";
import type { Account, Transaction } from "@prisma/client";

interface DashboardClientProps {
  userName: string;
  totalBalance: number;
  previousBalance: number;
  accounts: Account[];
  transactions: Transaction[];
}

export function DashboardClient({
  userName,
  totalBalance,
  previousBalance,
  accounts,
  transactions,
}: DashboardClientProps) {
  const { t } = useT();

  return (
    <main className="flex-1 space-y-10 p-4 pt-6 sm:p-8 lg:p-10 max-w-6xl mx-auto w-full">
      <div className="animate-fade-in space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          {t("dashboard.welcome")}, {userName}
        </h1>
        <p className="text-sm text-white/30">{t("dashboard.subtitle")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <BalanceChart balance={totalBalance} previousBalance={previousBalance} transactions={transactions} />
        </div>
        <div className="lg:col-span-1">
          <QuickActions />
        </div>
      </div>

      <section className="animate-slide-up space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-base font-semibold text-white/90">{t("dashboard.accounts")}</h2>
            <p className="text-xs text-white/30">
              {accounts.length} · ${totalBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
        <AccountList accounts={accounts} />
      </section>

      <section className="animate-slide-up space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white/90">{t("dashboard.transactions")}</h2>
            <p className="text-xs text-white/30">Últimas {transactions.length}</p>
          </div>
          <Link
            href="/dashboard/transactions"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-white/50 transition-all hover:border-white/[0.1] hover:bg-white/[0.05] hover:text-white/80"
          >
            {t("dashboard.viewAll")}
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        </div>
        <TransactionList transactions={transactions} />
      </section>
    </main>
  );
}
