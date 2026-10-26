import { describe, it, expect } from "vitest";
import {
  DAYS_PER_YEAR,
  MAX_ACCRUAL_DAYS,
  accrualCents,
  accrualWindowDays,
  daysBetween,
} from "./interest";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("interest accrual", () => {
  it("pays simple daily interest on a savings balance", () => {
    // $10,000.00 at 3.5% for one year = $350.00
    expect(
      accrualCents({
        type: "savings",
        balanceCents: 1_000_000,
        annualRatePct: 3.5,
        days: DAYS_PER_YEAR,
      }),
    ).toBe(35_000);
  });

  it("rounds down: the bank never invents a cent", () => {
    // 1999 cents at 3.5% for one day = 0.1917 cents
    expect(
      accrualCents({
        type: "savings",
        balanceCents: 1_999,
        annualRatePct: 3.5,
        days: 1,
      }),
    ).toBe(0);
    // 1275000 * 3.5 / 100 / 365 = 122.26 -> 122 cents
    expect(
      accrualCents({
        type: "savings",
        balanceCents: 1_275_000,
        annualRatePct: 3.5,
        days: 1,
      }),
    ).toBe(122);
  });

  it("charges interest on credit debt (negative from the holder's side)", () => {
    const charged = accrualCents({
      type: "credit",
      balanceCents: -125_050,
      annualRatePct: 19.99,
      days: 30,
    });
    expect(charged).toBeLessThan(0);
    expect(Math.abs(charged)).toBe(Math.floor((125_050 * 19.99 * 30) / 100 / 365));
  });

  it("returns zero when nothing is owed", () => {
    expect(
      accrualCents({ type: "savings", balanceCents: 0, annualRatePct: 3.5, days: 10 }),
    ).toBe(0);
    expect(
      accrualCents({ type: "savings", balanceCents: 1_000, annualRatePct: 0, days: 10 }),
    ).toBe(0);
    expect(
      accrualCents({
        type: "savings",
        balanceCents: 1_000,
        annualRatePct: null,
        days: 10,
      }),
    ).toBe(0);
    expect(
      accrualCents({ type: "savings", balanceCents: 1_000, annualRatePct: 3.5, days: 0 }),
    ).toBe(0);
    expect(
      accrualCents({
        type: "savings",
        balanceCents: -1_000,
        annualRatePct: 3.5,
        days: 10,
      }),
    ).toBe(0);
  });

  it("does not charge interest on a credit balance that is not debt", () => {
    expect(
      accrualCents({
        type: "credit",
        balanceCents: 5_000, // overpaid card
        annualRatePct: 19.99,
        days: 30,
      }),
    ).toBe(0);
  });

  it("treats a never-accrued account as one day old", () => {
    expect(accrualWindowDays(null, new Date())).toBe(1);
  });

  it("caps the window so a long absence cannot backfill months", () => {
    const now = new Date("2026-06-30T12:00:00Z");
    const longAgo = new Date(now.getTime() - 200 * DAY_MS);
    expect(accrualWindowDays(longAgo, now)).toBe(MAX_ACCRUAL_DAYS);
  });

  it("never returns a negative window", () => {
    const now = new Date("2026-06-30T12:00:00Z");
    const future = new Date(now.getTime() + 5 * DAY_MS);
    expect(accrualWindowDays(future, now)).toBe(0);
  });

  it("counts whole days between two dates", () => {
    const from = new Date("2026-06-01T00:00:00Z");
    expect(daysBetween(from, new Date("2026-06-03T23:00:00Z"))).toBe(2);
    expect(daysBetween(from, from)).toBe(0);
  });
});
