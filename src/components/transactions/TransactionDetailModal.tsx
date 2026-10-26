"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useT } from "@/components/ui/LanguageSwitcher";
import { type TransactionType, type TransactionCategory } from "@/lib/domain";
import { movementIncreasesBalance } from "@/lib/interest";
import { CATEGORY_KEYS, TRANSACTION_TYPE_KEYS } from "@/lib/i18n/labels";
import { updateTransactionNotes } from "@/lib/actions";
import type { TransactionForUi } from "@/types/ui";

interface TransactionDetailModalProps {
  transaction: TransactionForUi | null;
  onClose: () => void;
}

export function TransactionDetailModal({
  transaction,
  onClose,
}: TransactionDetailModalProps) {
  const { t, format } = useT();
  const [copied, setCopied] = useState(false);
  const [notes, setNotes] = useState(transaction?.notes ?? "");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  useEffect(() => {
    setNotes(transaction?.notes ?? "");
    setIsEditingNotes(false);
  }, [transaction]);

  useEffect(() => {
    if (!transaction) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [transaction, onClose]);

  if (!transaction) return null;

  const isIncome = movementIncreasesBalance(transaction);
  const typeLabel = t(
    TRANSACTION_TYPE_KEYS[transaction.type as TransactionType] ?? "tx.deposit",
  );
  const categoryLabel =
    transaction.category && transaction.category !== "other"
      ? t(CATEGORY_KEYS[transaction.category as TransactionCategory] ?? "category.other")
      : null;

  const displayRef =
    transaction.reference ||
    `TX-${transaction.id
      .replace(/[^A-Za-z0-9]/g, "")
      .slice(0, 10)
      .toUpperCase()}`;

  function handleCopyReference() {
    navigator.clipboard?.writeText(displayRef).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <button
        type="button"
        aria-label={t("receipt.close")}
        onClick={onClose}
        className="fixed inset-0 cursor-default bg-black/70 backdrop-blur-md animate-fade-in-fast no-print"
      />

      {/* Slip / Voucher Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("receipt.title")}
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#0e0e12] p-6 sm:p-8 shadow-2xl backdrop-blur-2xl animate-scale-in"
      >
        {/* Header with bank logo */}
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-white/[0.08] pb-5">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.webp"
              alt="Trinax Bank"
              width={36}
              height={36}
              className="rounded-lg shadow"
            />
            <div>
              <p className="text-sm font-bold text-zinc-900 dark:text-white tracking-wide">
                Trinax Bank
              </p>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                {t("receipt.officialVoucher")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("receipt.close")}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/[0.06] hover:text-zinc-900 dark:hover:text-white transition-colors no-print"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Amount & Status Hero */}
        <div className="my-6 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 mb-3">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
            {t("receipt.completed")}
          </div>

          <p
            className={`text-3xl sm:text-4xl font-light tracking-tight tabular-nums ${
              isIncome
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-zinc-900 dark:text-white"
            }`}
          >
            {format.currency(isIncome ? transaction.amount : -transaction.amount, {
              signDisplay: "always",
            })}
          </p>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 font-medium">
            {format.dateTime(transaction.createdAt)}
          </p>
        </div>

        {/* Detailed Fields */}
        <div className="space-y-3 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] p-4 border border-zinc-200/80 dark:border-white/[0.06]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">
              {t("receipt.status")}
            </span>
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
              {t("receipt.completed")}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">
              {t("receipt.source")}
            </span>
            <span className="font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              {transaction.accountId
                ? `ACC-${transaction.accountId.slice(0, 6).toUpperCase()}`
                : t("receipt.trinaxAccount")}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">
              {t("receipt.destination")}
            </span>
            <span className="font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[200px]">
              {transaction.targetAccountId
                ? `ACC-${transaction.targetAccountId.slice(0, 6).toUpperCase()}`
                : transaction.description || typeLabel}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">
              {t("tx.description")}
            </span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-right truncate max-w-[200px]">
              {transaction.description || typeLabel}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">
              {t("receipt.fee")}
            </span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              {format.currency(0)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">
              {t("tx.category")}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="rounded-full bg-zinc-200/70 dark:bg-white/[0.08] px-2.5 py-0.5 text-[11px] font-medium text-zinc-800 dark:text-zinc-200">
                {typeLabel}
              </span>
              {categoryLabel && (
                <span className="rounded-full bg-primary-500/15 border border-primary-500/20 px-2.5 py-0.5 text-[11px] font-medium text-primary-800 dark:text-primary-300">
                  {categoryLabel}
                </span>
              )}
            </div>
          </div>

          <div className="border-t border-zinc-100 dark:border-white/[0.04] pt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-600 dark:text-zinc-400 font-medium">
                {t("tx.notes")}
              </span>
              {!isEditingNotes && (
                <button
                  type="button"
                  onClick={() => setIsEditingNotes(true)}
                  className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  {notes ? t("budgets.editBudget") : t("tx.addNotes")}
                </button>
              )}
            </div>

            {isEditingNotes ? (
              <div className="mt-2 space-y-2">
                <input
                  type="text"
                  maxLength={500}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("tx.notePlaceholder")}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-white/10 dark:bg-zinc-800 dark:text-white"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingNotes(false)}
                    className="rounded-lg px-2 py-1 text-[11px] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5"
                  >
                    {t("cards.cancel")}
                  </button>
                  <button
                    type="button"
                    disabled={isSavingNotes}
                    onClick={async () => {
                      setIsSavingNotes(true);
                      const fd = new FormData();
                      fd.set("transactionId", transaction.id);
                      fd.set("notes", notes);
                      const res = await updateTransactionNotes(fd);
                      setIsSavingNotes(false);
                      if (!res.error) {
                        setNotesSaved(true);
                        setIsEditingNotes(false);
                        setTimeout(() => setNotesSaved(false), 2000);
                      }
                    }}
                    className="rounded-lg bg-emerald-700 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-600"
                  >
                    {isSavingNotes ? "..." : t("tx.saveNotes")}
                  </button>
                </div>
              </div>
            ) : (
              notes && (
                <p className="mt-1 text-xs text-zinc-700 dark:text-zinc-300 italic">
                  &ldquo;{notes}&rdquo;
                </p>
              )
            )}
            {notesSaved && (
              <span className="block mt-1 text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                ✓ {t("tx.notesSaved")}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">
              {t("receipt.ref")}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                {displayRef}
              </span>
              <button
                type="button"
                onClick={handleCopyReference}
                className="text-zinc-500 dark:text-zinc-400 hover:text-primary-700 dark:hover:text-primary-400 transition-colors p-1"
                title={t("receipt.copyRef")}
                aria-label={t("receipt.copyRef")}
              >
                {copied ? (
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                    {t("receipt.copied")}
                  </span>
                ) : (
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
                      d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125-0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m11.25 4.125v-1.5"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center gap-3 no-print">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white/[0.08] dark:hover:bg-white/[0.12] dark:text-white px-4 py-2.5 text-xs font-semibold transition-all border border-transparent dark:border-white/10 shadow-sm"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.75}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.72 13.829c-.24-1.076-.672-2.03-1.28-2.829m13.12 2.829c.24-1.076.672-2.03 1.28-2.829M6.75 6.75h10.5a2.25 2.25 0 012.25 2.25v7.5a2.25 2.25 0 01-2.25 2.25H6.75a2.25 2.25 0 01-2.25-2.25v-7.5a2.25 2.25 0 012.25-2.25z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 16.5v.75m6-.75v.75"
              />
            </svg>
            {t("receipt.print")}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-200 dark:border-white/10 px-5 py-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06] hover:text-zinc-900 dark:hover:text-white transition-all"
          >
            {t("receipt.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
