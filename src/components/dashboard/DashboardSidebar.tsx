"use client";

import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { LanguageSwitcher, useT } from "@/components/ui/LanguageSwitcher";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

interface DashboardSidebarProps {
  userName: string;
}

export function DashboardSidebar({ userName }: DashboardSidebarProps) {
  const pathname = usePathname();
  const { t } = useT();

  const navItems = [
    {
      label: t("nav.overview"),
      href: "/dashboard",
      icon: "M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25",
    },
    {
      label: t("nav.accounts"),
      href: "/dashboard/accounts/new",
      icon: "M12 4.5v15m7.5-7.5h-15",
    },
    {
      label: t("nav.cards"),
      href: "/dashboard/cards",
      icon: "M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z",
    },
    {
      label: t("nav.transfer"),
      href: "/dashboard/transfer",
      icon: "M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5",
    },
    {
      label: t("nav.scheduled"),
      href: "/dashboard/scheduled",
      icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
    },
    {
      label: t("nav.beneficiaries"),
      href: "/dashboard/beneficiaries",
      icon: "M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z",
    },
    {
      label: t("nav.deposit"),
      href: "/dashboard/deposit",
      icon: "M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15M12 1.5v12m0 0l-3-3m3 3l3-3",
    },
    {
      label: t("nav.withdraw"),
      href: "/dashboard/withdraw",
      icon: "M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15M12 13.5V1.5m0 0l3 3m-3-3l-3 3",
    },
    {
      label: t("nav.goals"),
      href: "/dashboard/goals",
      icon: "M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5",
    },
    {
      label: t("nav.budgets"),
      href: "/dashboard/budgets",
      icon: "M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z",
    },
    {
      label: t("nav.analytics"),
      href: "/dashboard/analytics",
      icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z",
    },
    {
      label: t("nav.statements"),
      href: "/dashboard/statements",
      icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
    },
    {
      label: t("nav.history"),
      href: "/dashboard/transactions",
      icon: "M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z",
    },
    {
      label: t("nav.profile"),
      href: "/dashboard/profile",
      icon: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 21a7.5 7.5 0 0115 0",
    },
  ];

  function isActive(href: string): boolean {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <aside className="hidden w-56 flex-shrink-0 border-r border-zinc-200 bg-white lg:flex lg:flex-col dark:border-white/[0.04] dark:bg-[#0a0a0a]">
      {/* Brand — centered big logo */}
      <div className="flex h-24 shrink-0 items-center justify-center border-b border-zinc-200 dark:border-white/[0.04]">
        <Image
          src="/logo.webp"
          alt="Trinax Bank"
          width={56}
          height={56}
          className="rounded-xl"
          priority
        />
      </div>

      {/* Nav — scrollable when viewport is short */}
      <nav className="flex-1 overflow-y-auto overscroll-contain space-y-0.5 px-2 py-4">
        {navItems.map((item, i) => {
          const active = isActive(item.href);
          return (
            <div
              key={item.href}
              className="animate-fade-in"
              style={{ animationDelay: `${i * 40}ms`, animationFillMode: "backwards" }}
            >
              <Link
                href={item.href}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-zinc-100 text-zinc-950 font-semibold dark:bg-white/[0.08] dark:text-white"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-white/[0.04] dark:hover:text-white"
                }`}
              >
                <svg
                  className="h-4 w-4 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                {item.label}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-zinc-200 dark:border-white/[0.06] px-3 py-3">
        <div className="flex items-center justify-between px-3 py-1">
          <div className="flex items-center gap-1.5">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold text-zinc-700 dark:bg-white/[0.08] dark:text-zinc-200">
            {userName.charAt(0).toUpperCase()}
          </div>
          <span className="truncate font-medium">{userName}</span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-0.5 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-600 transition-all hover:bg-red-50 hover:text-red-600 font-medium dark:text-zinc-400 dark:hover:bg-white/[0.04] dark:hover:text-red-400"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
            />
          </svg>
          {t("nav.signout")}
        </button>
      </div>
    </aside>
  );
}
