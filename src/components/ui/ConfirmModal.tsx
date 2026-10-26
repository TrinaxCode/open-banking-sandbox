"use client";

import { useEffect, useId } from "react";
import { useT } from "@/components/ui/LanguageSwitcher";

interface DetailRow {
  label: string;
  value: string;
}

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  details?: DetailRow[];
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmModal({
  open,
  title,
  message,
  details,
  confirmLabel,
  cancelLabel,
  variant = "default",
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmModalProps) {
  const { t } = useT();
  const titleId = useId();
  const resolvedConfirm = confirmLabel ?? t("common.confirm");
  const resolvedCancel = cancelLabel === undefined ? t("common.cancel") : cancelLabel;

  useEffect(() => {
    if (!open) return;

    document.body.style.overflow = "hidden";

    // Escape closes the dialog, like any native one.
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={resolvedCancel}
        onClick={onCancel}
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm animate-fade-in-fast"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-sm animate-scale-in rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-white/[0.08] dark:bg-[#111]"
      >
        <h3 id={titleId} className="text-lg font-semibold text-zinc-900 dark:text-white">
          {title}
        </h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
          {message}
        </p>

        {details && details.length > 0 && (
          <div className="mt-4 space-y-2 rounded-lg bg-zinc-50 p-3 border border-zinc-200/60 dark:bg-white/[0.04] dark:border-white/5">
            {details.map((d, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-zinc-600 dark:text-zinc-400 font-medium">
                  {d.label}
                </span>
                <span className="text-zinc-900 dark:text-zinc-100 font-semibold">
                  {d.value}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex gap-3 justify-end">
          {resolvedCancel ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 transition-all hover:bg-zinc-100 hover:text-zinc-900 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/[0.08] dark:hover:text-white disabled:opacity-40"
            >
              {resolvedCancel}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all disabled:opacity-40 ${
              variant === "danger"
                ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 dark:border-red-500/20"
                : "bg-primary-500 text-zinc-950 font-bold hover:bg-primary-400 shadow-sm dark:bg-primary-500/10 dark:text-primary-400 dark:hover:bg-primary-500/20 dark:border dark:border-primary-500/20"
            }`}
          >
            {loading ? "..." : resolvedConfirm}
          </button>
        </div>
      </div>
    </div>
  );
}
