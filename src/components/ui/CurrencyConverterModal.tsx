"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/ui/LanguageSwitcher";
import {
  CURRENCY_MAP,
  SUPPORTED_CURRENCIES,
  convertCurrency,
  type CurrencyCode,
} from "@/lib/currency";

interface CurrencyConverterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CurrencyConverterModal({ isOpen, onClose }: CurrencyConverterModalProps) {
  const { t } = useT();
  const [amount, setAmount] = useState<number>(100);
  const [from, setFrom] = useState<CurrencyCode>("USD");
  const [to, setTo] = useState<CurrencyCode>("EUR");

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const result = convertCurrency(amount, from, to);

  function handleSwap() {
    setFrom(to);
    setTo(from);
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
        aria-labelledby="fx-modal-title"
      >
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
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
                  d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </span>
            <div>
              <h2
                id="fx-modal-title"
                className="text-base font-bold text-zinc-900 dark:text-white"
              >
                {t("fx.title")}
              </h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {t("fx.subtitle")}
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
              htmlFor="fx-amount"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
            >
              {t("fx.amount")}
            </label>
            <input
              id="fx-amount"
              type="number"
              min="0.01"
              step="any"
              value={amount}
              onChange={(e) => setAmount(Math.max(0, parseFloat(e.target.value) || 0))}
              className="mt-1.5 block w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-base font-semibold text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-white/10 dark:bg-zinc-800 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-2">
            <div>
              <label
                htmlFor="fx-from"
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
              >
                {t("fx.from")}
              </label>
              <select
                id="fx-from"
                value={from}
                onChange={(e) => setFrom(e.target.value as CurrencyCode)}
                className="mt-1.5 block w-full rounded-xl border border-zinc-300 bg-white px-2.5 py-2 text-xs font-semibold text-zinc-900 dark:border-white/10 dark:bg-zinc-800 dark:text-white"
              >
                {SUPPORTED_CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {CURRENCY_MAP[code].flag} {code}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-5">
              <button
                type="button"
                onClick={handleSwap}
                aria-label={t("fx.swap")}
                title={t("fx.swap")}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-600 transition-all hover:bg-zinc-100 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
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
                    d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
                  />
                </svg>
              </button>
            </div>

            <div>
              <label
                htmlFor="fx-to"
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
              >
                {t("fx.to")}
              </label>
              <select
                id="fx-to"
                value={to}
                onChange={(e) => setTo(e.target.value as CurrencyCode)}
                className="mt-1.5 block w-full rounded-xl border border-zinc-300 bg-white px-2.5 py-2 text-xs font-semibold text-zinc-900 dark:border-white/10 dark:bg-zinc-800 dark:text-white"
              >
                {SUPPORTED_CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {CURRENCY_MAP[code].flag} {code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Conversion Result Display */}
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 text-center dark:border-emerald-950/60 dark:bg-emerald-950/20">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              {t("fx.converted")}
            </span>
            <span className="mt-1 block text-xs text-zinc-600 dark:text-zinc-400">
              {result.formattedFrom} ({CURRENCY_MAP[from].name}) =
            </span>
            <div className="mt-1 text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">
              {result.formattedTo} {to}
            </div>
            <div className="mt-2 text-[11px] text-zinc-600 dark:text-zinc-400">
              {t("fx.rate")}: 1 {from} = {result.rate} {to} • 1 {to} ={" "}
              {result.inverseRate} {from}
            </div>
          </div>

          <div className="rounded-xl bg-zinc-50 p-3 text-center text-xs text-zinc-600 dark:bg-zinc-800/40 dark:text-zinc-400">
            ✨ {t("fx.zeroFee")}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
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
