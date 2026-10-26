/**
 * CSV export for transaction history.
 *
 * Rows are unit-neutral: callers pass DECIMAL amounts (the UI side of the
 * money boundary), so this module never needs to know about cents.
 */

export interface TransactionCsvRow {
  createdAt: Date | string;
  type: string;
  category: string;
  description?: string | null;
  reference?: string | null;
  amount: number;
  status: string;
}

/** Escape a value for safe inclusion in a CSV cell. */
function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Build a CSV string from a list of transactions. */
export function transactionsToCsv(transactions: TransactionCsvRow[]): string {
  const header = [
    "Date",
    "Type",
    "Category",
    "Description",
    "Reference",
    "Amount",
    "Status",
  ];
  const rows = transactions.map((t) => [
    new Date(t.createdAt).toISOString(),
    t.type,
    t.category || "other",
    t.description ?? "",
    t.reference ?? "",
    t.amount.toFixed(2),
    t.status,
  ]);
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
}

/** Trigger a client-side download of a CSV string. No-op on the server. */
export function downloadCsv(csv: string, filename = "transactions.csv"): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
