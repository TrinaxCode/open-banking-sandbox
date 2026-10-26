import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAccountStatement } from "@/lib/services/statements";
import { httpStatusFor } from "@/lib/services/result";

const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

/** Parse a query value that must be a plain integer ("12", not "12abc"). */
function parseInteger(value: string | null): number {
  return value !== null && /^\d{1,6}$/.test(value) ? Number(value) : NaN;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("accountId");
  const year = parseInteger(searchParams.get("year"));
  const month = parseInteger(searchParams.get("month"));

  if (
    !accountId ||
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    year < MIN_YEAR ||
    year > MAX_YEAR ||
    month < 1 ||
    month > 12
  ) {
    return NextResponse.json(
      { error: "Missing or invalid accountId, year, or month parameters" },
      { status: 400 },
    );
  }

  try {
    const result = await getAccountStatement(session.user.id, accountId, year, month);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.message },
        { status: httpStatusFor(result.code) },
      );
    }

    return NextResponse.json(
      { statement: result.data },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (err) {
    console.error("statement route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
