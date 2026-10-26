"use client";

import { useRouter } from "next/navigation";
import { LanguageSwitcher, useT } from "@/components/ui/LanguageSwitcher";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import type { TranslationKey } from "@/lib/i18n";

export default function TermsPage() {
  const router = useRouter();
  const { t, format } = useT();

  const sections: { titleKey: TranslationKey; textKey: TranslationKey }[] = [
    { titleKey: "terms.aboutTitle", textKey: "terms.aboutText" },
    { titleKey: "terms.acceptanceTitle", textKey: "terms.acceptanceText" },
    { titleKey: "terms.serviceTitle", textKey: "terms.serviceText" },
    { titleKey: "terms.securityTitle", textKey: "terms.securityText" },
    { titleKey: "terms.privacyTitle", textKey: "terms.privacyText" },
    { titleKey: "terms.cardsTitle", textKey: "terms.cardsText" },
    { titleKey: "terms.liabilityTitle", textKey: "terms.liabilityText" },
    { titleKey: "terms.ipTitle", textKey: "terms.ipText" },
    { titleKey: "terms.changesTitle", textKey: "terms.changesText" },
    { titleKey: "terms.contactTitle", textKey: "terms.contactText" },
  ];

  return (
    <main className="relative min-h-screen bg-zinc-50 text-zinc-900 dark:bg-[#0a0a0a] dark:text-zinc-100 py-24 transition-colors duration-200">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-gradient-to-b from-primary-500/10 dark:from-primary-500/5 to-transparent blur-3xl" />
      </div>

      <div className="absolute right-6 top-6 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <div className="relative mx-auto max-w-3xl px-6">
        <button
          onClick={() => router.back()}
          className="mb-8 inline-flex items-center gap-1.5 text-xs font-medium tracking-wide text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white uppercase transition-colors"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
          {t("common.back")}
        </button>

        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white">
          {t("terms.title")}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {t("terms.lastUpdated")}: {format.longDate(new Date())}
        </p>

        <div className="mt-10 space-y-8 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
          {sections.map((s, i) => (
            <section key={i}>
              <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-white">
                {t(s.titleKey)}
              </h2>
              <p>
                {t(s.textKey)}{" "}
                {s.titleKey === "terms.aboutTitle" && (
                  <a
                    href="https://github.com/TrinaxCode"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-700 dark:text-primary-400 hover:underline"
                  >
                    TrinaxCode
                  </a>
                )}
                {s.titleKey === "terms.contactTitle" && (
                  <a
                    href="https://github.com/TrinaxCode"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-700 dark:text-primary-400 hover:underline font-semibold"
                  >
                    TrinaxCode
                  </a>
                )}
              </p>
            </section>
          ))}
        </div>

        <div className="mt-12">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white/80 dark:border-white/[0.06] dark:bg-white/[0.02] px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 transition-all hover:border-zinc-300 dark:hover:border-white/[0.15] hover:text-zinc-900 dark:hover:text-white shadow-sm dark:shadow-none"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>
            {t("common.back")}
          </button>
        </div>
      </div>
    </main>
  );
}
