"use client";

import { useState, useRef, useEffect } from "react";
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
};

export function NotificationBell({ notifications }: NotificationBellProps) {
  const { t } = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function handleOpen() {
    const next = !open;
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

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        aria-label={t("notif.title")}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-white/50 transition-all hover:bg-white/[0.05] hover:text-white/80"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-premium-coral px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] origin-top-right animate-scale-in rounded-xl border border-white/[0.08] bg-[#0d0d0d] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
            <span className="text-sm font-semibold text-white/80">{t("notif.title")}</span>
            {notifications.length > 0 && (
              <button onClick={handleClear} className="text-xs text-white/40 hover:text-premium-coral">
                {t("notif.clear")}
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-white/25">{t("notif.empty")}</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={`flex gap-3 border-b border-white/[0.03] px-4 py-3 ${n.read ? "" : "bg-white/[0.02]"}`}>
                  <span className="text-base leading-none">{TYPE_ICON[n.type] ?? "•"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white/80">{n.title}</p>
                    <p className="mt-0.5 text-xs text-white/45">{n.body}</p>
                    <p className="mt-1 text-[10px] text-white/25">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
