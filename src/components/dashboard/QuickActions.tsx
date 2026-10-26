"use client";

import Link from "next/link";
import { useT } from "@/components/ui/LanguageSwitcher";
import type { TranslationKey } from "@/lib/i18n";

interface QuickAction {
  key: TranslationKey;
  href: string;
  icon: string;
  gradient: string;
  border: string;
  iconBg: string;
  iconColor: string;
  hoverBorder: string;
}

const actionKeys: QuickAction[] = [
  {
    key: "nav.deposit",
    href: "/dashboard/deposit",
    icon: "M12 4.5v15m7.5-7.5h-15",
    gradient:
      "from-emerald-500/10 to-transparent dark:from-emerald-950/50 dark:to-transparent",
    border: "border-emerald-500/20 dark:border-emerald-500/15",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    hoverBorder: "hover:border-emerald-500/40 dark:hover:border-emerald-500/30",
  },
  {
    key: "nav.withdraw",
    href: "/dashboard/withdraw",
    icon: "M19.5 12h-15",
    gradient:
      "from-orange-500/10 to-transparent dark:from-orange-950/50 dark:to-transparent",
    border: "border-orange-500/20 dark:border-orange-500/15",
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-600 dark:text-orange-400",
    hoverBorder: "hover:border-orange-500/40 dark:hover:border-orange-500/30",
  },
  {
    key: "nav.transfer",
    href: "/dashboard/transfer",
    icon: "M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5",
    gradient:
      "from-amber-500/10 to-transparent dark:from-amber-950/50 dark:to-transparent",
    border: "border-amber-500/20 dark:border-amber-500/15",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-600 dark:text-amber-400",
    hoverBorder: "hover:border-amber-500/40 dark:hover:border-amber-500/30",
  },
  {
    key: "nav.cards",
    href: "/dashboard/cards",
    icon: "M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z",
    gradient:
      "from-purple-500/10 to-transparent dark:from-purple-950/50 dark:to-transparent",
    border: "border-purple-500/20 dark:border-purple-500/15",
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-600 dark:text-purple-400",
    hoverBorder: "hover:border-purple-500/40 dark:hover:border-purple-500/30",
  },
  {
    key: "nav.budgets",
    href: "/dashboard/budgets",
    icon: "M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z",
    gradient: "from-teal-500/10 to-transparent dark:from-teal-950/50 dark:to-transparent",
    border: "border-teal-500/20 dark:border-teal-500/15",
    iconBg: "bg-teal-500/10",
    iconColor: "text-teal-600 dark:text-teal-400",
    hoverBorder: "hover:border-teal-500/40 dark:hover:border-teal-500/30",
  },
  {
    key: "nav.statements",
    href: "/dashboard/statements",
    icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
    gradient: "from-blue-500/10 to-transparent dark:from-blue-950/50 dark:to-transparent",
    border: "border-blue-500/20 dark:border-blue-500/15",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-600 dark:text-blue-400",
    hoverBorder: "hover:border-blue-500/40 dark:hover:border-blue-500/30",
  },
  {
    key: "common.deleteAccount",
    href: "/dashboard/accounts/delete",
    icon: "M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0",
    gradient: "from-red-500/10 to-transparent dark:from-red-950/50 dark:to-transparent",
    border: "border-red-500/20 dark:border-red-500/15",
    iconBg: "bg-red-500/10",
    iconColor: "text-red-600 dark:text-red-400",
    hoverBorder: "hover:border-red-500/40 dark:hover:border-red-500/30",
  },
  {
    key: "dashboard.newAccountBtn",
    href: "/dashboard/accounts/new",
    icon: "M12 4.5v15m7.5-7.5h-15",
    gradient: "from-zinc-100 to-transparent dark:from-zinc-800/30 dark:to-transparent",
    border: "border-zinc-300 dark:border-zinc-600/15",
    iconBg: "bg-zinc-200/80 dark:bg-zinc-600/10",
    iconColor: "text-zinc-700 dark:text-zinc-300",
    hoverBorder: "hover:border-zinc-400 dark:hover:border-zinc-500/30",
  },
];

export function QuickActions() {
  const { t } = useT();

  return (
    <div
      data-testid="quick-actions"
      className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 landscape:grid-cols-2"
    >
      {actionKeys.map((action, index) => (
        <Link
          key={action.href}
          href={action.href}
          className={`animate-fade-in group flex items-center gap-4 rounded-xl border bg-white bg-gradient-to-br px-4 py-3.5 shadow-sm transition-all duration-300 hover:scale-[1.02] dark:bg-zinc-900 dark:shadow-none ${action.gradient} ${action.border} ${action.hoverBorder}`}
          style={{ animationDelay: `${index * 60}ms`, animationFillMode: "backwards" }}
        >
          <div
            className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${action.iconBg} ${action.iconColor} transition-all group-hover:scale-105`}
          >
            <svg
              className="h-5 w-5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d={action.icon} />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-zinc-900 transition-colors group-hover:text-zinc-950 dark:text-zinc-100 dark:group-hover:text-white">
              {t(action.key)}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
