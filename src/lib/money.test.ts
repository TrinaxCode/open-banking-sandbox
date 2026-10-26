import { describe, it, expect } from "vitest";
import {
  toCents,
  fromCents,
  subCents,
  isZeroCents,
  formatCents,
  formatMoney,
  MAX_TRANSACTION_CENTS,
} from "./money";

describe("money helpers (cents-first)", () => {
  it("toCents rounds to the nearest cent", () => {
    expect(toCents(19.99)).toBe(1999);
    expect(toCents(0.1)).toBe(10);
    expect(toCents(1.005)).toBe(101);
    expect(toCents(0)).toBe(0);
    expect(toCents(-12.34)).toBe(-1234);
  });

  it("toCents guards non-finite input", () => {
    expect(toCents(NaN)).toBe(0);
    expect(toCents(Infinity)).toBe(0);
  });

  it("fromCents is the inverse of toCents", () => {
    expect(fromCents(1999)).toBe(19.99);
    expect(fromCents(0)).toBe(0);
    expect(fromCents(toCents(0.1))).toBe(0.1);
  });

  it("subtracts exactly, without float drift", () => {
    // 0.1 + 0.2 === 0.30000000000000004 in raw JS
    expect(fromCents(toCents(0.1) + toCents(0.2))).toBe(0.3);
    expect(subCents(10000, 99)).toBe(9901);
  });

  it("isZeroCents only accepts a zero balance", () => {
    expect(isZeroCents(0)).toBe(true);
    expect(isZeroCents(1)).toBe(false);
    expect(isZeroCents(-1)).toBe(false);
  });

  it("formats cents as USD", () => {
    expect(formatCents(123_450)).toBe("$1,234.50");
    expect(formatCents(0)).toBe("$0.00");
    expect(formatCents(-125_050)).toBe("-$1,250.50");
  });

  it("formats decimal values (UI side) with an optional sign", () => {
    expect(formatMoney(1234.5)).toBe("$1,234.50");
    expect(formatMoney(0)).toBe("$0.00");
    expect(formatMoney(250, "USD", "en-US", { signDisplay: "always" })).toBe("+$250.00");
    expect(formatMoney(-75, "USD", "en-US", { signDisplay: "always" })).toBe("-$75.00");
  });

  it("exposes the transaction ceiling in cents", () => {
    expect(MAX_TRANSACTION_CENTS / 100).toBe(9_999_999.99);
  });
});
