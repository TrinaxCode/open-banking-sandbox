"use client";

import Link from "next/link";
import { useT } from "@/components/ui/LanguageSwitcher";

export default function NotFound() {
  const { t } = useT();

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-[#0a0a0a]">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <p className="text-5xl font-extrabold text-primary-500">404</p>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
          {t("notFound.title")}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {t("notFound.description")}
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-bold text-zinc-950 shadow-glow transition-colors hover:bg-primary-400"
        >
          {t("error.home")}
        </Link>
      </div>
    </div>
  );
}
