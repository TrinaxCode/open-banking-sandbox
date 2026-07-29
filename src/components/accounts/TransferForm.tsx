"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { transfer, transferExternal } from "@/lib/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useT } from "@/components/ui/LanguageSwitcher";
import type { Account } from "@prisma/client";

interface TransferFormProps {
  accounts: Account[];
}

export function TransferForm({ accounts }: TransferFormProps) {
  const { t } = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultFrom = searchParams.get("fromAccountId") ?? "";
  const prefillTo = searchParams.get("to") ?? "";
  const isExternalPrefill =
    searchParams.get("external") === "1" || prefillTo !== "";

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [mode, setMode] = useState<"internal" | "external">(
    isExternalPrefill ? "external" : "internal",
  );
  const [pendingData, setPendingData] = useState<FormData | null>(null);
  const [confirmDetails, setConfirmDetails] = useState<{ label: string; value: string }[]>([]);

  function getAccountName(id: string): string {
    const acc = accounts.find((a) => a.id === id);
    if (!acc) return "Unknown";
    return `${acc.type.charAt(0).toUpperCase() + acc.type.slice(1)} (${acc.number})`;
  }

  function formatAmount(amount: string): string {
    const n = parseFloat(amount);
    if (isNaN(n)) return "$0.00";
    return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  }

  async function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const fromId = formData.get("fromAccountId") as string;
    const toId = formData.get("toAccountId") as string;
    const targetNum = formData.get("targetAccountNumber") as string;
    const amount = formData.get("amount") as string;
    const desc = (formData.get("description") as string) || "";

    const details = [
      { label: t("transfer.from"), value: getAccountName(fromId) },
      { label: t("transfer.amount"), value: formatAmount(amount) },
    ];

    if (mode === "internal") {
      details.push({ label: t("transfer.to"), value: getAccountName(toId) });
    } else {
      details.push({ label: t("transfer.targetNumber"), value: targetNum });
    }

    if (desc) details.push({ label: t("transfer.description"), value: desc });

    setPendingData(formData);
    setConfirmDetails(details);
    setShowConfirm(true);
  }

  async function executeTransfer() {
    if (!pendingData) return;
    setIsLoading(true);
    setShowConfirm(false);

    const result = mode === "internal"
      ? await transfer(pendingData)
      : await transferExternal(pendingData);

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
        {/* Mode toggle */}
        <div className="mb-5 flex gap-1 rounded-lg bg-white/[0.04] p-1">
          <button
            type="button"
            onClick={() => setMode("internal")}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              mode === "internal" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
            }`}
          >
            {t("transfer.myAccounts")}
          </button>
          <button
            type="button"
            onClick={() => setMode("external")}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              mode === "external" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
            }`}
          >
            {t("transfer.external")}
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          {error && (
            <div className="animate-slide-down rounded-xl bg-premium-coral/10 border border-premium-coral/20 px-4 py-3 text-sm font-medium text-premium-coral">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="fromAccountId" className="block text-xs font-medium uppercase tracking-[0.06em] text-white/50">
              {t("transfer.from")}
            </label>
            <select
              id="fromAccountId"
              name="fromAccountId"
              defaultValue={defaultFrom}
              required
              className="input-premium mt-1.5"
            >
              <option value="" className="bg-[#0a0a0a]">{t("transfer.selectSource")}</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id} className="bg-[#0a0a0a]">
                  {acc.type.charAt(0).toUpperCase() + acc.type.slice(1)} ({acc.number}) — ${acc.balance.toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          {mode === "internal" ? (
            <div>
              <label htmlFor="toAccountId" className="block text-xs font-medium uppercase tracking-[0.06em] text-white/50">
                {t("transfer.to")}
              </label>
              <select id="toAccountId" name="toAccountId" required className="input-premium mt-1.5">
                <option value="" className="bg-[#0a0a0a]">{t("transfer.selectTarget")}</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id} className="bg-[#0a0a0a]">
                    {acc.type.charAt(0).toUpperCase() + acc.type.slice(1)} ({acc.number})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <Input
              id="targetAccountNumber"
              name="targetAccountNumber"
              label={t("transfer.targetNumber")}
              placeholder="ej. CHK-A3B2C1"
              defaultValue={prefillTo}
              required
            />
          )}

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
              {t("transfer.review")}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/dashboard")}>
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      </div>

      <ConfirmModal
        open={showConfirm}
        title={t("transfer.confirm.title")}
        message={t("transfer.confirm.msg")}
        details={confirmDetails}
        confirmLabel={isLoading ? t("common.processing") : t("transfer.confirm.btn")}
        loading={isLoading}
        onConfirm={executeTransfer}
        onCancel={() => { setShowConfirm(false); setIsLoading(false); }}
      />
    </>
  );
}
