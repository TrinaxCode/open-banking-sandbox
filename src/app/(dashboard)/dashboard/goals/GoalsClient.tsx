"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createSavingsGoal,
  contributeToGoal,
  deleteSavingsGoal,
} from "@/lib/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useT } from "@/components/ui/LanguageSwitcher";
import { formatMoney } from "@/lib/money";

interface Account {
  id: string;
  type: string;
  number: string;
  nickname: string | null;
  balance: number;
}

interface SavingsGoal {
  id: string;
  userId: string;
  accountId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  color: string;
  deadline: string | null;
  achievedAt: string | null;
  createdAt: string;
}

interface GoalsClientProps {
  goals: SavingsGoal[];
  accounts: Account[];
}

const COLORS = [
  { name: "emerald", bar: "bg-emerald-500", swatch: "bg-emerald-500" },
  { name: "blue", bar: "bg-blue-500", swatch: "bg-blue-500" },
  { name: "amber", bar: "bg-amber-500", swatch: "bg-amber-500" },
  { name: "violet", bar: "bg-violet-500", swatch: "bg-violet-500" },
  { name: "rose", bar: "bg-rose-500", swatch: "bg-rose-500" },
] as const;

function barClass(color: string): string {
  return COLORS.find((c) => c.name === color)?.bar ?? "bg-emerald-500";
}

function accountLabel(acc: Account): string {
  const name =
    acc.nickname ?? acc.type.charAt(0).toUpperCase() + acc.type.slice(1);
  return `${name} (${acc.number})`;
}

export function GoalsClient({ goals, accounts }: GoalsClientProps) {
  const router = useRouter();
  const { t, locale } = useT();

  // New goal form
  const [showForm, setShowForm] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>("emerald");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Per-goal contribution state
  const [contributeError, setContributeError] = useState<
    Record<string, string | null>
  >({});
  const [contributing, setContributing] = useState<string | null>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<SavingsGoal | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(null);
    setCreating(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("color", selectedColor);

    const result = await createSavingsGoal(null, formData);
    if (result?.error) {
      setCreateError(result.error);
      setCreating(false);
      return;
    }

    form.reset();
    setSelectedColor("emerald");
    setShowForm(false);
    setCreating(false);
    router.refresh();
  }

  async function handleContribute(
    event: React.FormEvent<HTMLFormElement>,
    goalId: string,
  ) {
    event.preventDefault();
    setContributeError((prev) => ({ ...prev, [goalId]: null }));
    setContributing(goalId);

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("goalId", goalId);

    const result = await contributeToGoal(null, formData);
    if (result?.error) {
      setContributeError((prev) => ({ ...prev, [goalId]: result.error! }));
      setContributing(null);
      return;
    }

    form.reset();
    setContributing(null);
    router.refresh();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    const formData = new FormData();
    formData.set("goalId", deleteTarget.id);

    const result = await deleteSavingsGoal(null, formData);
    setDeleting(false);
    setDeleteTarget(null);
    if (result?.error) return;
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-4xl animate-fade-in px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            {t("goals.title")}
          </h1>
          <p className="mt-1 text-sm text-white/40">{t("goals.subtitle")}</p>
        </div>
        <Button onClick={() => setShowForm((s) => !s)}>
          {showForm ? t("goals.close") : t("goals.new")}
        </Button>
      </div>

      {showForm && (
        <div className="mt-6 animate-fade-in rounded-2xl border border-white/[0.04] bg-white/[0.02] p-6">
          <form onSubmit={handleCreate} className="space-y-4">
            {createError && (
              <div className="animate-slide-down rounded-xl border border-premium-coral/20 bg-premium-coral/10 px-4 py-3 text-sm font-medium text-premium-coral">
                {createError}
              </div>
            )}

            <Input
              id="name"
              name="name"
              label={t("goals.name")}
              placeholder={t("goals.namePlaceholder")}
              required
            />

            <Input
              id="targetAmount"
              name="targetAmount"
              type="number"
              step="0.01"
              min="0.01"
              label={t("goals.target")}
              placeholder="0.00"
              required
            />

            <div>
              <label
                htmlFor="accountId"
                className="block text-xs font-medium uppercase tracking-[0.06em] text-white/50"
              >
                {t("goals.linkedAccount")}
              </label>
              <select
                id="accountId"
                name="accountId"
                required
                defaultValue=""
                className="input-premium mt-1.5"
              >
                <option value="" className="bg-[#0a0a0a]">
                  {t("goals.selectAccount")}
                </option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id} className="bg-[#0a0a0a]">
                    {accountLabel(acc)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="deadline"
                className="block text-xs font-medium uppercase tracking-[0.06em] text-white/50"
              >
                {t("goals.deadline")}
              </label>
              <input
                id="deadline"
                name="deadline"
                type="date"
                className="input-premium mt-1.5"
              />
            </div>

            <div>
              <span className="block text-xs font-medium uppercase tracking-[0.06em] text-white/50">
                {t("goals.color")}
              </span>
              <div className="mt-2 flex gap-2.5">
                {COLORS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setSelectedColor(c.name)}
                    aria-label={c.name}
                    className={`h-8 w-8 rounded-full transition-all ${c.swatch} ${
                      selectedColor === c.name
                        ? "ring-2 ring-white/70 ring-offset-2 ring-offset-[#0a0a0a]"
                        : "opacity-60 hover:opacity-100"
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <Button type="submit" className="flex-1" isLoading={creating}>
                {creating ? t("goals.creating") : t("goals.create")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
              >
                {t("goals.cancel")}
              </Button>
            </div>
          </form>
        </div>
      )}

      {goals.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-white/[0.04] bg-white/[0.02] p-10 text-center">
          <p className="text-sm text-white/40">{t("goals.empty")}</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {goals.map((goal) => {
            const account = accounts.find((a) => a.id === goal.accountId);
            const percentRaw =
              goal.targetAmount > 0
                ? (goal.currentAmount / goal.targetAmount) * 100
                : 0;
            const percent = Math.min(100, Math.max(0, percentRaw));
            const achieved =
              goal.achievedAt != null ||
              goal.currentAmount >= goal.targetAmount;

            return (
              <div
                key={goal.id}
                className="flex flex-col rounded-2xl border border-white/[0.04] bg-white/[0.02] p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-white">{goal.name}</h3>
                    <p className="mt-0.5 text-xs text-white/40">
                      {account ? account.number : t("goals.unknownAccount")}
                    </p>
                  </div>
                  {achieved && (
                    <span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                      {t("goals.achieved")}
                    </span>
                  )}
                </div>

                <div className="mt-4">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className={`h-full rounded-full transition-all ${barClass(goal.color)}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-white/70">
                      {formatMoney(goal.currentAmount)} {t("goals.of")}{" "}
                      {formatMoney(goal.targetAmount)}
                    </span>
                    <span className="font-medium text-white/40">
                      {Math.round(percent)}%
                    </span>
                  </div>
                </div>

                {goal.deadline && (
                  <p className="mt-3 text-xs text-white/40">
                    {t("goals.deadlineLabel")}{" "}
                    {new Date(goal.deadline).toLocaleDateString(
                      locale === "es" ? "es-ES" : "en-US",
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      },
                    )}
                  </p>
                )}

                <div className="mt-auto pt-4">
                  {contributeError[goal.id] && (
                    <div className="mb-2 rounded-lg border border-premium-coral/20 bg-premium-coral/10 px-3 py-2 text-xs font-medium text-premium-coral">
                      {contributeError[goal.id]}
                    </div>
                  )}
                  <form
                    onSubmit={(e) => handleContribute(e, goal.id)}
                    className="flex items-center gap-2"
                  >
                    <input
                      name="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder={t("goals.addFunds")}
                      required
                      className="input-premium flex-1"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      isLoading={contributing === goal.id}
                    >
                      {t("goals.add")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setDeleteTarget(goal)}
                    >
                      {t("goals.delete")}
                    </Button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        open={deleteTarget !== null}
        title={t("goals.deleteTitle")}
        message={
          deleteTarget
            ? locale === "es"
              ? `¿Eliminar "${deleteTarget.name}"? Los fondos guardados se devolverán a la cuenta vinculada.`
              : `Delete "${deleteTarget.name}"? Any saved funds will be returned to the linked account.`
            : ""
        }
        variant="danger"
        confirmLabel={t("goals.delete")}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
