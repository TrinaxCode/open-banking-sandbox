import { describe, it, expect } from "vitest";
import {
  roundMoney,
  toCents,
  fromCents,
  addMoney,
  subtractMoney,
  sumMoney,
  isEffectivelyZero,
  formatMoney,
} from "./money";

describe("money helpers", () => {
  it("roundMoney rounds to 2 decimals", () => {
    expect(roundMoney(1.005)).toBe(1.01);
    expect(roundMoney(1.004)).toBe(1.0);
    expect(roundMoney(10)).toBe(10);
  });

  it("roundMoney handles non-finite input", () => {
    expect(roundMoney(NaN)).toBe(0);
    expect(roundMoney(Infinity)).toBe(0);
  });

  it("toCents / fromCents round-trip", () => {
    expect(toCents(19.99)).toBe(1999);
    expect(fromCents(1999)).toBe(19.99);
    expect(fromCents(toCents(0.1))).toBe(0.1);
  });

  it("addMoney avoids float drift", () => {
    // 0.1 + 0.2 === 0.30000000000000004 in raw JS
    expect(addMoney(0.1, 0.2)).toBe(0.3);
    expect(addMoney(0.1, 0.2, 0.3)).toBe(0.6);
  });

  it("subtractMoney avoids float drift", () => {
    expect(subtractMoney(0.3, 0.1)).toBe(0.2);
    expect(subtractMoney(100, 0.99)).toBe(99.01);
  });

  it("sumMoney sums a list cleanly", () => {
    expect(sumMoney([0.1, 0.1, 0.1])).toBe(0.3);
    expect(sumMoney([])).toBe(0);
  });

  it("isEffectivelyZero tolerates float dust", () => {
    expect(isEffectivelyZero(0)).toBe(true);
    expect(isEffectivelyZero(0.004)).toBe(true);
    expect(isEffectivelyZero(-0.004)).toBe(true);
    expect(isEffectivelyZero(0.01)).toBe(false);
  });

  it("formatMoney formats USD", () => {
    expect(formatMoney(1234.5)).toBe("$1,234.50");
    expect(formatMoney(0)).toBe("$0.00");
  });
});
