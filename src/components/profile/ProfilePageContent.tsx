"use client";

import { useState } from "react";
import Link from "next/link";
import { exportPersonalData } from "@/lib/actions";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { PasswordForm } from "@/components/profile/PasswordForm";
import { DeleteUserButton } from "@/components/profile/DeleteUserButton";
import { NotificationPrefsForm } from "@/components/profile/NotificationPrefsForm";
import { useT } from "@/components/ui/LanguageSwitcher";
import { SECURITY_ACTION_KEYS } from "@/lib/i18n/labels";

import type { SecurityLogForUi } from "@/types/ui";

interface ProfilePageContentProps {
  userName: string;
  userEmail: string;
  createdAt: string;
  accountNumber: string;
  totalBalance: number;
  accountCount: number;
  notifyLowBalance: boolean;
  notifyLargeTx: boolean;
  lowBalanceThreshold: number;
  largeTxThreshold: number;
  securityLogs?: SecurityLogForUi[];
}

export function ProfilePageContent({
  userName,
  userEmail,
  createdAt,
  accountNumber,
  totalBalance,
  accountCount,
  notifyLowBalance,
  notifyLargeTx,
  lowBalanceThreshold,
  largeTxThreshold,
  securityLogs,
}: ProfilePageContentProps) {
  const { t, format } = useT();
  const [exportingData, setExportingData] = useState(false);

  const memberSince = format.longDate(createdAt);

  async function handleExportData() {
    setExportingData(true);
    try {
      const res = await exportPersonalData();
      if (res.json && res.filename) {
        const blob = new Blob([res.json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = res.filename;
        link.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setExportingData(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl animate-fade-in space-y-10 p-4 pt-8 sm:p-8 lg:p-10">
      <div className="space-y-1">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 font-medium hover:text-zinc-900 dark:hover:text-white transition-colors"
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
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
          {t("profile.title")}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">
          {t("profile.subtitle")}
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white/80 dark:border-white/10 dark:bg-zinc-900/60 p-6 sm:p-8 backdrop-blur-sm shadow-sm dark:shadow-none">
        <div className="flex flex-col items-center justify-between gap-5 text-center sm:flex-row sm:text-left">
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500 shadow-glow">
              <span className="text-2xl font-bold text-zinc-950">
                {(userName ?? userEmail).charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="space-y-0.5">
              <p className="text-xl font-semibold text-zinc-900 dark:text-white">
                {userName ?? "User"}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{userEmail}</p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                {t("profile.memberSince")} {memberSince}
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
            {t("profile.securityBadge")}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50/80 dark:border-white/5 dark:bg-zinc-950/40 p-4 sm:grid-cols-3">
          <div className="space-y-0.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-600 dark:text-zinc-400">
              {t("dashboard.accounts")}
            </p>
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">
              {accountCount}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-600 dark:text-zinc-400">
              {t("profile.totalBalance")}
            </p>
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">
              {format.currency(totalBalance)}
            </p>
          </div>
          <div className="space-y-0.5 col-span-2 sm:col-span-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-600 dark:text-zinc-400">
              {t("profile.accountNumber")}
            </p>
            <p className="text-sm font-semibold font-mono text-zinc-800 dark:text-zinc-300">
              {accountNumber}
            </p>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <div className="space-y-0.5">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
            {t("profile.edit")}
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            {t("profile.editDesc")}
          </p>
        </div>
        <ProfileForm name={userName ?? ""} />
      </section>

      <section className="space-y-4">
        <div className="space-y-0.5">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
            {t("profile.password")}
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            {t("profile.passwordDesc")}
          </p>
        </div>
        <PasswordForm />
      </section>

      <section className="space-y-4">
        <div className="space-y-0.5">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
            {t("notif.prefsTitle")}
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            {t("notif.prefsDesc")}
          </p>
        </div>
        <NotificationPrefsForm
          notifyLowBalance={notifyLowBalance}
          notifyLargeTx={notifyLargeTx}
          lowBalanceThreshold={lowBalanceThreshold}
          largeTxThreshold={largeTxThreshold}
        />
      </section>

      {/* Security & Activity Log */}
      <section className="space-y-4">
        <div className="space-y-0.5">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
            {t("security.title")}
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            {t("security.subtitle")}
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white/80 dark:border-white/10 dark:bg-zinc-900/60 p-4 sm:p-6 backdrop-blur-sm shadow-sm dark:shadow-none">
          {!securityLogs || securityLogs.length === 0 ? (
            <p className="py-4 text-center text-xs text-zinc-600 dark:text-zinc-400">
              {t("security.noLogs")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-600 dark:border-white/10 dark:text-zinc-400">
                    <th className="py-2.5 pr-3 font-semibold">{t("security.action")}</th>
                    <th className="py-2.5 px-3 font-semibold">{t("security.details")}</th>
                    <th className="py-2.5 px-3 font-semibold">{t("security.date")}</th>
                    <th className="py-2.5 pl-3 text-right font-semibold">
                      {t("security.ip")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                  {securityLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-zinc-50/50 dark:hover:bg-white/[0.02]"
                    >
                      <td className="py-3 pr-3 font-semibold text-zinc-900 dark:text-white capitalize">
                        {SECURITY_ACTION_KEYS[log.action]
                          ? t(SECURITY_ACTION_KEYS[log.action]!)
                          : log.action.replace(/_/g, " ")}
                      </td>
                      <td className="py-3 px-3 text-zinc-600 dark:text-zinc-400">
                        {log.details || "—"}
                      </td>
                      <td className="py-3 px-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                        {format.dateTime(log.createdAt)}
                      </td>
                      <td className="py-3 pl-3 text-right font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                        {log.ipAddress || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="rounded-2xl border border-zinc-200 bg-white/80 p-6 backdrop-blur-sm shadow-sm dark:border-white/10 dark:bg-zinc-900/60 dark:shadow-none">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
                {t("profile.dataPortability")}
              </h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {t("profile.dataPortabilityDesc")}
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportData}
              disabled={exportingData}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-white transition-all hover:bg-zinc-800 disabled:opacity-50 dark:border-white/15 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {exportingData ? t("profile.exportingData") : t("profile.exportDataBtn")}
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <DeleteUserButton />
      </section>
    </div>
  );
}
