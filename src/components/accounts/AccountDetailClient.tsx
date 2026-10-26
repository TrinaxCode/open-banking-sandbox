"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/ui/LanguageSwitcher";
import { TransactionList } from "@/components/dashboard/TransactionList";
import { AccountActions } from "@/components/accounts/AccountActions";
import { updateAccountNickname } from "@/lib/actions";
import { ACCOUNT_TYPE_KEYS } from "@/lib/i18n/labels";
import Link from "next/link";
import type { AccountForUi, TransactionForUi } from "@/types/ui";

interface AccountDetailClientProps {
  account: AccountForUi & { transactions: TransactionForUi[] };
}

export function AccountDetailClient({ account }: AccountDetailClientProps) {
  const { t, format } = useT();
  const router = useRouter();

  const typeLabel = t(ACCOUNT_TYPE_KEYS[account.type]);
  const [editingNick, setEditingNick] = useState(false);
  const [nickname, setNickname] = useState(account.nickname ?? "");
  const [savingNick, setSavingNick] = useState(false);
  const [copied, setCopied] = useState(false);

  async function saveNickname() {
    setSavingNick(true);
    const fd = new FormData();
    fd.set("accountId", account.id);
    fd.set("nickname", nickname);
    await updateAccountNickname(fd);
    setSavingNick(false);
    setEditingNick(false);
    router.refresh();
  }

  function copyNumber() {
    navigator.clipboard?.writeText(account.number).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  // Projected monthly interest for savings accounts (if an interestRate is set).
  const monthlyInterest =
    account.type === "savings" && account.interestRate && account.balance > 0
      ? (account.balance * account.interestRate) / 100 / 12
      : null;

  return (
    <div className="animate-fade-in space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
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
          {editingNick ? (
            <div className="mt-2 flex items-center gap-2">
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={40}
                placeholder={typeLabel}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-lg font-bold text-zinc-900 focus:outline-none focus:border-zinc-400 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white dark:focus:border-white/20"
                autoFocus
              />
              <button
                onClick={saveNickname}
                disabled={savingNick}
                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 disabled:opacity-50"
              >
                {t("common.save")}
              </button>
              <button
                onClick={() => {
                  setEditingNick(false);
                  setNickname(account.nickname ?? "");
                }}
                className="rounded-lg px-2 py-1.5 text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              >
                {t("common.cancel")}
              </button>
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-2">
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
                {account.nickname || typeLabel}
              </h1>
              <button
                onClick={() => setEditingNick(true)}
                aria-label={t("account.editNickname")}
                className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-white/[0.05] dark:hover:text-white"
              >
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
                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
                  />
                </svg>
              </button>
            </div>
          )}
          <button
            onClick={copyNumber}
            className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 font-mono dark:hover:text-white transition-colors"
            title={t("account.copyNumber")}
          >
            {account.number}
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m11.25 4.125v-1.5"
              />
            </svg>
            {copied && (
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                {t("account.copied")}
              </span>
            )}
          </button>
          {monthlyInterest !== null && (
            <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
              {t("account.projectedInterest")}: {format.currency(monthlyInterest)}
              {t("account.perMonth")}
            </p>
          )}
        </div>
      </div>

      {/* Balance card */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/[0.05] dark:bg-gradient-to-br dark:from-white/[0.03] dark:to-transparent">
        {account.type === "credit" ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-400">
                  {t("account.availableCredit")}
                </p>
                <p className="text-4xl font-light tracking-tight text-zinc-900 dark:text-white">
                  {format.currency(
                    (account.creditLimit ?? 0) - Math.abs(account.balance),
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-400">
                  {t("account.creditLimit")}
                </p>
                <p className="text-lg font-medium text-zinc-700 dark:text-zinc-300">
                  {format.currency(account.creditLimit ?? 5000)}
                </p>
              </div>
            </div>
            {(account.creditLimit ?? 0) > 0 && (
              <>
                <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all"
                    style={{
                      width: `${Math.min(100, (Math.abs(account.balance) / (account.creditLimit || 5000)) * 100)}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {t("account.used")}:{" "}
                    {(
                      (Math.abs(account.balance) / (account.creditLimit || 5000)) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                  {account.dueDate && (
                    <span className="text-amber-700 dark:text-amber-400 font-medium">
                      {t("account.paymentDue")} {account.dueDate}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-400">
              {t("account.currentBalance")}
            </p>
            <p className="text-4xl font-light tracking-tight text-zinc-900 dark:text-white">
              {format.currency(account.balance)}
            </p>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="space-y-4">
        <AccountActions accountId={account.id} accountType={account.type} />
      </div>

      {/* Transaction history */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            {t("history.title")}
          </h2>
          <span className="text-xs text-zinc-600 dark:text-zinc-400">
            {t("tx.count").replace("{0}", String(account.transactions.length))}
          </span>
        </div>
        <TransactionList transactions={account.transactions} />
      </section>
    </div>
  );
}
