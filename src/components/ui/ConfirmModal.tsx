"use client";

import { useEffect } from "react";

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
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in-fast" onClick={onCancel} />
      <div className="relative w-full max-w-sm animate-scale-in rounded-2xl border border-white/[0.08] bg-[#111] p-6 shadow-glass-lg">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm text-white/50 leading-relaxed">{message}</p>

        {details && details.length > 0 && (
          <div className="mt-4 space-y-2 rounded-lg bg-white/[0.03] p-3">
            {details.map((d, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-white/40">{d.label}</span>
                <span className="text-white/80 font-medium">{d.value}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex gap-3 justify-end">
          {cancelLabel ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="rounded-lg border border-white/[0.08] px-4 py-2 text-xs font-medium text-white/50 transition-all hover:bg-white/[0.04] hover:text-white/80 disabled:opacity-40"
            >
              {cancelLabel}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all disabled:opacity-40 ${
              variant === "danger"
                ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                : "bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 border border-primary-500/20"
            }`}
          >
            {loading ? "..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
