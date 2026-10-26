# ADR-0001: Integer-Cents Money Boundary & Atomic Balance Guards

## Status

**Accepted** — 2026-10-26

## Context

Financial applications that store or manipulate monetary values as IEEE 754 floating-point numbers (`Float`) suffer from representation drift (`0.1 + 0.2 === 0.30000000000000004`), rounding discrepancies across ledger legs, and subtle balance mismatches between running totals and monthly statements.

Furthermore, a naive read-then-write balance check (`if (account.balance >= amount) update(...)`) is vulnerable to Time-of-Check to Time-of-Use (TOCTOU) race conditions when two concurrent requests debit the same account simultaneously.

## Decision

1. **Integer Cents Everywhere in Storage and Services**:
   - All database columns (`balanceCents`, `creditLimitCents`, `amountCents`, `targetAmountCents`, `currentAmountCents`, `lowBalanceThresholdCents`, `largeTxThresholdCents`) are stored as `Int` in Prisma (`prisma/schema.prisma`).
   - All domain services (`src/lib/services/*`) accept and return integer cents exclusively.
   - Conversion between user-entered decimal strings/numbers and integer cents occurs strictly at the UI/serialization boundary via `toCents()` and `fromCents()` (`src/lib/money.ts`) and `serializeAccount()` / `serializeTransaction()` (`src/lib/serialize.ts`).

2. **Conditional Atomic Debit Guards (`updateMany`)**:
   - Every debit operation (`withdrawFunds`, `transferInternal`, `transferExternal`, `simulateCardPurchase`, `contributeToGoal`) executes inside a Prisma `$transaction` and performs a conditional `updateMany` with a `WHERE balanceCents >= requiredCents` (or `balanceCents >= amountCents - creditLimitCents` for credit lines).
   - If `guard.count === 0`, the transaction aborts with a typed `ServiceException("insufficient_funds" | "credit_limit_exceeded")`, preventing concurrent overdraws at the database engine level.

## Alternatives Considered

- **`Decimal` / `BigDecimal` database columns**: Higher ceremony in SQLite and JavaScript serialization without benefit for single-currency USD/EUR cent-precision operations.
- **Optimistic locking with a version column**: Requires retry loops on contention, whereas a single conditional `UPDATE ... WHERE balance_cents >= ?` is atomic in both SQLite and PostgreSQL.

## Consequences

- **Positive**: Zero floating-point drift; fast integer arithmetic; 100% deterministic statement reconciliation (`openingBalanceCents + netChangeCents === closingBalanceCents`).
- **Negative**: Requires explicit `toCents` / `fromCents` conversion at the Server Action boundary, enforced by unit and property-like tests in `src/lib/__tests__/money.test.ts` and `src/lib/services/__tests__/payments.test.ts`.
