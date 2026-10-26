"use client";

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { markNotificationsRead, clearNotifications } from "@/lib/actions";
import { useT } from "@/components/ui/LanguageSwitcher";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

interface NotificationBellProps {
  notifications: NotificationItem[];
}

const TYPE_ICON: Record<string, string> = {
  low_balance: "⚠️",
  large_tx: "💸",
  scheduled: "🔁",
  goal: "🎯",
  info: "✅",
  interest: "💰",
  fee: "🧾",
};

export function NotificationBell({ notifications }: NotificationBellProps) {
  const { t, format } = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const unread = notifications.filter((n) => !n.read).length;

  const place = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    setPos({
      top: rect.bottom + 8,
      right: Math.max(8, window.innerWidth - rect.right),
    });
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  async function handleOpen() {
    const next = !open;
    if (next) place();
    setOpen(next);
    if (next && unread > 0) {
      await markNotificationsRead();
      router.refresh();
    }
  }

  async function handleClear() {
    await clearNotifications();
    setOpen(false);
    router.refresh();
  }

  const panel =
    open && pos
      ? createPortal(
          <div
            ref={panelRef}
            data-testid="notification-list"
            style={{ top: pos.top, right: pos.right }}
            className="fixed z-40 w-80 max-w-[calc(100vw-1rem)] origin-top-right animate-scale-in rounded-xl border border-zinc-200 bg-white text-zinc-900 shadow-2xl dark:border-white/[0.08] dark:bg-[#0d0d0d] dark:text-zinc-100"
          >
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-white/[0.08]">
              <span className="rounded-sm bg-white text-sm font-semibold text-zinc-900 dark:bg-[#0d0d0d] dark:text-zinc-100">
                {t("notif.title")}
              </span>
              <div className="flex items-center gap-3">
                {unread > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      await markNotificationsRead();
                      router.refresh();
                    }}
                    className="text-xs font-semibold text-primary-800 transition-colors hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                  >
                    {t("notif.markAllRead")}
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-xs font-medium text-zinc-600 transition-colors hover:text-premium-coral dark:text-zinc-400"
                  >
                    {t("notif.clear")}
                  </button>
                )}
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
                  {t("notif.empty")}
                </p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`flex gap-3 border-b border-zinc-100 px-4 py-3 dark:border-white/[0.06] ${n.read ? "" : "bg-zinc-50 dark:bg-white/[0.04]"}`}
                  >
                    <span className="text-base leading-none">
                      {TYPE_ICON[n.type] ?? "•"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {n.title}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-700 dark:text-zinc-300">
                        {n.body}
                      </p>
                      <p className="mt-1 font-mono text-[10px] text-zinc-600 dark:text-zinc-400">
                        {format.dateTime(n.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleOpen}
        aria-expanded={open}
        aria-label={t("notif.title")}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 transition-all hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[0.05] dark:hover:text-white"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-700 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {panel}
    </div>
  );
}
