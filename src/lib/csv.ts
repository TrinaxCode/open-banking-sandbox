import type { Transaction } from "@prisma/client";

/** Escape a value for safe inclusion in a CSV cell. */
function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Build a CSV string from a list of transactions. */
export function transactionsToCsv(transactions: Transaction[]): string {
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

/**
 * Trigger a client-side download of the transactions as a CSV file.
 * No-op on the server.
 */
export function exportTransactionsCsv(
  transactions: Transaction[],
  filename = "transactions.csv",
): void {
  if (typeof window === "undefined") return;
  const csv = transactionsToCsv(transactions);
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
