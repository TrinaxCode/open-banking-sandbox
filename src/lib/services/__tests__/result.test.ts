import { describe, expect, it } from "vitest";
import {
  fail,
  httpStatusFor,
  ServiceException,
  toFailure,
  type ErrorCode,
} from "@/lib/services/result";

describe("httpStatusFor", () => {
  const expected: Record<ErrorCode, number> = {
    unauthorized: 401,
    forbidden: 403,
    not_found: 404,
    validation_error: 400,
    invalid_destination: 400,
    conflict: 409,
    insufficient_funds: 409,
    credit_limit_exceeded: 409,
    rate_limited: 429,
    internal_error: 500,
  };

  it.each(Object.entries(expected))("maps %s to %i", (code, status) => {
    expect(httpStatusFor(code as ErrorCode)).toBe(status);
  });
});

describe("toFailure", () => {
  it("keeps the code of a ServiceException", () => {
    expect(toFailure(new ServiceException("not_found", "nope"))).toEqual(
      fail("not_found", "nope"),
    );
  });

  it("turns other errors into internal_error", () => {
    expect(toFailure(new Error("boom"))).toEqual(fail("internal_error", "boom"));
  });

  it("uses the fallback message for non-Error values", () => {
    expect(toFailure("weird", "fallback")).toEqual(fail("internal_error", "fallback"));
  });
});
