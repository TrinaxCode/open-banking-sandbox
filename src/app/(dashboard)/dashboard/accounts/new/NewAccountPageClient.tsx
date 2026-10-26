"use client";

import { CreateAccountForm } from "@/components/accounts/CreateAccountForm";
import { useT } from "@/components/ui/LanguageSwitcher";
import Link from "next/link";

export function NewAccountPageClient({ usedTypes }: { usedTypes: string[] }) {
  const { t } = useT();
  const usedSet = new Set(usedTypes);

  return (
    <div className="mx-auto max-w-2xl animate-fade-in space-y-8 p-4 sm:p-6 lg:p-8">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors font-medium"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
          {t("common.back")}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">
          {t("account.newTitle")}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 font-medium">
          {t("account.newSubtitle")}
        </p>
      </div>
      <CreateAccountForm usedTypes={usedSet} />
    </div>
  );
}
