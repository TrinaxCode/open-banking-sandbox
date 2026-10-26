import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { runDueJobs } from "@/lib/jobs";

/**
 * Background worker entry point.
 *
 *   curl -X POST http://localhost:3000/api/jobs/run \
 *     -H "Authorization: Bearer $JOBS_SECRET"
 *
 * Runs every user's due scheduled transfers plus interest accrual. Point a cron
 * job, a systemd timer or a platform scheduler here; the dashboard also triggers
 * the same jobs (throttled) so a single-node deployment needs no scheduler.
 */

function isAuthorized(request: Request): boolean {
  const secret = process.env.JOBS_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization");
  const token = header?.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : null;
  if (!token) return false;

  // Constant-time comparison: hash both sides so the lengths always match.
  const provided = createHash("sha256").update(token).digest();
  const expected = createHash("sha256").update(secret).digest();
  return timingSafeEqual(provided, expected);
}

export async function POST(request: Request): Promise<Response> {
  if (!process.env.JOBS_SECRET) {
    return NextResponse.json(
      {
        error: {
          code: "not_configured",
          message: "JOBS_SECRET is not set, so the job runner is disabled.",
        },
      },
      { status: 503 },
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        error: {
          code: "unauthorized",
          message: "Invalid or missing jobs secret.",
        },
      },
      { status: 401 },
    );
  }

  try {
    const summary = await runDueJobs({});
    return NextResponse.json(
      { data: summary },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("job runner failed:", err);
    return NextResponse.json(
      { error: { code: "job_failed", message: "The job runner could not complete." } },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
