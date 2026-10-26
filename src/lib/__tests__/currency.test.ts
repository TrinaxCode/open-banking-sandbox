import { describe, it, expect } from "vitest";
import { SUPPORTED_CURRENCIES, CURRENCY_MAP, convertCurrency } from "../currency";

describe("currency utilities", () => {
  it("defines all supported currencies with valid rates and symbols", () => {
    expect(SUPPORTED_CURRENCIES.length).toBeGreaterThanOrEqual(8);
    for (const code of SUPPORTED_CURRENCIES) {
      const meta = CURRENCY_MAP[code];
      expect(meta).toBeDefined();
      expect(meta.code).toBe(code);
      expect(meta.ratePerUSD).toBeGreaterThan(0);
      expect(meta.symbol.length).toBeGreaterThan(0);
      expect(meta.flag.length).toBeGreaterThan(0);
    }
  });

  it("converts USD to USD with rate 1.0", () => {
    const res = convertCurrency(100, "USD", "USD");
    expect(res.fromAmount).toBe(100);
    expect(res.toAmount).toBe(100);
    expect(res.rate).toBe(1);
    expect(res.inverseRate).toBe(1);
    expect(res.formattedFrom).toContain("$100.00");
    expect(res.formattedTo).toContain("$100.00");
  });

  it("converts USD to EUR accurately based on rates", () => {
    const res = convertCurrency(100, "USD", "EUR");
    const expected = 100 * CURRENCY_MAP.EUR.ratePerUSD;
    expect(res.toAmount).toBe(Number(expected.toFixed(2)));
    expect(res.rate).toBe(CURRENCY_MAP.EUR.ratePerUSD);
    expect(res.formattedTo).toContain("€");
  });

  it("handles JPY without decimal places", () => {
    const res = convertCurrency(10, "USD", "JPY");
    const expected = Math.round(10 * CURRENCY_MAP.JPY.ratePerUSD);
    expect(res.toAmount).toBe(expected);
    expect(Number.isInteger(res.toAmount)).toBe(true);
    expect(res.formattedTo).toContain("¥");
  });

  it("handles cross-currency conversions correctly (EUR to GBP)", () => {
    const res = convertCurrency(50, "EUR", "GBP");
    const expectedRate = CURRENCY_MAP.GBP.ratePerUSD / CURRENCY_MAP.EUR.ratePerUSD;
    expect(res.rate).toBeCloseTo(expectedRate, 2);
    expect(res.toAmount).toBeCloseTo(50 * expectedRate, 1);
    expect(res.rate * res.inverseRate).toBeCloseTo(1, 2);
  });

  it("handles zero amounts gracefully", () => {
    const res = convertCurrency(0, "USD", "CAD");
    expect(res.toAmount).toBe(0);
    expect(res.fromAmount).toBe(0);
  });
});
