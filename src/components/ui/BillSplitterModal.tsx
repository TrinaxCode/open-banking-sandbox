"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/ui/LanguageSwitcher";
import { formatCurrency } from "@/lib/i18n/format";

interface BillSplitterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TIP_OPTIONS = [0, 10, 15, 18, 20];

export function BillSplitterModal({ isOpen, onClose }: BillSplitterModalProps) {
  const { t, locale } = useT();
  const [totalBill, setTotalBill] = useState<number>(60);
  const [people, setPeople] = useState<number>(3);
  const [tipPercent, setTipPercent] = useState<number>(15);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const tipAmount = (totalBill * tipPercent) / 100;
  const grandTotal = totalBill + tipAmount;
  const perPerson = people > 0 ? grandTotal / people : grandTotal;

  async function handleCopy() {
    const text = `🧾 Trinax Bank — ${t("split.title")}:\n${t("split.total")}: ${formatCurrency(totalBill, locale)}\n${t("split.tipAmount")} (${tipPercent}%): ${formatCurrency(tipAmount, locale)}\nTotal: ${formatCurrency(grandTotal, locale)}\n${t("split.people")}: ${people}\n${t("split.perPerson")}: ${formatCurrency(perPerson, locale)}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={t("receipt.close")}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-zinc-950/60 backdrop-blur-sm animate-fade-in"
      />
      <div
        className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-zinc-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="split-modal-title"
      >
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.75}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
            </span>
            <div>
              <h2
                id="split-modal-title"
                className="text-base font-bold text-zinc-900 dark:text-white"
              >
                {t("split.title")}
              </h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {t("split.subtitle")}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label={t("receipt.close")}
            onClick={onClose}
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

        <div className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="split-total"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
            >
              {t("split.total")} ($)
            </label>
            <input
              id="split-total"
              type="number"
              min="1"
              step="any"
              value={totalBill}
              onChange={(e) => setTotalBill(Math.max(0, parseFloat(e.target.value) || 0))}
              className="mt-1.5 block w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-base font-semibold text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-zinc-800 dark:text-white"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="split-people"
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
              >
                {t("split.people")}
              </label>
              <span className="text-xs font-bold text-zinc-900 dark:text-white">
                {people}
              </span>
            </div>
            <input
              id="split-people"
              type="range"
              min="2"
              max="12"
              value={people}
              onChange={(e) => setPeople(parseInt(e.target.value, 10))}
              className="mt-2 w-full accent-blue-600"
            />
          </div>

          <div role="group" aria-labelledby="split-tip-label">
            <span
              id="split-tip-label"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
            >
              {t("split.tip")}
            </span>
            <div className="mt-1.5 flex gap-1.5">
              {TIP_OPTIONS.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  aria-pressed={tipPercent === pct}
                  onClick={() => setTipPercent(pct)}
                  className={`flex-1 rounded-xl py-1.5 text-xs font-semibold transition-all ${
                    tipPercent === pct
                      ? "bg-blue-700 text-white shadow-sm"
                      : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Breakdown summary */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-center dark:border-blue-950/60 dark:bg-blue-950/20">
            <span className="text-xs text-zinc-600 dark:text-zinc-400">
              {t("split.perPerson")}
            </span>
            <div className="mt-1 text-3xl font-extrabold text-blue-700 dark:text-blue-400">
              {formatCurrency(perPerson, locale)}
            </div>
            <div className="mt-2 flex items-center justify-center gap-4 text-xs text-zinc-600 dark:text-zinc-400">
              <span>
                {t("split.tipAmount")}: {formatCurrency(tipAmount, locale)}
              </span>
              <span>•</span>
              <span>Total: {formatCurrency(grandTotal, locale)}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5"
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
                d="M15.75 17.25v2.25A2.25 2.25 0 0113.5 21.75h-7.5A2.25 2.25 0 013.75 19.5V7.5a2.25 2.25 0 012.25-2.25h2.25m3 0h6.75A2.25 2.25 0 0120.25 7.5v9a2.25 2.25 0 01-2.25 2.25h-6.75a2.25 2.25 0 01-2.25-2.25V5.25"
              />
            </svg>
            {copied ? t("split.copied") : t("split.copyShare")}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {t("receipt.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
