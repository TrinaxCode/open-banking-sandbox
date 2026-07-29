"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { withdraw } from "@/lib/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useT } from "@/components/ui/LanguageSwitcher";
import type { Account } from "@prisma/client";

interface WithdrawFormProps {
  accounts: Account[];
}

export function WithdrawForm({ accounts }: WithdrawFormProps) {
  const { t } = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultAccount = searchParams.get("accountId") ?? "";

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmDetails, setConfirmDetails] = useState<{ label: string; value: string }[]>([]);
  const [pendingData, setPendingData] = useState<FormData | null>(null);

  function getAccountName(id: string): string {
    const acc = accounts.find((a) => a.id === id);
    if (!acc) return "Unknown";
    return `${acc.type.charAt(0).toUpperCase() + acc.type.slice(1)} (${acc.number})`;
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const accountId = formData.get("accountId") as string;
    const amount = formData.get("amount") as string;
    const desc = (formData.get("description") as string) || "";

    const details = [
      { label: t("transfer.from"), value: getAccountName(accountId) },
      { label: t("transfer.amount"), value: `$${parseFloat(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}` },
    ];
    if (desc) details.push({ label: t("transfer.description"), value: desc });

    setPendingData(formData);
    setConfirmDetails(details);
    setShowConfirm(true);
  }

  async function executeWithdraw() {
    if (!pendingData) return;
    setIsLoading(true);
    setShowConfirm(false);

    const result = await withdraw(pendingData);
    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <>
      <div className="rounded-2xl border border-white/[0.04] bg-white/[0.02] p-6">
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {error && (
            <div className="animate-slide-down rounded-xl bg-premium-coral/10 border border-premium-coral/20 px-4 py-3 text-sm font-medium text-premium-coral">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="accountId" className="block text-xs font-medium uppercase tracking-[0.06em] text-white/50">
              {t("transfer.from")}
            </label>
            <select
              id="accountId"
              name="accountId"
              defaultValue={defaultAccount}
              required
              className="input-premium mt-1.5"
            >
              <option value="" className="bg-[#0a0a0a]">{t("transfer.selectAccount")}</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id} className="bg-[#0a0a0a]">
                  {acc.type.charAt(0).toUpperCase() + acc.type.slice(1)} ({acc.number}) — ${acc.balance.toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            label={t("transfer.amount")}
            placeholder="0.00"
            required
          />

          <Input
            id="description"
            name="description"
            label={t("transfer.description")}
            placeholder={t("transfer.descriptionPlaceholder")}
          />

          <div className="flex gap-3 pt-1">
            <Button type="submit" className="flex-1">
              {t("withdraw.review")}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/dashboard")}>
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      </div>

      <ConfirmModal
        open={showConfirm}
        title={t("withdraw.confirm.title")}
        message={t("withdraw.confirm.msg")}
        details={confirmDetails}
        confirmLabel={isLoading ? t("common.processing") : t("withdraw.confirm.btn")}
        loading={isLoading}
        onConfirm={executeWithdraw}
        onCancel={() => { setShowConfirm(false); setIsLoading(false); }}
      />
    </>
  );
}
