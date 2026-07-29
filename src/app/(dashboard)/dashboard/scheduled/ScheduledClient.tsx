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
import { formatMoney } from "@/lib/money";
import type { Account } from "@prisma/client";

interface SerializedRecurringTransfer {
  id: string;
  userId: string;
  fromAccountId: string;
  targetAccountNumber: string;
  amount: number;
  frequency: string;
  description: string | null;
  nextRunAt: string;
  lastRunAt: string | null;
  active: boolean;
  createdAt: string;
}

interface ScheduledClientProps {
  transfers: SerializedRecurringTransfer[];
  accounts: Account[];
}

function frequencyLabel(frequency: string, t: (key: string) => string): string {
  switch (frequency) {
    case "daily":
      return t("sched.daily");
    case "weekly":
      return t("sched.weekly");
    case "monthly":
      return t("sched.monthly");
    default:
      return frequency;
  }
}

function accountLabel(acc: Account): string {
  const base =
    acc.nickname ?? acc.type.charAt(0).toUpperCase() + acc.type.slice(1);
  return `${base} (${acc.number}) — ${formatMoney(acc.balance)}`;
}

export function ScheduledClient({ transfers, accounts }: ScheduledClientProps) {
  const router = useRouter();
  const { t, locale } = useT();

  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [pendingDelete, setPendingDelete] =
    useState<SerializedRecurringTransfer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsCreating(true);

    const formData = new FormData(event.currentTarget);
    const result = await createRecurringTransfer(null, formData);

    if (result?.error) {
      setError(result.error);
      setIsCreating(false);
      return;
    }

    event.currentTarget.reset();
    setIsCreating(false);
    router.refresh();
  }

  async function handleToggle(transfer: SerializedRecurringTransfer) {
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
        <h1 className="text-2xl font-semibold text-white">
          {t("sched.title")}
        </h1>
        <p className="mt-1 text-sm text-white/40">{t("sched.subtitle")}</p>
      </div>

      <div className="mt-6 rounded-2xl border border-white/[0.04] bg-white/[0.02] p-6">
        <h2 className="text-sm font-semibold text-white/80">
          {t("sched.new")}
        </h2>
        <form onSubmit={handleCreate} className="mt-4 space-y-4">
          {error && (
            <div className="animate-slide-down rounded-xl border border-premium-coral/20 bg-premium-coral/10 px-4 py-3 text-sm font-medium text-premium-coral">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="fromAccountId"
              className="block text-xs font-medium uppercase tracking-[0.06em] text-white/50"
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
              <option value="" className="bg-[#0a0a0a]">
                {t("sched.selectAccount")}
              </option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id} className="bg-[#0a0a0a]">
                  {accountLabel(acc)}
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="frequency"
                className="block text-xs font-medium uppercase tracking-[0.06em] text-white/50"
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
                <option value="daily" className="bg-[#0a0a0a]">
                  {t("sched.daily")}
                </option>
                <option value="weekly" className="bg-[#0a0a0a]">
                  {t("sched.weekly")}
                </option>
                <option value="monthly" className="bg-[#0a0a0a]">
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
        <h2 className="text-sm font-semibold text-white/80">
          {t("sched.active")}
        </h2>

        {transfers.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-white/[0.04] bg-white/[0.01] p-8 text-center">
            <p className="text-sm text-white/30">{t("sched.empty")}</p>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {transfers.map((tr) => (
              <div
                key={tr.id}
                className="rounded-2xl border border-white/[0.04] bg-white/[0.02] p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold text-white">
                      {formatMoney(tr.amount)}
                    </p>
                    <p className="text-xs text-white/40">
                      {frequencyLabel(tr.frequency, t)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                      tr.active
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-white/[0.06] text-white/40"
                    }`}
                  >
                    {tr.active ? t("sched.statusActive") : t("sched.statusPaused")}
                  </span>
                </div>

                <div className="mt-4 space-y-1.5 text-xs">
                  <div className="flex justify-between gap-3">
                    <span className="text-white/40">{t("sched.to")}</span>
                    <span className="font-mono text-amber-400/80">
                      {tr.targetAccountNumber}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-white/40">{t("sched.nextRun")}</span>
                    <span className="text-white/80">
                      {new Date(tr.nextRunAt).toLocaleDateString(
                        locale === "es" ? "es-ES" : "en-US",
                      )}
                    </span>
                  </div>
                  {tr.description && (
                    <div className="flex justify-between gap-3">
                      <span className="text-white/40">{t("sched.note")}</span>
                      <span className="truncate text-white/80">{tr.description}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggle(tr)}
                    disabled={togglingId === tr.id}
                    className="text-sm font-medium text-primary-400 transition-colors hover:text-primary-300 disabled:opacity-40"
                  >
                    {tr.active ? t("sched.pause") : t("sched.resume")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(tr)}
                    className="ml-auto text-xs font-medium text-white/30 transition-colors hover:text-premium-coral"
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
            ? locale === "es"
              ? `¿Eliminar la transferencia ${frequencyLabel(pendingDelete.frequency, t).toLowerCase()} de ${formatMoney(pendingDelete.amount)} a ${pendingDelete.targetAccountNumber}?`
              : `Delete the ${frequencyLabel(pendingDelete.frequency, t).toLowerCase()} transfer of ${formatMoney(pendingDelete.amount)} to ${pendingDelete.targetAccountNumber}?`
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
