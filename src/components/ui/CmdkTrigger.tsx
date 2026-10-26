"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/ui/LanguageSwitcher";

interface CmdkTriggerProps {
  variant?: "desktop" | "mobile";
}

export function CmdkTrigger({ variant = "desktop" }: CmdkTriggerProps) {
  const { t } = useT();
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(
      typeof navigator !== "undefined" &&
        /Mac|iPhone|iPod|iPad/i.test(navigator.platform || navigator.userAgent),
    );
  }, []);

  function handleClick() {
    window.dispatchEvent(new CustomEvent("open-cmdk"));
  }

  if (variant === "mobile") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={t("cmdk.openSearch")}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-white transition-colors"
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
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={t("cmdk.openSearch")}
      className="group flex h-8 items-center gap-2.5 rounded-lg border border-zinc-200 bg-zinc-100/80 px-3 text-xs text-zinc-600 transition-all hover:border-zinc-300 hover:bg-zinc-200 hover:text-zinc-900 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400 dark:hover:border-white/20 dark:hover:bg-white/[0.06] dark:hover:text-zinc-200"
    >
      <svg
        className="h-3.5 w-3.5 text-zinc-600 transition-colors group-hover:text-primary-600 dark:text-zinc-400 dark:group-hover:text-primary-400"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.75}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        />
      </svg>
      <span>{t("cmdk.openSearch")}</span>
      <kbd className="ml-1 inline-flex items-center rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] font-mono text-zinc-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-400">
        {isMac ? t("cmdk.searchShortcut") : "Ctrl K"}
      </kbd>
    </button>
  );
}
