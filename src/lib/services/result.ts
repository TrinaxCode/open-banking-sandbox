/**
 * Result type shared by every service.
 *
 * Services never throw for expected failures: they return a `Result` so each
 * caller can translate the same outcome into whatever it needs — `{ error }` for
 * a form, the message alone for a background job.
 */

export type ErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation_error"
  | "insufficient_funds"
  | "credit_limit_exceeded"
  | "invalid_destination"
  | "rate_limited"
  | "conflict"
  | "internal_error";

export interface ServiceOk<T> {
  ok: true;
  data: T;
}

export interface ServiceFail {
  ok: false;
  code: ErrorCode;
  message: string;
}

export type Result<T> = ServiceOk<T> | ServiceFail;

export function ok<T>(data: T): ServiceOk<T> {
  return { ok: true, data };
}

export function fail(code: ErrorCode, message: string): ServiceFail {
  return { ok: false, code, message };
}

/** HTTP status that best describes a service failure, for route handlers. */
export function httpStatusFor(code: ErrorCode): number {
  switch (code) {
    case "unauthorized":
      return 401;
    case "forbidden":
      return 403;
    case "not_found":
      return 404;
    case "validation_error":
    case "invalid_destination":
      return 400;
    case "conflict":
    case "insufficient_funds":
    case "credit_limit_exceeded":
      return 409;
    case "rate_limited":
      return 429;
    case "internal_error":
      return 500;
  }
}

/**
 * Thrown inside a `$transaction` callback to roll the transaction back while
 * still carrying a machine-readable code out to the caller.
 */
export class ServiceException extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = "ServiceException";
    this.code = code;
  }
}

/** Convert an unknown thrown value into a `ServiceFail`. */
export function toFailure(
  err: unknown,
  fallbackMessage = "An unexpected error occurred",
): ServiceFail {
  if (err instanceof ServiceException) {
    return fail(err.code, err.message);
  }
  if (err instanceof Error) {
    return fail("internal_error", err.message);
  }
  return fail("internal_error", fallbackMessage);
}

/**
 * Log a caught error, but only when it is genuinely unexpected.
 *
 * Business outcomes ("Insufficient funds", "Account not found") are part of
 * normal operation and are reported to the caller through the `Result`, so
 * logging them as errors would bury real problems in noise.
 */
export function logUnexpected(scope: string, err: unknown): void {
  if (err instanceof ServiceException && err.code !== "internal_error") return;
  console.error(`${scope} error:`, err);
}
