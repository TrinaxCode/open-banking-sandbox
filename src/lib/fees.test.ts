import { describe, it, expect, afterEach } from "vitest";
import {
  DEFAULT_EXTERNAL_TRANSFER_FEE_CENTS,
  computeTransferFeeCents,
  externalTransferFeeCents,
} from "./fees";

describe("fee policy", () => {
  afterEach(() => {
    delete process.env.EXTERNAL_TRANSFER_FEE_CENTS;
  });

  it("defaults to a flat $1.00 for outgoing transfers", () => {
    expect(DEFAULT_EXTERNAL_TRANSFER_FEE_CENTS).toBe(100);
    expect(externalTransferFeeCents()).toBe(100);
    expect(computeTransferFeeCents({ sameUser: false })).toBe(100);
  });

  it("is free when the destination belongs to the same user", () => {
    expect(computeTransferFeeCents({ sameUser: true })).toBe(0);
  });

  it("honours the environment override", () => {
    process.env.EXTERNAL_TRANSFER_FEE_CENTS = "250";
    expect(externalTransferFeeCents()).toBe(250);
  });

  it("allows waiving the fee with 0", () => {
    process.env.EXTERNAL_TRANSFER_FEE_CENTS = "0";
    expect(externalTransferFeeCents()).toBe(0);
  });

  it("falls back to the default for a nonsensical configuration", () => {
    process.env.EXTERNAL_TRANSFER_FEE_CENTS = "not-a-number";
    expect(externalTransferFeeCents()).toBe(DEFAULT_EXTERNAL_TRANSFER_FEE_CENTS);

    process.env.EXTERNAL_TRANSFER_FEE_CENTS = "-50";
    expect(externalTransferFeeCents()).toBe(DEFAULT_EXTERNAL_TRANSFER_FEE_CENTS);
  });
});
