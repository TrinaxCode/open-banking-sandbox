"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useT } from "@/components/ui/LanguageSwitcher";
import { updateNotificationPrefs } from "@/lib/actions";

interface NotificationPrefsFormProps {
  notifyLowBalance: boolean;
  notifyLargeTx: boolean;
  lowBalanceThreshold: number;
  largeTxThreshold: number;
}

export function NotificationPrefsForm({
  notifyLowBalance,
  notifyLargeTx,
  lowBalanceThreshold,
  largeTxThreshold,
}: NotificationPrefsFormProps) {
  const { t } = useT();
  const router = useRouter();
  const [lowBalance, setLowBalance] = useState(notifyLowBalance);
  const [largeTx, setLargeTx] = useState(notifyLargeTx);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    const fd = new FormData(e.currentTarget);
    fd.set("notifyLowBalance", String(lowBalance));
    fd.set("notifyLargeTx", String(largeTx));
    await updateNotificationPrefs(fd);
    setLoading(false);
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 glass-card p-6">
      {saved && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-700 dark:text-emerald-400">
          {t("profile.updatedSuccess")}
        </div>
      )}

      <label className="flex items-center justify-between gap-4">
        <span className="text-sm text-zinc-700 dark:text-zinc-200 font-medium">
          {t("notif.prefLowBalance")}
        </span>
        <input
          type="checkbox"
          checked={lowBalance}
          onChange={(e) => setLowBalance(e.target.checked)}
          className="h-4 w-4 accent-emerald-500"
        />
      </label>
      <Input
        id="lowBalanceThreshold"
        name="lowBalanceThreshold"
        type="number"
        step="0.01"
        min="0"
        label={t("notif.lowBalanceThreshold")}
        defaultValue={String(lowBalanceThreshold)}
      />

      <label className="flex items-center justify-between gap-4 pt-2">
        <span className="text-sm text-zinc-700 dark:text-zinc-200 font-medium">
          {t("notif.prefLargeTx")}
        </span>
        <input
          type="checkbox"
          checked={largeTx}
          onChange={(e) => setLargeTx(e.target.checked)}
          className="h-4 w-4 accent-emerald-500"
        />
      </label>
      <Input
        id="largeTxThreshold"
        name="largeTxThreshold"
        type="number"
        step="0.01"
        min="0"
        label={t("notif.largeTxThreshold")}
        defaultValue={String(largeTxThreshold)}
      />

      <Button type="submit" disabled={loading}>
        {loading ? t("common.processing") : t("common.save")}
      </Button>
    </form>
  );
}
