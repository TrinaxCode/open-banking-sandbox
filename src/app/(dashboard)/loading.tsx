"use client";

import { useT } from "@/components/ui/LanguageSwitcher";

export default function DashboardLoading() {
  const { t } = useT();

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-[#0a0a0a] transition-colors duration-200">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 dark:border-white/10 border-t-primary-500" />
        <p className="text-xs text-zinc-600 dark:text-zinc-400">{t("common.loading")}</p>
      </div>
    </div>
  );
}
