"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createVirtualCard,
  toggleFreezeCard,
  deleteVirtualCard,
  simulateVirtualCardPurchase,
} from "@/lib/actions";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useT } from "@/components/ui/LanguageSwitcher";
import { accountTypeKey } from "@/lib/i18n/labels";
import type { AccountForUi } from "@/types/ui";

interface VirtualCard {
  id: string;
  cardNumber: string;
  cardHolder: string;
  expiryDate: string;
  cvv: string;
  isFrozen: boolean;
  isTemporary: boolean;
  expiresAt: string | null;
  maxUses: number | null;
  usageCount: number;
  createdAt: string;
}

export function VirtualCards({
  initialCards,
  accounts = [],
}: {
  initialCards: VirtualCard[];
  accounts?: AccountForUi[];
}) {
  const router = useRouter();
  const { t, format } = useT();
  const [cards, setCards] = useState(initialCards);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [revealedCVV, setRevealedCVV] = useState<Record<string, boolean>>({});
  const [revealedNumbers, setRevealedNumbers] = useState<Record<string, boolean>>({});
  const [copiedCardId, setCopiedCardId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [freezeLoading, setFreezeLoading] = useState<string | null>(null); // cardId en proceso
  const [actionError, setActionError] = useState<string | null>(null);
  const [purchaseCardId, setPurchaseCardId] = useState<string | null>(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseSuccessCardId, setPurchaseSuccessCardId] = useState<string | null>(null);

  function toggleNumber(cardId: string) {
    setRevealedNumbers((prev) => ({ ...prev, [cardId]: !prev[cardId] }));
  }

  function copyCardNumber(cardId: string, cardNumber: string) {
    navigator.clipboard?.writeText(cardNumber).then(() => {
      setCopiedCardId(cardId);
      setTimeout(() => setCopiedCardId(null), 2000);
    });
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await createVirtualCard(null, formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    // Add the new card to local state immediately
    if (result?.card) {
      setCards((prev) => [result.card as VirtualCard, ...prev]);
    }
    setShowForm(false);
    setLoading(false);
    router.refresh();
  }

  async function handleToggleFreeze(cardId: string) {
    setFreezeLoading(cardId);
    setActionError(null);
    const formData = new FormData();
    formData.append("cardId", cardId);
    const result = await toggleFreezeCard(null, formData);
    setFreezeLoading(null);
    if (result?.error) {
      setActionError(result.error);
      return;
    }
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, isFrozen: !c.isFrozen } : c)),
    );
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const cardId = deleteTarget;
    setDeleteTarget(null);
    setActionError(null);
    const formData = new FormData();
    formData.append("cardId", cardId);
    const result = await deleteVirtualCard(null, formData);
    if (result?.error) {
      setActionError(result.error);
      return;
    }
    setCards((prev) => prev.filter((c) => c.id !== cardId));
  }

  function toggleCVV(cardId: string) {
    setRevealedCVV((prev) => ({ ...prev, [cardId]: !prev[cardId] }));
  }

  async function handleSimulatePurchase(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setActionError(null);
    setPurchaseLoading(true);
    const formData = new FormData(e.currentTarget);
    const targetCardId = formData.get("cardId") as string;
    const result = await simulateVirtualCardPurchase(formData);
    setPurchaseLoading(false);
    if (result?.error) {
      setActionError(result.error);
      return;
    }
    if (typeof result?.usageCount === "number") {
      setCards((prev) =>
        prev.map((c) =>
          c.id === targetCardId ? { ...c, usageCount: result.usageCount! } : c,
        ),
      );
    }
    setPurchaseCardId(null);
    setPurchaseSuccessCardId(targetCardId);
    setTimeout(() => setPurchaseSuccessCardId(null), 3000);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Action error banner */}
      {actionError && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm text-red-700 dark:text-red-400">
          {actionError}
        </div>
      )}

      {/* Create button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
          {t("cards.title")}
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-900 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-zinc-300 dark:hover:border-white/[0.15] dark:hover:text-white"
        >
          <svg
            className="h-3.5 w-3.5"
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
          {showForm ? t("cards.cancel") : t("cards.new")}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="animate-slide-down rounded-2xl border border-zinc-200 bg-white p-5 space-y-4 shadow-sm dark:border-white/[0.06] dark:bg-white/[0.02]"
        >
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="cardHolder"
                className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase"
              >
                {t("cards.cardHolder")}
              </label>
              <input
                id="cardHolder"
                name="cardHolder"
                type="text"
                defaultValue={t("cards.defaultHolder")}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-400 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white dark:placeholder-zinc-400 dark:focus:border-primary-400/40"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="isTemporary"
                className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase"
              >
                {t("cards.type")}
              </label>
              <select
                id="isTemporary"
                name="isTemporary"
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white dark:focus:border-primary-400/40"
              >
                <option
                  value="false"
                  className="bg-white text-zinc-900 dark:bg-[#111] dark:text-zinc-200"
                >
                  {t("cards.permanent")}
                </option>
                <option
                  value="true"
                  className="bg-white text-zinc-900 dark:bg-[#111] dark:text-zinc-200"
                >
                  {t("cards.temporary")}
                </option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="expiresDays"
                className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase"
              >
                {t("cards.expiresDays")}
              </label>
              <input
                id="expiresDays"
                name="expiresDays"
                type="number"
                min={0}
                defaultValue={0}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-400 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white dark:placeholder-zinc-400 dark:focus:border-primary-400/40"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="maxUses"
                className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase"
              >
                {t("cards.maxUses")}
              </label>
              <input
                id="maxUses"
                name="maxUses"
                type="number"
                min={0}
                defaultValue={0}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-400 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white dark:placeholder-zinc-400 dark:focus:border-primary-400/40"
              />
            </div>
          </div>
          <Button type="submit" isLoading={loading} size="sm">
            {t("cards.create")}
          </Button>
        </form>
      )}

      {/* Card list */}
      {cards.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center dark:border-white/[0.04] dark:bg-white/[0.01]">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{t("cards.noCards")}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {cards.map((card) => (
            <div
              key={card.id}
              className={`relative overflow-hidden rounded-2xl border p-5 transition-all ${
                card.isFrozen
                  ? "border-red-500/20 bg-red-500/[0.03]"
                  : "border-zinc-200 bg-white shadow-sm dark:border-white/[0.06] dark:bg-gradient-to-br dark:from-white/[0.03] dark:to-transparent"
              }`}
            >
              {/* Card brand tag */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-semibold tracking-[0.2em] text-zinc-600 dark:text-zinc-400 uppercase">
                  {card.isTemporary ? t("cards.temporary") : t("cards.permanent")}
                </span>
                {card.isFrozen && (
                  <span className="rounded-full bg-red-500/15 border border-red-500/30 px-2 py-0.5 text-[9px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">
                    {t("cards.frozen")}
                  </span>
                )}
              </div>

              {/* Card number + quick actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <p className="font-mono text-lg tracking-[0.15em] text-zinc-900 dark:text-white font-medium">
                  {revealedNumbers[card.id]
                    ? card.cardNumber
                    : `•••• •••• •••• ${card.cardNumber.slice(-4)}`}
                </p>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleNumber(card.id)}
                    className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 transition-colors dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:text-white dark:hover:bg-white/[0.08]"
                  >
                    {revealedNumbers[card.id] ? t("cards.hide") : t("cards.reveal")}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyCardNumber(card.id, card.cardNumber)}
                    className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 transition-colors dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:text-white dark:hover:bg-white/[0.08]"
                  >
                    {copiedCardId === card.id ? (
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                        {t("cards.copied")}
                      </span>
                    ) : (
                      t("cards.copyNumber")
                    )}
                  </button>
                </div>
              </div>

              {/* Details */}
              <div className="flex gap-6 text-xs text-zinc-700 dark:text-zinc-300 mb-4">
                <div>
                  <span className="text-zinc-600 dark:text-zinc-400 block text-[10px] font-semibold uppercase tracking-wider mb-0.5">
                    {t("cards.expires")}
                  </span>
                  <span className="font-mono text-zinc-800 dark:text-zinc-200">
                    {card.expiryDate}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-600 dark:text-zinc-400 block text-[10px] font-semibold uppercase tracking-wider mb-0.5">
                    {t("cards.cvv")}
                  </span>
                  <button
                    onClick={() => toggleCVV(card.id)}
                    className="hover:text-zinc-900 dark:hover:text-white text-zinc-800 dark:text-zinc-200 transition-colors font-mono font-semibold"
                  >
                    {revealedCVV[card.id] ? card.cvv : "•••"}
                  </button>
                </div>
                {card.maxUses && (
                  <div>
                    <span className="text-zinc-600 dark:text-zinc-400 block text-[10px] font-semibold uppercase tracking-wider mb-0.5">
                      {t("cards.uses")}
                    </span>
                    <span className="font-mono text-zinc-800 dark:text-zinc-200">
                      {card.usageCount}/{card.maxUses}
                    </span>
                  </div>
                )}
                {card.expiresAt && (
                  <div>
                    <span className="text-zinc-600 dark:text-zinc-400 block text-[10px] font-semibold uppercase tracking-wider mb-0.5">
                      {t("cards.until")}
                    </span>
                    <span className="text-zinc-800 dark:text-zinc-200">
                      {format.date(card.expiresAt)}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2">
                {accounts.length > 0 && !card.isFrozen && (
                  <button
                    type="button"
                    onClick={() =>
                      setPurchaseCardId(purchaseCardId === card.id ? null : card.id)
                    }
                    className="rounded-lg border border-primary-500/30 bg-primary-500/10 px-3 py-1.5 text-[11px] font-semibold text-primary-700 hover:bg-primary-500/20 dark:text-primary-400 transition-all"
                  >
                    {purchaseCardId === card.id
                      ? t("cards.cancel")
                      : t("cards.simulatePurchase")}
                  </button>
                )}
                <button
                  onClick={() => handleToggleFreeze(card.id)}
                  disabled={freezeLoading === card.id}
                  className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    card.isFrozen
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                      : "bg-zinc-100 text-zinc-800 border-zinc-200 hover:bg-zinc-200 hover:text-zinc-900 dark:bg-white/[0.04] dark:text-zinc-200 dark:border-white/10 dark:hover:bg-white/[0.08] dark:hover:text-white"
                  }`}
                >
                  {freezeLoading === card.id
                    ? "..."
                    : card.isFrozen
                      ? t("cards.unfreeze")
                      : t("cards.freeze")}
                </button>
                <button
                  onClick={() => setDeleteTarget(card.id)}
                  className="rounded-lg px-3 py-1.5 text-[11px] font-semibold border border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-red-500/10 hover:text-red-600 hover:border-red-500/20 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-400 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-all"
                >
                  {t("cards.delete")}
                </button>
                {purchaseSuccessCardId === card.id && (
                  <span className="ml-auto text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                    ✓ {t("cards.purchaseSuccess")}
                  </span>
                )}
              </div>

              {purchaseCardId === card.id && accounts.length > 0 && (
                <form
                  onSubmit={handleSimulatePurchase}
                  className="mt-4 space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-3.5 dark:border-white/10 dark:bg-zinc-950/60"
                >
                  <input type="hidden" name="cardId" value={card.id} />
                  <p className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                    {t("cards.simulatePurchaseDesc")}
                  </p>
                  <div className="space-y-1">
                    <label
                      htmlFor={`account-${card.id}`}
                      className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
                    >
                      {t("cards.fundingAccount")}
                    </label>
                    <select
                      id={`account-${card.id}`}
                      name="accountId"
                      defaultValue={accounts[0]?.id}
                      className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 outline-none focus:border-zinc-400 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.nickname ?? t(accountTypeKey(acc.type))} ({acc.number}) —{" "}
                          {format.currency(acc.balance)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label
                        htmlFor={`merchant-${card.id}`}
                        className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
                      >
                        {t("cards.merchantLabel")}
                      </label>
                      <input
                        id={`merchant-${card.id}`}
                        name="merchant"
                        type="text"
                        required
                        defaultValue="Netflix"
                        placeholder={t("cards.merchantPlaceholder")}
                        className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-400 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label
                        htmlFor={`amount-${card.id}`}
                        className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
                      >
                        {t("transfer.amount")}
                      </label>
                      <input
                        id={`amount-${card.id}`}
                        name="amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        defaultValue="15.99"
                        className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-mono text-zinc-900 outline-none focus:border-zinc-400 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <Button type="submit" size="sm" isLoading={purchaseLoading}>
                    {t("cards.chargeCard")}
                  </Button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
      <ConfirmModal
        open={!!deleteTarget}
        title={t("cards.deleteTitle")}
        message={t("cards.deleteMsg")}
        confirmLabel={t("cards.delete")}
        cancelLabel={t("cards.cancel")}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
