"use client";

import { useEffect, useState, useTransition } from "react";
import { useT } from "@/components/ui/LanguageSwitcher";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { CATEGORY_KEYS } from "@/lib/i18n/labels";
import { formatCurrency } from "@/lib/i18n/format";
import { setBudget, deleteBudget } from "@/lib/actions";
import type { BudgetsSummary, CategoryBudgetDetail } from "@/lib/services/budgets";
import { TRANSACTION_CATEGORIES, type TransactionCategory } from "@/lib/domain";

interface BudgetsClientProps {
  initialSummary: BudgetsSummary;
}

const AVAILABLE_CATEGORIES = TRANSACTION_CATEGORIES.filter(
  (c): c is TransactionCategory => c !== "income",
);

export function BudgetsClient({ initialSummary }: BudgetsClientProps) {
  const { t, locale } = useT();
  const [summary, setSummary] = useState<BudgetsSummary>(initialSummary);
  const [isPending, startTransition] = useTransition();

  // Modal / form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<TransactionCategory>("food");
  const [amountInput, setAmountInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingDeleteCategory, setPendingDeleteCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!isModalOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsModalOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isModalOpen]);

  const existingCategories = new Set(summary.budgets.map((b) => b.category));
  const unbudgetedCategories = AVAILABLE_CATEGORIES.filter(
    (c) => !existingCategories.has(c),
  );

  function openAddModal(category?: TransactionCategory) {
    setSelectedCategory(category ?? unbudgetedCategories[0] ?? "food");
    setAmountInput("");
    setFormError(null);
    setIsModalOpen(true);
  }

  function openEditModal(budget: CategoryBudgetDetail) {
    setSelectedCategory(budget.category);
    setAmountInput(budget.budgetLimit.toString());
    setFormError(null);
    setIsModalOpen(true);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const amountNum = parseFloat(amountInput);
    if (isNaN(amountNum) || amountNum <= 0) {
      setFormError(t("budgets.invalidAmount"));
      return;
    }

    const formData = new FormData();
    formData.set("category", selectedCategory);
    formData.set("amount", amountNum.toString());

    startTransition(async () => {
      const res = await setBudget(formData);
      if (res.error) {
        setFormError(res.error);
        return;
      }

      if (res.budget) {
        const updatedBudgets = [...summary.budgets];
        const idx = updatedBudgets.findIndex((b) => b.category === selectedCategory);
        if (idx >= 0) {
          updatedBudgets[idx] = res.budget;
        } else {
          updatedBudgets.push(res.budget);
        }

        const totalBudget = updatedBudgets.reduce((s, b) => s + b.budgetLimit, 0);
        const totalSpent = updatedBudgets.reduce((s, b) => s + b.spent, 0);
        const totalRemaining = Math.max(0, totalBudget - totalSpent);
        const overallPercentUsed =
          totalBudget > 0
            ? Math.min(100, Math.round((totalSpent / totalBudget) * 100))
            : 0;

        setSummary({
          ...summary,
          budgets: updatedBudgets,
          totalBudget,
          totalSpent,
          totalRemaining,
          overallPercentUsed,
        });
      }

      setIsModalOpen(false);
    });
  }

  function handleDelete(category: string) {
    const formData = new FormData();
    formData.set("category", category);

    startTransition(async () => {
      const res = await deleteBudget(formData);
      setPendingDeleteCategory(null);
      if (!res.error) {
        const updatedBudgets = summary.budgets.filter((b) => b.category !== category);
        const totalBudget = updatedBudgets.reduce((s, b) => s + b.budgetLimit, 0);
        const totalSpent = updatedBudgets.reduce((s, b) => s + b.spent, 0);
        const totalRemaining = Math.max(0, totalBudget - totalSpent);
        const overallPercentUsed =
          totalBudget > 0
            ? Math.min(100, Math.round((totalSpent / totalBudget) * 100))
            : 0;

        setSummary({
          ...summary,
          budgets: updatedBudgets,
          totalBudget,
          totalSpent,
          totalRemaining,
          overallPercentUsed,
        });
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {t("budgets.title")}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {t("budgets.subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => openAddModal()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          {t("budgets.setBudget")}
        </button>
      </div>

      {/* Overview Card */}
      <div
        data-testid="budget-totals"
        className="relative min-w-0 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/70 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]"
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="min-w-0">
            <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {t("budgets.totalBudget")}
            </div>
            <div className="mt-1 break-words text-2xl font-bold text-zinc-900 dark:text-white">
              {formatCurrency(summary.totalBudget, locale)}
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {t("budgets.totalSpent")}
            </div>
            <div className="mt-1 break-words text-2xl font-bold text-zinc-900 dark:text-white">
              {formatCurrency(summary.totalSpent, locale)}
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {t("budgets.remaining")}
            </div>
            <div
              className={`mt-1 break-words text-2xl font-bold ${
                summary.totalRemaining === 0 && summary.totalSpent > summary.totalBudget
                  ? "text-rose-700 dark:text-rose-400"
                  : "text-emerald-700 dark:text-emerald-400"
              }`}
            >
              {formatCurrency(summary.totalRemaining, locale)}
            </div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="mt-6 min-w-0">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
            <span className="min-w-0 break-words">
              {t("budgets.spentOf")
                .replace("{0}", formatCurrency(summary.totalSpent, locale))
                .replace("{1}", formatCurrency(summary.totalBudget, locale))}
            </span>
            <span className="shrink-0 font-semibold text-zinc-900 dark:text-white">
              {summary.overallPercentUsed}%
            </span>
          </div>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-white/10">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                summary.overallPercentUsed >= 100
                  ? "bg-rose-500"
                  : summary.overallPercentUsed >= 80
                    ? "bg-amber-500"
                    : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(100, summary.overallPercentUsed)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Category Budgets Grid */}
      {summary.budgets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-12 text-center dark:border-white/15">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-white/5 dark:text-zinc-400">
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z"
              />
            </svg>
          </div>
          <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-white">
            {t("budgets.noBudgets")}
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {t("budgets.noBudgetsDesc")}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {unbudgetedCategories.slice(0, 4).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => openAddModal(cat)}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:bg-white/[0.08]"
              >
                + {t(CATEGORY_KEYS[cat])}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {summary.budgets.map((budget) => {
            const isOver = budget.isOverBudget;
            const percent = budget.percentUsed;
            const barColor =
              percent >= 100
                ? "bg-rose-500"
                : percent >= 80
                  ? "bg-amber-500"
                  : "bg-emerald-500";

            return (
              <div
                key={budget.id}
                data-testid="budget-card"
                className="group relative flex min-w-0 flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm transition-all hover:border-zinc-300 dark:border-white/10 dark:bg-zinc-900/60 dark:hover:border-white/20"
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-xs font-bold uppercase text-zinc-700 dark:bg-white/10 dark:text-zinc-200">
                        {budget.category.slice(0, 2)}
                      </span>
                      <span className="min-w-0 truncate font-semibold text-zinc-900 dark:text-white">
                        {t(CATEGORY_KEYS[budget.category])}
                      </span>
                    </div>
                    {isOver && (
                      <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                        {t("budgets.overBudget")}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="min-w-0 break-all text-xl font-bold text-zinc-900 dark:text-white">
                      {formatCurrency(budget.spent, locale)}
                    </span>
                    <span className="min-w-0 break-all text-xs text-zinc-600 dark:text-zinc-400">
                      / {formatCurrency(budget.budgetLimit, locale)}
                    </span>
                  </div>

                  <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-white/10">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                      style={{ width: `${Math.min(100, percent)}%` }}
                    />
                  </div>

                  <div className="mt-2 flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                    <span className="min-w-0 break-all">
                      {percent}% ({formatCurrency(budget.spent, locale)})
                    </span>
                    <span className="min-w-0 break-all">
                      {t("budgets.remaining")}:{" "}
                      <strong
                        className={
                          isOver
                            ? "text-rose-700 dark:text-rose-400"
                            : "text-zinc-800 dark:text-zinc-200"
                        }
                      >
                        {formatCurrency(budget.remaining, locale)}
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex min-w-0 flex-wrap items-center justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => openEditModal(budget)}
                    className="rounded-lg px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
                  >
                    {t("budgets.editBudget")}
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setPendingDeleteCategory(budget.category)}
                    className="rounded-lg px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/40"
                  >
                    {t("budgets.deleteBudget")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Add Unbudgeted Categories */}
      {unbudgetedCategories.length > 0 && summary.budgets.length > 0 && (
        <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-white/10 dark:bg-white/[0.02]">
          <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            {t("budgets.noBudgets")}:
          </span>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {unbudgetedCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => openAddModal(cat)}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm hover:border-zinc-300 hover:bg-zinc-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:bg-white/[0.08]"
              >
                + {t(CATEGORY_KEYS[cat])}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Set / Edit Budget Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label={t("cards.cancel")}
            onClick={() => setIsModalOpen(false)}
            className="absolute inset-0 cursor-default bg-zinc-950/60 backdrop-blur-sm animate-fade-in"
          />
          <div
            className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-zinc-900"
            role="dialog"
            aria-modal="true"
            aria-labelledby="budget-modal-title"
          >
            <div className="flex items-center justify-between">
              <h2
                id="budget-modal-title"
                className="text-lg font-bold text-zinc-900 dark:text-white"
              >
                {t("budgets.setBudget")}
              </h2>
              <button
                type="button"
                aria-label={t("cards.cancel")}
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="budget-category"
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
                >
                  {t("budgets.category")}
                </label>
                <select
                  id="budget-category"
                  value={selectedCategory}
                  onChange={(e) =>
                    setSelectedCategory(e.target.value as TransactionCategory)
                  }
                  className="mt-1.5 block w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-white/10 dark:bg-zinc-800 dark:text-white"
                >
                  {AVAILABLE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {t(CATEGORY_KEYS[cat])}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="budget-limit"
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
                >
                  {t("budgets.limit")} ($)
                </label>
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500 dark:text-zinc-400">
                    $
                  </span>
                  <input
                    id="budget-limit"
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    placeholder="350.00"
                    className="block w-full rounded-xl border border-zinc-300 bg-white pl-8 pr-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-white/10 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
              </div>

              {formError && (
                <div className="rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:bg-rose-950/50 dark:text-rose-400">
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5"
                >
                  {t("cards.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600 disabled:opacity-50"
                >
                  {isPending ? "..." : t("budgets.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={pendingDeleteCategory !== null}
        title={t("budgets.deleteBudget")}
        message={t("budgets.removeConfirm")}
        confirmLabel={t("budgets.deleteBudget")}
        cancelLabel={t("cards.cancel")}
        variant="danger"
        loading={isPending}
        onConfirm={() => {
          if (pendingDeleteCategory) handleDelete(pendingDeleteCategory);
        }}
        onCancel={() => setPendingDeleteCategory(null)}
      />
    </div>
  );
}
