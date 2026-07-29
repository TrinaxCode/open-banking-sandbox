"use client";

import Link from "next/link";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { PasswordForm } from "@/components/profile/PasswordForm";
import { DeleteUserButton } from "@/components/profile/DeleteUserButton";
import { NotificationPrefsForm } from "@/components/profile/NotificationPrefsForm";
import { useT } from "@/components/ui/LanguageSwitcher";

interface ProfilePageContentProps {
  userName: string;
  userEmail: string;
  memberSince: string;
  accountNumber: string;
  totalBalance: number;
  accountCount: number;
  notifyLowBalance: boolean;
  notifyLargeTx: boolean;
  lowBalanceThreshold: number;
  largeTxThreshold: number;
}

export function ProfilePageContent({
  userName,
  userEmail,
  memberSince,
  accountNumber,
  totalBalance,
  accountCount,
  notifyLowBalance,
  notifyLargeTx,
  lowBalanceThreshold,
  largeTxThreshold,
}: ProfilePageContentProps) {
  const { t } = useT();

  return (
    <div className="mx-auto max-w-3xl animate-fade-in space-y-10 p-4 pt-8 sm:p-8 lg:p-10">
      <div className="space-y-1">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
          {t("common.back")}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-white">{t("profile.title")}</h1>
        <p className="text-sm text-white/30">{t("profile.subtitle")}</p>
      </div>

      <div className="rounded-2xl border border-white/[0.04] bg-gradient-to-br from-white/[0.02] to-transparent p-6 sm:p-8">
        <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500 shadow-glow">
            <span className="text-2xl font-bold text-white">
              {(userName ?? userEmail).charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="space-y-0.5">
            <p className="text-xl font-semibold text-white">{userName ?? "User"}</p>
            <p className="text-sm text-white/40">{userEmail}</p>
            <p className="text-xs text-white/20">{t("profile.memberSince")} {memberSince}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 rounded-xl bg-white/[0.02] p-4 sm:grid-cols-3">
          <div className="space-y-0.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/30">{t("dashboard.accounts")}</p>
            <p className="text-sm font-semibold text-white">{accountCount}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/30">{t("profile.totalBalance")}</p>
            <p className="text-sm font-semibold text-white">
              ${totalBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="space-y-0.5 col-span-2 sm:col-span-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/30">{t("profile.accountNumber")}</p>
            <p className="text-sm font-semibold font-mono text-white/70">{accountNumber}</p>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <div className="space-y-0.5">
          <h2 className="text-base font-semibold text-white/90">{t("profile.edit")}</h2>
          <p className="text-xs text-white/30">{t("profile.editDesc")}</p>
        </div>
        <ProfileForm name={userName ?? ""} />
      </section>

      <section className="space-y-4">
        <div className="space-y-0.5">
          <h2 className="text-base font-semibold text-white/90">{t("profile.password")}</h2>
          <p className="text-xs text-white/30">{t("profile.passwordDesc")}</p>
        </div>
        <PasswordForm />
      </section>

      <section className="space-y-4">
        <div className="space-y-0.5">
          <h2 className="text-base font-semibold text-white/90">{t("notif.prefsTitle")}</h2>
          <p className="text-xs text-white/30">{t("notif.prefsDesc")}</p>
        </div>
        <NotificationPrefsForm
          notifyLowBalance={notifyLowBalance}
          notifyLargeTx={notifyLargeTx}
          lowBalanceThreshold={lowBalanceThreshold}
          largeTxThreshold={largeTxThreshold}
        />
      </section>

      <section className="space-y-4">
        <DeleteUserButton />
      </section>
    </div>
  );
}
