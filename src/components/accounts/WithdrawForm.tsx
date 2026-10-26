"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { withdraw } from "@/lib/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useT } from "@/components/ui/LanguageSwitcher";
import { accountTypeKey } from "@/lib/i18n/labels";
import type { AccountForUi } from "@/types/ui";

interface WithdrawFormProps {
  accounts: AccountForUi[];
}

export function WithdrawForm({ accounts }: WithdrawFormProps) {
  const { t, format } = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultAccount = searchParams.get("accountId") ?? "";

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmDetails, setConfirmDetails] = useState<
    { label: string; value: string }[]
  >([]);
  const [pendingData, setPendingData] = useState<FormData | null>(null);

  function getAccountName(id: string): string {
    const acc = accounts.find((a) => a.id === id);
    if (!acc) return t("goals.unknownAccount");
    const name = acc.nickname || t(accountTypeKey(acc.type));
    return `${name} (${acc.number})`;
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
      {
        label: t("transfer.amount"),
        value: format.currency(parseFloat(amount) || 0),
      },
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
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-white/[0.04] dark:bg-white/[0.02] shadow-sm">
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {error && (
            <div className="animate-slide-down rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm font-medium text-red-700 dark:text-premium-coral">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="accountId"
              className="block text-xs font-semibold uppercase tracking-[0.06em] text-zinc-700 dark:text-zinc-300"
            >
              {t("transfer.from")}
            </label>
            <select
              id="accountId"
              name="accountId"
              defaultValue={defaultAccount}
              required
              className="input-premium mt-1.5"
            >
              <option
                value=""
                className="bg-white text-zinc-900 dark:bg-[#0a0a0a] dark:text-zinc-200"
              >
                {t("transfer.selectAccount")}
              </option>
              {accounts.map((acc) => (
                <option
                  key={acc.id}
                  value={acc.id}
                  className="bg-white text-zinc-900 dark:bg-[#0a0a0a] dark:text-zinc-200"
                >
                  {acc.nickname || t(accountTypeKey(acc.type))} ({acc.number}) —{" "}
                  {format.currency(acc.balance)}
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
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard")}
            >
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
        onCancel={() => {
          setShowConfirm(false);
          setIsLoading(false);
        }}
      />
    </>
  );
}
