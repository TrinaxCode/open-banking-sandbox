# Changelog

All notable changes to this project are documented here.

## [Unreleased]

- **Monthly Category Budgeting**: Spending limits per transaction category with real-time aggregate tracking, progress bars, threshold status alerts, and monthly breakdown in `src/lib/services/budgets.ts` and `/dashboard/budgets`.
- **Official Account Statements**: Monthly account statements generation, opening balance math from past ledgers, itemized running balance ledger, interest and fee accounting, and print/PDF styling in `src/lib/services/statements.ts` and `/dashboard/statements`.
- **Multi-Currency Simulator & Converter**: Foreign exchange rate conversions across 8 global currencies with reciprocal calculations in `src/lib/currency.ts` and interactive modal UI.
- **Bill Splitter**: Shared expenses and tip calculator with per-person share math and copyable summary.
- **Security Audit & Activity Trail**: Audit logging on logins, virtual card provisioning, freeze/unfreeze actions, transfers, and credential modifications in `src/lib/services/security.ts` and `/dashboard/profile`.
- **Transaction Notes**: User-editable personal notes on transaction records with inline detail modal editing.
- **Typed i18n**: the translation dictionary moved out of the component tree into
  `src/lib/i18n` (`en.ts` as the reference, `es.ts` typed against it), `t()` only
  accepts keys that exist, and labels built from domain values use the typed maps
  in `src/lib/i18n/labels.ts`. Tests fail if the two languages drift apart or a
  string is left unused.
- **Server-rendered locale**: the chosen language lives in a cookie the root layout
  reads, so the first paint is already correct (no Spanish flash for an English
  reader) and `<html lang>` matches the content. Metadata, too, is localised.
- Locale-aware formatting helpers: dates, numbers and currency now follow the
  active locale everywhere instead of a hardcoded `en-US`.
- `docs/postgres-migration.md` (migration workflow).
- Accessibility coverage with axe-core in the Playwright suite, plus ESLint
  `jsx-a11y` rules, a Content Security Policy, and stricter TypeScript flags.
- Prettier formatting enforced in CI, an end-to-end CI job, and coverage
  thresholds per layer.
- Unit tests for the server-action adapter layer, pinning the `{ success }` /
  `{ error }` contract and the cents-to-decimals conversion the UI depends on.

### Removed

- The `BalanceCard` component: dead code that no page rendered.

### Changed

- **Money is now stored as integer cents** (`Int`) instead of floating point
  (`Float`) in every account, transaction, goal, schedule and threshold column.
  Balances can no longer drift: the database, services and jobs work in cents and
  the UI receives decimal currency units, converted once at the page boundary.
- Database schema is managed with versioned migrations (`npm run db:migrate`,
  `db:deploy`, `db:reset`) instead of `prisma db push`.
- Rate limiting has a pluggable store: the in-process default, or a database store
  for multi-instance deployments (`RATE_LIMIT_DRIVER`).
- Analytics aggregates in SQL over a six-month window instead of loading up to
  1000 rows into memory.
- The "vs last month" figure on the dashboard is derived from real flows rather
  than an assumed 10% difference.
- Scheduled transfers no longer run per rule in their own transaction; the batch
  is preloaded and committed once.
- The demo seed creates a credit account, a peer user (`alice@banking.app`) that
  external transfers can actually reach, and relative dates so the charts stay
  meaningful over time.
- The language switcher writes a cookie instead of `localStorage`; every page is
  now rendered dynamically so the locale is known on the server.

### Fixed

- Demo account numbers use the same six-character suffix accepted by the forms,
  so scheduled transfers can target the seeded savings account.
- Authentication uses NextAuth's protocol-aware cookie defaults, keeping the
  session and middleware in agreement for local production builds and HTTPS.
  Integration tests verify session round trips, HttpOnly, SameSite, and Secure.
- Added the missing SQLite migration for category budgets, security logs, and
  transaction notes. Fresh installations and upgrades are checked against the
  Prisma schema, including preservation of existing balances and ledger rows.
- Scheduled transfers apply the configured external-transfer fee, record it in
  the ledger, and require enough funds for both the amount and fee. The creation
  form discloses the fee in both languages; transfers to your own accounts stay free.
- Dashboard job throttling is scoped to each user, so one user's visit cannot
  suppress another user's due work.
- The job endpoint returns HTTP 500 with `job_failed` when processing fails,
  instead of reporting a successful run. Dashboard job failures remain non-fatal.
- Scheduled-transfer and beneficiary forms reset and refresh correctly after an
  asynchronous save, without leaving their submit buttons stuck in a loading state.
- Money validation caps a single operation at $9,999,999.99 and rejects sub-cent
  amounts before they reach the database.
-Accessibility issues surfaced by the new lint rules: form labels are associated
  with their inputs, modal backdrops are real buttons, and the confirm dialog has
  dialog semantics and closes with Escape.
- **WCAG 2.1 AA Color Contrast & Viewport Compliance**: Upgraded secondary text,
  badges, and action buttons across dark and light themes to meet WCAG AA 4.5:1
  contrast ratios, removed `maximum-scale=1, user-scalable=no` from the viewport
  meta tag, and enabled `color-contrast` in `e2e/a11y.e2e.ts` with zero rule
  exclusions.
- **Full Bilingual Coverage & UX Polish**: Localized all remaining hardcoded
  strings in official statements, budget alerts, bill splitter clipboard shares,
  and security audit log action labels; replaced native `confirm()` in budgets
  with `ConfirmModal`; added `Escape` and backdrop dismissal to all utility
  modals; enabled external transfers for single-account users; and linked
  Account Detail quick actions directly to account-filtered transfers and
  statements.

## [0.1.0] - 2026-07-28

- Initial public release of the Open Banking Sandbox.
- Added demo banking flows, bilingual UI, validation, authentication, analytics, goals, beneficiaries, notifications, and scheduled transfers.
- Added automated tests, CI configuration, security guidance, contribution templates, and public-release documentation.
