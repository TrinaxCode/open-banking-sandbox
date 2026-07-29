import { describe, it, expect } from "vitest";
import { categorize } from "./categorize";

describe("categorize", () => {
  it("maps deposits and transfer_in to income", () => {
    expect(categorize("deposit", "Salary")).toBe("income");
    expect(categorize("transfer_in", "from friend")).toBe("income");
  });

  it("maps transfer_out to transfer", () => {
    expect(categorize("transfer_out", "rent to landlord")).toBe("transfer");
  });

  it("keyword-matches spending descriptions", () => {
    expect(categorize("withdrawal", "Coffee shop")).toBe("food");
    expect(categorize("withdrawal", "Amazon order")).toBe("shopping");
    expect(categorize("withdrawal", "Electric bill")).toBe("bills");
    expect(categorize("withdrawal", "Uber ride")).toBe("transport");
    expect(categorize("withdrawal", "Netflix subscription")).toBe("entertainment");
    expect(categorize("withdrawal", "Pharmacy")).toBe("health");
    expect(categorize("withdrawal", "Hotel booking")).toBe("travel");
  });

  it("matches Spanish keywords", () => {
    expect(categorize("withdrawal", "Pago de luz")).toBe("bills");
    expect(categorize("withdrawal", "Gasolina")).toBe("transport");
  });

  it("falls back to other for unknown spending", () => {
    expect(categorize("withdrawal", "asdf zxcv")).toBe("other");
    expect(categorize("withdrawal", "")).toBe("other");
    expect(categorize("withdrawal", null)).toBe("other");
  });
});
