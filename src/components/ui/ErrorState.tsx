"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { useT } from "@/components/ui/LanguageSwitcher";

interface ErrorStateProps {
  error: Error & { digest?: string };
  reset: () => void;
  /** Fill the whole viewport (root boundary) instead of just the content area. */
  fullScreen?: boolean;
}

/**
 * Shared body of every `error.tsx` boundary.
 *
 * The raw error message is never shown (it can leak internals such as SQL or
 * file paths); the opaque `digest` that Next.js attaches to server errors is, so
 * a user can quote it and it can be matched against the server logs.
 */
export function ErrorState({ error, reset, fullScreen = false }: ErrorStateProps) {
  const { t } = useT();

  useEffect(() => {
    console.error("Unhandled UI error:", error);
  }, [error]);

  return (
    <div
      role="alert"
      className={`flex items-center justify-center bg-zinc-50 px-4 dark:bg-[#0a0a0a] ${
        fullScreen ? "min-h-screen" : "min-h-[60vh]"
      }`}
    >
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
          {t("error.title")}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          {t("error.description")}
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
            {t("error.reference")}: {error.digest}
          </p>
        )}
        <div className="flex gap-3">
          <Button onClick={reset}>{t("error.retry")}</Button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-xl border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-white/[0.16] dark:text-zinc-200 dark:hover:bg-white/[0.08]"
          >
            {t("error.home")}
          </Link>
        </div>
      </div>
    </div>
  );
}
