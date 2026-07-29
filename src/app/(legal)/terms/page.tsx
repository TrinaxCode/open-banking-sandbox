"use client";

import { useRouter } from "next/navigation";
import { useT } from "@/components/ui/LanguageSwitcher";

export default function TermsPage() {
  const router = useRouter();
  const { t } = useT();

  const sections = [
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
    <main className="relative min-h-screen bg-[#0a0a0a] py-24">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-gradient-to-b from-primary-500/5 to-transparent blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-3xl px-6">
        <button
          onClick={() => router.back()}
          className="mb-8 inline-flex items-center gap-1.5 text-xs font-medium tracking-wide text-white/20 uppercase transition-colors hover:text-white/50"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          {t("common.back")}
        </button>

        <h1 className="text-3xl font-semibold tracking-tight text-white">
          {t("terms.title")}
        </h1>
        <p className="mt-2 text-sm text-white/30">
          {t("terms.lastUpdated")}: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>

        <div className="mt-10 space-y-8 text-sm text-white/50 leading-relaxed">
          {sections.map((s, i) => (
            <section key={i}>
              <h2 className="mb-3 text-base font-semibold text-white/80">{t(s.titleKey)}</h2>
              <p>
                {t(s.textKey)}{" "}
                {s.titleKey === "terms.aboutTitle" && (
                  <a href="https://github.com/TrinaxCode" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:underline">
                    TrinaxCode
                  </a>
                )}
                {s.titleKey === "terms.contactTitle" && (
                  <a href="https://github.com/TrinaxCode" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:underline font-semibold">
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
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-2 text-xs font-medium text-white/40 transition-all hover:border-white/[0.15] hover:text-white/70"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            {t("common.back")}
          </button>
        </div>
      </div>
    </main>
  );
}
