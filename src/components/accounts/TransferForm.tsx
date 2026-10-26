"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { transfer, transferExternal } from "@/lib/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useT } from "@/components/ui/LanguageSwitcher";
import { accountTypeKey } from "@/lib/i18n/labels";
import { fromCents } from "@/lib/money";
import type { AccountForUi } from "@/types/ui";

interface TransferFormProps {
  accounts: AccountForUi[];
  /** Flat fee charged when the money leaves the user, in cents. */
  externalFeeCents: number;
  /** High-value threshold in cents above which external transfers require password step-up. */
  largeTxThresholdCents?: number;
}

export function TransferForm({
  accounts,
  externalFeeCents,
  largeTxThresholdCents = 100_000,
}: TransferFormProps) {
  const { t, format } = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultFrom = searchParams.get("fromAccountId") ?? "";
  const prefillTo = searchParams.get("to") ?? "";
  const isExternalPrefill = searchParams.get("external") === "1" || prefillTo !== "";

  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [mode, setMode] = useState<"internal" | "external">(
    isExternalPrefill || accounts.length < 2 ? "external" : "internal",
  );
  const [pendingData, setPendingData] = useState<FormData | null>(null);
  const [confirmDetails, setConfirmDetails] = useState<
    { label: string; value: string }[]
  >([]);

  function getAccountName(id: string): string {
    const acc = accounts.find((a) => a.id === id);
    if (!acc) return t("goals.unknownAccount");
    const name = acc.nickname || t(accountTypeKey(acc.type));
    return `${name} (${acc.number})`;
  }

  function formatAmount(amount: string): string {
    const value = parseFloat(amount);
    return format.currency(Number.isFinite(value) ? value : 0);
  }

  /** True when the destination number is one of the user's own accounts (free). */
  function isOwnAccountNumber(accountNumber: string): boolean {
    return accounts.some(
      (account) => account.number.toUpperCase() === accountNumber.trim().toUpperCase(),
    );
  }

  async function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      formData.set("idempotencyKey", crypto.randomUUID());
    }
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

      // Same rule the server applies: moving money to one of your own accounts
      // is free, leaving the sandbox costs the flat fee.
      const fee = isOwnAccountNumber(targetNum) ? 0 : fromCents(externalFeeCents);
      if (fee > 0) {
        details.push({ label: t("transfer.fee"), value: format.currency(fee) });
        details.push({
          label: t("transfer.total"),
          value: format.currency((parseFloat(amount) || 0) + fee),
        });
      }
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

    const result =
      mode === "internal"
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
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-white/[0.04] dark:bg-white/[0.02] shadow-sm">
        {/* Mode toggle */}
        <div className="mb-5 flex gap-1 rounded-lg bg-zinc-100 p-1 border border-zinc-200 dark:bg-white/[0.04] dark:border-white/[0.08]">
          <button
            type="button"
            onClick={() => setMode("internal")}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              mode === "internal"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-white/10 dark:text-white"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            }`}
          >
            {t("transfer.myAccounts")}
          </button>
          <button
            type="button"
            onClick={() => setMode("external")}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              mode === "external"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-white/10 dark:text-white"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            }`}
          >
            {t("transfer.external")}
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          {error && (
            <div className="animate-slide-down rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm font-medium text-red-700 dark:text-premium-coral">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="fromAccountId"
              className="block text-xs font-semibold uppercase tracking-[0.06em] text-zinc-700 dark:text-zinc-300"
            >
              {t("transfer.from")}
            </label>
            <select
              id="fromAccountId"
              name="fromAccountId"
              defaultValue={defaultFrom}
              required
              className="input-premium mt-1.5"
            >
              <option
                value=""
                className="bg-white text-zinc-900 dark:bg-[#0a0a0a] dark:text-zinc-200"
              >
                {t("transfer.selectSource")}
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

          {mode === "internal" ? (
            <div>
              <label
                htmlFor="toAccountId"
                className="block text-xs font-semibold uppercase tracking-[0.06em] text-zinc-700 dark:text-zinc-300"
              >
                {t("transfer.to")}
              </label>
              <select
                id="toAccountId"
                name="toAccountId"
                required
                className="input-premium mt-1.5"
              >
                <option
                  value=""
                  className="bg-white text-zinc-900 dark:bg-[#0a0a0a] dark:text-zinc-200"
                >
                  {t("transfer.selectTarget")}
                </option>
                {accounts.map((acc) => (
                  <option
                    key={acc.id}
                    value={acc.id}
                    className="bg-white text-zinc-900 dark:bg-[#0a0a0a] dark:text-zinc-200"
                  >
                    {acc.nickname || t(accountTypeKey(acc.type))} ({acc.number})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <Input
              id="targetAccountNumber"
              name="targetAccountNumber"
              label={t("transfer.targetNumber")}
              placeholder="CHK-A3B2C1"
              defaultValue={prefillTo}
              required
            />
          )}

          {mode === "external" && externalFeeCents > 0 && (
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">
              {t("transfer.feeNote").replace(
                "{0}",
                format.currency(fromCents(externalFeeCents)),
              )}
            </p>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                {t("transfer.quickSend")}
              </span>
              <div className="flex gap-1.5">
                {[20, 50, 100, 250].map((quick) => (
                  <button
                    key={quick}
                    type="button"
                    onClick={() => setAmount(quick.toFixed(2))}
                    className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-semibold text-zinc-700 hover:border-primary-500 hover:text-primary-700 hover:bg-zinc-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:border-primary-400/40 dark:hover:text-white dark:hover:bg-white/[0.08] transition-all"
                  >
                    +${quick}
                  </button>
                ))}
              </div>
            </div>

            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              label={t("transfer.amount")}
              placeholder="0.00"
              required
            />
          </div>

          <Input
            id="description"
            name="description"
            label={t("transfer.description")}
            placeholder={t("transfer.descriptionPlaceholder")}
          />

          {mode === "external" &&
            largeTxThresholdCents > 0 &&
            Number.isFinite(parseFloat(amount)) &&
            Math.round(parseFloat(amount) * 100) >= largeTxThresholdCents && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                  {t("transfer.stepUpTitle")}
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  {t("transfer.stepUpDesc")}
                </p>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder={t("transfer.stepUpPasswordPlaceholder")}
                  required
                />
              </div>
            )}

          <div className="flex gap-3 pt-1">
            <Button type="submit" className="flex-1">
              {t("transfer.review")}
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
        title={t("transfer.confirm.title")}
        message={t("transfer.confirm.msg")}
        details={confirmDetails}
        confirmLabel={isLoading ? t("common.processing") : t("transfer.confirm.btn")}
        loading={isLoading}
        onConfirm={executeTransfer}
        onCancel={() => {
          setShowConfirm(false);
          setIsLoading(false);
        }}
      />
    </>
  );
}
