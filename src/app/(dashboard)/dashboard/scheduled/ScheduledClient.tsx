"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createRecurringTransfer,
  toggleRecurringTransfer,
  deleteRecurringTransfer,
} from "@/lib/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useT } from "@/components/ui/LanguageSwitcher";
import { ACCOUNT_TYPE_KEYS, FREQUENCY_KEYS } from "@/lib/i18n/labels";
import { fromCents } from "@/lib/money";
import type { Formatters } from "@/components/ui/LanguageSwitcher";
import type { RecurringFrequency } from "@/lib/domain";
import type { TranslationKey } from "@/lib/i18n";
import type { AccountForUi, RecurringTransferForUi } from "@/types/ui";

interface ScheduledClientProps {
  transfers: RecurringTransferForUi[];
  accounts: AccountForUi[];
  externalFeeCents: number;
}

function frequencyLabel(frequency: string, t: (key: TranslationKey) => string): string {
  const key = FREQUENCY_KEYS[frequency as RecurringFrequency];
  return key ? t(key) : frequency;
}

function accountLabel(
  acc: AccountForUi,
  t: (key: TranslationKey) => string,
  format: Formatters,
): string {
  const base = acc.nickname ?? t(ACCOUNT_TYPE_KEYS[acc.type]);
  return `${base} (${acc.number}) — ${format.currency(acc.balance)}`;
}

export function ScheduledClient({
  transfers,
  accounts,
  externalFeeCents,
}: ScheduledClientProps) {
  const router = useRouter();
  const { t, format } = useT();

  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<RecurringTransferForUi | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsCreating(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const result = await createRecurringTransfer(null, formData);

    if (result?.error) {
      setError(result.error);
      setIsCreating(false);
      return;
    }

    form.reset();
    setIsCreating(false);
    router.refresh();
  }

  async function handleToggle(transfer: RecurringTransferForUi) {
    setError(null);
    setTogglingId(transfer.id);

    const formData = new FormData();
    formData.set("id", transfer.id);
    const result = await toggleRecurringTransfer(null, formData);

    if (result?.error) {
      setError(result.error);
    }

    setTogglingId(null);
    router.refresh();
  }

  async function executeDelete() {
    if (!pendingDelete) return;
    setIsDeleting(true);

    const formData = new FormData();
    formData.set("id", pendingDelete.id);
    const result = await deleteRecurringTransfer(null, formData);

    if (result?.error) {
      setError(result.error);
      setIsDeleting(false);
      setPendingDelete(null);
      return;
    }

    setIsDeleting(false);
    setPendingDelete(null);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-4xl animate-fade-in px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">
          {t("sched.title")}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 font-medium">
          {t("sched.subtitle")}
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.02]">
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          {t("sched.new")}
        </h2>
        <form onSubmit={handleCreate} className="mt-4 space-y-4">
          {error && (
            <div className="animate-slide-down rounded-xl border border-premium-coral/20 bg-premium-coral/10 px-4 py-3 text-sm font-medium text-red-700 dark:text-premium-coral">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="fromAccountId"
              className="block text-xs font-semibold uppercase tracking-[0.06em] text-zinc-700 dark:text-zinc-300"
            >
              {t("sched.fromAccount")}
            </label>
            <select
              id="fromAccountId"
              name="fromAccountId"
              required
              defaultValue=""
              className="input-premium mt-1.5"
            >
              <option
                value=""
                className="bg-white text-zinc-900 dark:bg-[#0a0a0a] dark:text-zinc-200"
              >
                {t("sched.selectAccount")}
              </option>
              {accounts.map((acc) => (
                <option
                  key={acc.id}
                  value={acc.id}
                  className="bg-white text-zinc-900 dark:bg-[#0a0a0a] dark:text-zinc-200"
                >
                  {accountLabel(acc, t, format)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="targetAccountNumber"
              name="targetAccountNumber"
              label={t("sched.toAccountNumber")}
              placeholder="CHK-A1B2C3"
              required
            />
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              label={t("sched.amount")}
              placeholder="0.00"
              required
            />
          </div>

          {externalFeeCents > 0 && (
            <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
              {t("transfer.feeNote").replace(
                "{0}",
                format.currency(fromCents(externalFeeCents)),
              )}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="frequency"
                className="block text-xs font-semibold uppercase tracking-[0.06em] text-zinc-700 dark:text-zinc-300"
              >
                {t("sched.frequency")}
              </label>
              <select
                id="frequency"
                name="frequency"
                required
                defaultValue="monthly"
                className="input-premium mt-1.5"
              >
                <option
                  value="daily"
                  className="bg-white text-zinc-900 dark:bg-[#0a0a0a] dark:text-zinc-200"
                >
                  {t("sched.daily")}
                </option>
                <option
                  value="weekly"
                  className="bg-white text-zinc-900 dark:bg-[#0a0a0a] dark:text-zinc-200"
                >
                  {t("sched.weekly")}
                </option>
                <option
                  value="monthly"
                  className="bg-white text-zinc-900 dark:bg-[#0a0a0a] dark:text-zinc-200"
                >
                  {t("sched.monthly")}
                </option>
              </select>
            </div>
            <Input
              id="startDate"
              name="startDate"
              type="date"
              label={t("sched.startDate")}
            />
          </div>

          <Input
            id="description"
            name="description"
            label={t("sched.description")}
            placeholder={t("sched.descriptionPlaceholder")}
          />

          <div className="pt-1">
            <Button type="submit" isLoading={isCreating}>
              {t("sched.create")}
            </Button>
          </div>
        </form>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          {t("sched.active")}
        </h2>

        {transfers.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-white/[0.08] dark:bg-white/[0.01]">
            <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">
              {t("sched.empty")}
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {transfers.map((tr) => (
              <div
                key={tr.id}
                className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.02]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold text-zinc-900 dark:text-white">
                      {format.currency(tr.amount)}
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                      {frequencyLabel(tr.frequency, t)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide border ${
                      tr.active
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                        : "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-white/[0.06] dark:text-zinc-400 dark:border-white/10"
                    }`}
                  >
                    {tr.active ? t("sched.statusActive") : t("sched.statusPaused")}
                  </span>
                </div>

                <div className="mt-4 space-y-1.5 text-xs">
                  <div className="flex justify-between gap-3">
                    <span className="text-zinc-600 dark:text-zinc-400 font-medium">
                      {t("sched.to")}
                    </span>
                    <span className="font-mono text-amber-700 dark:text-amber-400 font-medium">
                      {tr.targetAccountNumber}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-zinc-600 dark:text-zinc-400 font-medium">
                      {t("sched.nextRun")}
                    </span>
                    <span className="text-zinc-800 dark:text-zinc-200 font-medium">
                      {format.date(tr.nextRunAt)}
                    </span>
                  </div>
                  {tr.description && (
                    <div className="flex justify-between gap-3">
                      <span className="text-zinc-600 dark:text-zinc-400 font-medium">
                        {t("sched.note")}
                      </span>
                      <span className="truncate text-zinc-800 dark:text-zinc-200">
                        {tr.description}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggle(tr)}
                    disabled={togglingId === tr.id}
                    className="text-sm font-semibold text-primary-700 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 transition-colors disabled:opacity-40"
                  >
                    {tr.active ? t("sched.pause") : t("sched.resume")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(tr)}
                    className="ml-auto text-xs font-semibold text-zinc-600 dark:text-zinc-400 transition-colors hover:text-red-600 dark:hover:text-premium-coral"
                  >
                    {t("sched.delete")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={pendingDelete !== null}
        title={t("sched.deleteTitle")}
        message={
          pendingDelete
            ? t("sched.deleteMsg")
                .replace("{0}", frequencyLabel(pendingDelete.frequency, t).toLowerCase())
                .replace("{1}", format.currency(pendingDelete.amount))
                .replace("{2}", pendingDelete.targetAccountNumber)
            : ""
        }
        confirmLabel={isDeleting ? t("sched.deleting") : t("sched.delete")}
        variant="danger"
        loading={isDeleting}
        onConfirm={executeDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
