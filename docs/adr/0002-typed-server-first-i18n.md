# ADR-0002: Compile-Time Verified Server-First Bilingual i18n

## Status

**Accepted** — 2026-10-26

## Context

Trinax Bank supports both English (`en`) and Spanish (`es`) across all public pages, authentication screens, dashboard views, and printable statements. Client-only localization libraries often cause hydration mismatches or flashes of untranslated content (FOUC), and untyped JSON translation files frequently drift out of sync (missing keys in secondary locales or dead keys left behind after refactors).

## Decision

1. **Server-Cookie Locale Resolution**:
   - The active locale is stored in the `trinax-locale` cookie (`src/lib/i18n/server.ts`) and read on the server in `src/app/layout.tsx` before HTML rendering begins.
   - `<LanguageProvider initialLocale={initialLocale}>` hydrates with the exact locale used during SSR, eliminating layout shift and hydration warnings.

2. **TypeScript-Enforced Key Parity (`TranslationKey`)**:
   - `src/lib/i18n/en.ts` defines the canonical `en` dictionary `as const` and exports `type TranslationKey = keyof typeof en`.
   - `src/lib/i18n/es.ts` is typed as `Record<TranslationKey, string>`, making any missing or misspelled Spanish translation key a compile-time `tsc` error.

3. **Dead-Key & Parity Test Gate (`src/lib/i18n/i18n.test.ts`)**:
   - Automated Vitest checks verify that `en` and `es` have identical key sets, non-empty values, matching `{0}` placeholder tokens, and that **every** key in `en.ts` is referenced in `src/`.

## Consequences

- **Positive**: Zero runtime bundle overhead from external i18n frameworks, zero FOUC, compile-time autocomplete for `t("...")`, and automated prevention of dead or untranslated strings.
- **Negative**: Dynamic key lookups must use typed maps (such as `ACCOUNT_TYPE_KEYS`, `CATEGORY_KEYS`, `SECURITY_ACTION_KEYS` in `src/lib/i18n/labels.ts`) so the static scanner can verify every key's usage.
