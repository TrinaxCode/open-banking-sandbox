"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/ui/LanguageSwitcher";
import { useTheme } from "@/components/ui/ThemeToggle";
import { CurrencyConverterModal } from "@/components/ui/CurrencyConverterModal";
import { BillSplitterModal } from "@/components/ui/BillSplitterModal";

interface CommandItem {
  id: string;
  category: "cmdk.navigation" | "cmdk.actions" | "cmdk.accounts";
  label: string;
  sublabel?: string;
  icon: string;
  onSelect: () => void;
}

export function CommandPalette() {
  const router = useRouter();
  const { t, locale, setLocale } = useT();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [showFxModal, setShowFxModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    }

    function handleCustomOpen() {
      setOpen(true);
    }

    function handleOpenFx() {
      setShowFxModal(true);
    }

    function handleOpenSplit() {
      setShowSplitModal(true);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-cmdk", handleCustomOpen);
    window.addEventListener("open-fx", handleOpenFx);
    window.addEventListener("open-split", handleOpenSplit);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-cmdk", handleCustomOpen);
      window.removeEventListener("open-fx", handleOpenFx);
      window.removeEventListener("open-split", handleOpenSplit);
    };
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [open]);

  const items: CommandItem[] = useMemo(() => {
    const nav: CommandItem[] = [
      {
        id: "nav-overview",
        category: "cmdk.navigation",
        label: t("nav.overview"),
        icon: "M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25",
        onSelect: () => router.push("/dashboard"),
      },
      {
        id: "nav-accounts",
        category: "cmdk.navigation",
        label: t("nav.accounts"),
        icon: "M12 4.5v15m7.5-7.5h-15",
        onSelect: () => router.push("/dashboard/accounts/new"),
      },
      {
        id: "nav-cards",
        category: "cmdk.navigation",
        label: t("nav.cards"),
        icon: "M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z",
        onSelect: () => router.push("/dashboard/cards"),
      },
      {
        id: "nav-transfer",
        category: "cmdk.navigation",
        label: t("nav.transfer"),
        icon: "M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5",
        onSelect: () => router.push("/dashboard/transfer"),
      },
      {
        id: "nav-scheduled",
        category: "cmdk.navigation",
        label: t("nav.scheduled"),
        icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
        onSelect: () => router.push("/dashboard/scheduled"),
      },
      {
        id: "nav-beneficiaries",
        category: "cmdk.navigation",
        label: t("nav.beneficiaries"),
        icon: "M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z",
        onSelect: () => router.push("/dashboard/beneficiaries"),
      },
      {
        id: "nav-deposit",
        category: "cmdk.navigation",
        label: t("nav.deposit"),
        icon: "M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15M12 1.5v12m0 0l-3-3m3 3l3-3",
        onSelect: () => router.push("/dashboard/deposit"),
      },
      {
        id: "nav-withdraw",
        category: "cmdk.navigation",
        label: t("nav.withdraw"),
        icon: "M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15M12 13.5V1.5m0 0l3 3m-3-3l-3 3",
        onSelect: () => router.push("/dashboard/withdraw"),
      },
      {
        id: "nav-goals",
        category: "cmdk.navigation",
        label: t("nav.goals"),
        icon: "M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5",
        onSelect: () => router.push("/dashboard/goals"),
      },
      {
        id: "nav-analytics",
        category: "cmdk.navigation",
        label: t("nav.analytics"),
        icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z",
        onSelect: () => router.push("/dashboard/analytics"),
      },
      {
        id: "nav-budgets",
        category: "cmdk.navigation",
        label: t("nav.budgets"),
        icon: "M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z",
        onSelect: () => router.push("/dashboard/budgets"),
      },
      {
        id: "nav-statements",
        category: "cmdk.navigation",
        label: t("nav.statements"),
        icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
        onSelect: () => router.push("/dashboard/statements"),
      },
      {
        id: "nav-history",
        category: "cmdk.navigation",
        label: t("nav.history"),
        icon: "M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z",
        onSelect: () => router.push("/dashboard/transactions"),
      },
      {
        id: "nav-profile",
        category: "cmdk.navigation",
        label: t("nav.profile"),
        icon: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 21a7.5 7.5 0 0115 0",
        onSelect: () => router.push("/dashboard/profile"),
      },
      {
        id: "nav-terms",
        category: "cmdk.navigation",
        label: t("common.terms"),
        icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
        onSelect: () => router.push("/terms"),
      },
    ];

    const actions: CommandItem[] = [
      {
        id: "action-transfer",
        category: "cmdk.actions",
        label: t("transfer.title"),
        sublabel: t("transfer.subtitle"),
        icon: "M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5",
        onSelect: () => router.push("/dashboard/transfer"),
      },
      {
        id: "action-deposit",
        category: "cmdk.actions",
        label: t("deposit.title"),
        sublabel: t("deposit.subtitle"),
        icon: "M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15M12 1.5v12m0 0l-3-3m3 3l3-3",
        onSelect: () => router.push("/dashboard/deposit"),
      },
      {
        id: "action-withdraw",
        category: "cmdk.actions",
        label: t("withdraw.title"),
        sublabel: t("withdraw.subtitle"),
        icon: "M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15M12 13.5V1.5m0 0l3 3m-3-3l-3 3",
        onSelect: () => router.push("/dashboard/withdraw"),
      },
      {
        id: "action-new-card",
        category: "cmdk.actions",
        label: t("cards.new"),
        sublabel: t("cards.subtitle"),
        icon: "M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z",
        onSelect: () => router.push("/dashboard/cards"),
      },
      {
        id: "action-new-goal",
        category: "cmdk.actions",
        label: t("goals.new"),
        sublabel: t("goals.subtitle"),
        icon: "M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5",
        onSelect: () => router.push("/dashboard/goals"),
      },
      {
        id: "action-new-account",
        category: "cmdk.actions",
        label: t("account.newTitle"),
        sublabel: t("account.newSubtitle"),
        icon: "M12 4.5v15m7.5-7.5h-15",
        onSelect: () => router.push("/dashboard/accounts/new"),
      },
      {
        id: "action-export",
        category: "cmdk.actions",
        label: t("tx.export"),
        sublabel: t("history.subtitle"),
        icon: "M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3",
        onSelect: () => router.push("/dashboard/transactions"),
      },
      {
        id: "action-fx",
        category: "cmdk.actions",
        label: t("cmdk.fx"),
        sublabel: t("fx.title"),
        icon: "M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5",
        onSelect: () => setShowFxModal(true),
      },
      {
        id: "action-split",
        category: "cmdk.actions",
        label: t("cmdk.split"),
        sublabel: t("split.title"),
        icon: "M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z",
        onSelect: () => setShowSplitModal(true),
      },
      {
        id: "action-toggle-lang",
        category: "cmdk.actions",
        label: t("cmdk.switchLanguage"),
        sublabel: locale === "es" ? "English" : "Español",
        icon: "M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896 3.025 2.33 5.86 4.232 8.332",
        onSelect: () => setLocale(locale === "es" ? "en" : "es"),
      },
      {
        id: "action-toggle-theme",
        category: "cmdk.actions",
        label: t("theme.toggle"),
        sublabel: theme === "dark" ? t("theme.light") : t("theme.dark"),
        icon:
          theme === "dark"
            ? "M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
            : "M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z",
        onSelect: () => toggleTheme(),
      },
    ];

    const accountsCommands: CommandItem[] = [
      {
        id: "account-checking",
        category: "cmdk.accounts",
        label: t("account.checking"),
        sublabel: t("account.newSubtitle"),
        icon: "M12 4.5v15m7.5-7.5h-15",
        onSelect: () => router.push("/dashboard/accounts/new"),
      },
      {
        id: "account-savings",
        category: "cmdk.accounts",
        label: t("account.savings"),
        sublabel: t("account.newSubtitle"),
        icon: "M12 4.5v15m7.5-7.5h-15",
        onSelect: () => router.push("/dashboard/accounts/new"),
      },
      {
        id: "account-manage",
        category: "cmdk.accounts",
        label: t("dashboard.accounts"),
        sublabel: t("dashboard.viewAll"),
        icon: "M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z",
        onSelect: () => router.push("/dashboard"),
      },
    ];

    return [...nav, ...actions, ...accountsCommands];
  }, [t, locale, setLocale, router, theme, toggleTheme]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.sublabel?.toLowerCase().includes(q) ||
        t(item.category).toLowerCase().includes(q),
    );
  }, [items, query, t]);

  function handleSelect(item: CommandItem) {
    setOpen(false);
    item.onSelect();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (filteredItems.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(
        (prev) => (prev - 1 + filteredItems.length) % filteredItems.length,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const chosen = filteredItems[selectedIndex];
      if (chosen) handleSelect(chosen);
    }
  }

  if (!open && !showFxModal && !showSplitModal) return null;

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24">
          {/* Backdrop */}
          <button
            type="button"
            aria-label={t("nav.close")}
            onClick={() => setOpen(false)}
            className="fixed inset-0 cursor-default bg-black/70 backdrop-blur-md animate-fade-in-fast"
          />

          {/* Modal Card */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("cmdk.title")}
            className="relative flex max-h-[80vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white/95 shadow-2xl backdrop-blur-2xl animate-scale-in dark:border-white/[0.12] dark:bg-[#0d0d0f]/95"
          >
            {/* Search header */}
            <div className="flex items-center border-b border-zinc-200 px-4 py-3.5 dark:border-white/[0.08]">
              <svg
                className="h-5 w-5 text-primary-500 dark:text-primary-400 shrink-0 mr-3"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder={t("cmdk.placeholder")}
                aria-label={t("cmdk.placeholder")}
                className="flex-1 bg-transparent text-sm text-zinc-900 placeholder-zinc-400 outline-none dark:text-white dark:placeholder-zinc-500"
              />
              <kbd className="hidden sm:inline-flex items-center rounded border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[10px] font-mono text-zinc-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-400">
                ESC
              </kbd>
            </div>

            {/* Results List */}
            <div className="overflow-y-auto p-2 max-h-[60vh]">
              {filteredItems.length === 0 ? (
                <div className="py-12 text-center text-sm text-zinc-600 dark:text-zinc-400">
                  {t("cmdk.noResults")}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredItems.map((item, idx) => {
                    const isSelected = idx === selectedIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`flex w-full items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-left text-sm transition-all ${
                          isSelected
                            ? "bg-primary-50 text-zinc-900 border border-primary-200 dark:bg-primary-500/15 dark:text-white dark:border-primary-500/30"
                            : "text-zinc-700 hover:bg-zinc-100 border border-transparent dark:text-zinc-300 dark:hover:bg-white/[0.04]"
                        }`}
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            isSelected
                              ? "bg-primary-500 text-zinc-950 font-bold"
                              : "bg-zinc-100 text-zinc-600 dark:bg-white/[0.06] dark:text-zinc-300"
                          }`}
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
                              d={item.icon}
                            />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-zinc-900 dark:text-white truncate">
                            {item.label}
                          </p>
                          {item.sublabel && (
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                              {item.sublabel}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                          {t(item.category)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer shortcuts hint */}
            <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-4 py-2.5 text-[11px] text-zinc-600 dark:border-white/[0.08] dark:bg-black/40 dark:text-zinc-400">
              <div className="flex items-center gap-3">
                <span>
                  <kbd className="font-mono text-zinc-700 dark:text-zinc-300">↑↓</kbd>{" "}
                  {t("cmdk.navigate")}
                </span>
                <span>
                  <kbd className="font-mono text-zinc-700 dark:text-zinc-300">↵</kbd>{" "}
                  {t("cmdk.select")}
                </span>
                <span>
                  <kbd className="font-mono text-zinc-700 dark:text-zinc-300">esc</kbd>{" "}
                  {t("cmdk.close")}
                </span>
              </div>
              <span className="text-primary-600 dark:text-primary-400 font-medium">
                Trinax Bank
              </span>
            </div>
          </div>
        </div>
      )}

      <CurrencyConverterModal
        isOpen={showFxModal}
        onClose={() => setShowFxModal(false)}
      />
      <BillSplitterModal
        isOpen={showSplitModal}
        onClose={() => setShowSplitModal(false)}
      />
    </>
  );
}
