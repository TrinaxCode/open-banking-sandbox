"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createVirtualCard,
  toggleFreezeCard,
  deleteVirtualCard,
} from "@/lib/actions";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useT } from "@/components/ui/LanguageSwitcher";

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
}: {
  initialCards: VirtualCard[];
}) {
  const router = useRouter();
  const { t } = useT();
  const [cards, setCards] = useState(initialCards);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [revealedCVV, setRevealedCVV] = useState<Record<string, boolean>>({});
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [freezeLoading, setFreezeLoading] = useState<string | null>(null); // cardId en proceso
  const [actionError, setActionError] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      {/* Action error banner */}
      {actionError && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm text-red-400">
          {actionError}
        </div>
      )}

      {/* Create button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">{t("cards.title")}</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-white/50 transition-all hover:border-white/[0.10] hover:text-white/80"
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
          className="animate-slide-down rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4"
        >
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm text-red-400">
              {error}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-white/40 uppercase">
                Card Holder
              </label>
              <input
                name="cardHolder"
                type="text"
                defaultValue="Trinax User"
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-white/15 outline-none focus:border-primary-400/40"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-white/40 uppercase">
                Type
              </label>
              <select
                name="isTemporary"
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-primary-400/40"
              >
                <option value="false" className="bg-[#111]">
                  Permanent
                </option>
                <option value="true" className="bg-[#111]">
                  Temporary
                </option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-white/40 uppercase">
                Expires in (days)
              </label>
              <input
                name="expiresDays"
                type="number"
                min={0}
                defaultValue={0}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-white/15 outline-none focus:border-primary-400/40"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-white/40 uppercase">
                Max uses (0 = unlimited)
              </label>
              <input
                name="maxUses"
                type="number"
                min={0}
                defaultValue={0}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-white/15 outline-none focus:border-primary-400/40"
              />
            </div>
          </div>
          <Button type="submit" isLoading={loading} size="sm">
            Create Virtual Card
          </Button>
        </form>
      )}

      {/* Card list */}
      {cards.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.04] bg-white/[0.01] p-12 text-center">
          <p className="text-sm text-white/25">{t("cards.noCards")}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {cards.map((card) => (
            <div
              key={card.id}
              className={`relative overflow-hidden rounded-2xl border p-5 transition-all ${
                card.isFrozen
                  ? "border-red-500/20 bg-red-500/[0.03]"
                  : "border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent"
              }`}
            >
              {/* Card brand tag */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-semibold tracking-[0.2em] text-white/20 uppercase">
                  {card.isTemporary
                    ? t("cards.temporary")
                    : t("cards.permanent")}
                </span>
                {card.isFrozen && (
                  <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[9px] font-bold text-red-400 uppercase tracking-wider">
                    Frozen
                  </span>
                )}
              </div>

              {/* Card number */}
              <p className="font-mono text-lg tracking-[0.15em] text-white/90 mb-3">
                {card.cardNumber}
              </p>

              {/* Details */}
              <div className="flex gap-6 text-xs text-white/40 mb-4">
                <div>
                  <span className="text-white/15 block text-[10px] uppercase tracking-wider mb-0.5">
                    Expires
                  </span>
                  {card.expiryDate}
                </div>
                <div>
                  <span className="text-white/15 block text-[10px] uppercase tracking-wider mb-0.5">
                    CVV
                  </span>
                  <button
                    onClick={() => toggleCVV(card.id)}
                    className="hover:text-white/70 transition-colors font-mono"
                  >
                    {revealedCVV[card.id] ? card.cvv : "•••"}
                  </button>
                </div>
                {card.maxUses && (
                  <div>
                    <span className="text-white/15 block text-[10px] uppercase tracking-wider mb-0.5">
                      Uses
                    </span>
                    {card.usageCount}/{card.maxUses}
                  </div>
                )}
                {card.expiresAt && (
                  <div>
                    <span className="text-white/15 block text-[10px] uppercase tracking-wider mb-0.5">
                      Until
                    </span>
                    {new Date(card.expiresAt).toLocaleDateString()}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleFreeze(card.id)}
                  disabled={freezeLoading === card.id}
                  className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    card.isFrozen
                      ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                      : "bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white/80"
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
                  className="rounded-lg px-3 py-1.5 text-[11px] font-semibold bg-white/[0.04] text-white/30 hover:bg-red-500/10 hover:text-red-400 transition-all"
                >
                  {t("cards.delete")}
                </button>
              </div>
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
