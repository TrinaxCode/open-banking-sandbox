# ADR-0003: Opportunistic Due-Jobs Engine & Idempotent Ledger Mutations

## Status

**Accepted** — 2026-10-26

## Context

A self-contained banking sandbox deployed to serverless platforms (such as Vercel) or run locally via `npm run dev` cannot rely on an external cron daemon always being configured to execute scheduled recurring transfers and monthly savings interest accruals. At the same time, network retries or duplicate form submissions must never double-debit or double-credit a customer's account.

## Decision

1. **Opportunistic + Cron Dual Execution (`runDueJobs`)**:
   - `src/lib/services/jobs.ts` implements `runDueJobs(userId)`, which processes any due `RecurringTransfer` rows (`nextRunDate <= now`) and monthly savings interest accruals (`lastInterestAt` older than the current month).
   - `runDueJobsThrottled(userId)` wraps `runDueJobs` with an in-memory per-user cooldown (`60_000 ms`) and is invoked opportunistically when `/dashboard` renders, ensuring scheduled transfers and interest accruals stay up to date without an external scheduler.
   - For production deployments, `/api/cron/run-due` exposes a Bearer-authenticated (`CRON_SECRET`) endpoint that executes `runDueJobs()` across all users.

2. **Idempotency Keys on Monetary Operations (`idem:<key>`)**:
   - `depositFunds`, `withdrawFunds`, `transferInternal`, `transferExternal`, and `simulateCardPurchase` in `src/lib/services/payments.ts` accept an optional `idempotencyKey`.
   - Inside the database `$transaction`, the service checks for an existing `Transaction` row for `(userId, accountId, type, reference: "idem:<key>")`. If present, the service returns the original outcome without mutating balances a second time.

## Consequences

- **Positive**: Zero-configuration background processing in local development and demos, production-grade `/api/cron/run-due` support, and safe retry semantics for monetary mutations.
- **Negative**: Opportunistic execution only runs when the user visits the dashboard unless `/api/cron/run-due` is scheduled.
