"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteAccount } from "@/lib/actions";
import { useT } from "@/components/ui/LanguageSwitcher";
import { accountTypeKey } from "@/lib/i18n/labels";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import type { AccountForUi } from "@/types/ui";

interface DeleteAccountsClientProps {
  accounts: AccountForUi[];
}

export function DeleteAccountsClient({ accounts }: DeleteAccountsClientProps) {
  const { t, format } = useT();
  const router = useRouter();
  const [targetId, setTargetId] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const target = accounts.find((a) => a.id === targetId);

  async function handleDelete() {
    if (!targetId) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("accountId", targetId);
    const result = await deleteAccount(null, formData);
    setLoading(false);
    setTargetId(null);
    if (result?.success) {
      router.refresh();
    } else if (result?.error) {
      setInfoMsg(result.error);
    }
  }

  function handleClick(acc: AccountForUi) {
    if (acc.balance !== 0) {
      setInfoMsg(t("deleteAccount.nonzeroWarning"));
      return;
    }
    setTargetId(acc.id);
  }

  if (accounts.length === 0) {
    return (
      <div className="mx-auto max-w-2xl animate-fade-in space-y-8 p-4 sm:p-6 lg:p-8">
        <div>
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
          <h1 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">
            {t("common.deleteAccount")}
          </h1>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            {t("dashboard.noAccounts")}
          </p>
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
          {t("common.deleteAccount")}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 font-medium">
          {t("deleteAccount.selectSubtitle")}
        </p>
      </div>

      <div className="space-y-3">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white/80 shadow-sm dark:shadow-none dark:border-white/[0.08] dark:bg-white/[0.02] p-4"
          >
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {acc.nickname || t(accountTypeKey(acc.type))}
              </p>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 font-mono">
                {acc.number}
              </p>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium mt-1">
                {format.currency(acc.balance)}
              </p>
            </div>
            <button
              onClick={() => handleClick(acc)}
              className="rounded-lg border border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-white/[0.04] px-4 py-2 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all"
            >
              {t("common.deleteAccount")}
            </button>
          </div>
        ))}
      </div>

      <ConfirmModal
        open={!!infoMsg}
        title={t("common.deleteAccount")}
        message={infoMsg}
        confirmLabel="OK"
        cancelLabel=""
        onConfirm={() => setInfoMsg("")}
        onCancel={() => setInfoMsg("")}
      />

      <ConfirmModal
        open={!!target && !infoMsg}
        title={t("common.deleteAccount")}
        message={t("deleteAccount.confirmMsg").replace(
          "{0}",
          t(accountTypeKey(target?.type ?? "")),
        )}
        confirmLabel={t("common.deleteAccount")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setTargetId(null)}
        loading={loading}
      />
    </div>
  );
}
