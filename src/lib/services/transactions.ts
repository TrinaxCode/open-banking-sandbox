/**
 * Transaction history queries — filters, pagination and CSV export.
 *
 * Filtering and paging happen in the database, so the history page can walk the
 * whole ledger instead of loading a window into memory. Aggregation-free and
 * index-friendly: every predicate maps onto `@@index([userId, createdAt])` /
 * `@@index([accountId, createdAt])`.
 */

import type { Prisma, PrismaClient, Transaction } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { serializeTransactions } from "@/lib/serialize";
import { transactionsToCsv } from "@/lib/csv";

export interface TransactionFilters {
  type?: string;
  category?: string;
  q?: string;
  from?: Date;
  to?: Date;
}

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;
/** Upper bound for a single CSV export. */
export const MAX_EXPORT_ROWS = 5000;

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Exclusive upper bound: the day after `date`, so `to` is inclusive. */
function endOfDayExclusive(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() + 1);
  return d;
}

export function buildTransactionWhere(
  userId: string,
  filters: TransactionFilters = {},
): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = { userId };

  if (filters.type) where.type = filters.type;
  if (filters.category) where.category = filters.category;

  if (filters.q) {
    // SQLite's LIKE is case-insensitive for ASCII, which matches the previous
    // client-side behaviour (`toLowerCase().includes`).
    where.OR = [
      { description: { contains: filters.q } },
      { reference: { contains: filters.q } },
    ];
  }

  if (filters.from || filters.to) {
    where.createdAt = {
      ...(filters.from ? { gte: startOfDay(filters.from) } : {}),
      ...(filters.to ? { lt: endOfDayExclusive(filters.to) } : {}),
    };
  }

  return where;
}

export interface TransactionPage {
  /** Raw rows in cents — each boundary converts (UI decimals, API cents). */
  items: Transaction[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
}

/**
 * One page of the user's history, newest first.
 * Offset pagination keeps URLs shareable (`?page=2`) and is honest about what it
 * does; `createdAt` plus `id` make the ordering deterministic.
 */
export async function listTransactionsPage(
  params: {
    userId: string;
    filters?: TransactionFilters;
    page?: number;
    limit?: number;
  },
  client: PrismaClient = defaultPrisma,
): Promise<TransactionPage> {
  const limit = Math.min(
    Math.max(Math.trunc(params.limit ?? DEFAULT_PAGE_SIZE), 1),
    MAX_PAGE_SIZE,
  );
  const where = buildTransactionWhere(params.userId, params.filters);

  const total = await client.transaction.count({ where });
  const pageCount = Math.max(Math.ceil(total / limit), 1);
  const page = Math.min(Math.max(Math.trunc(params.page ?? 1), 1), pageCount);

  const rows = await client.transaction.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * limit,
    take: limit,
  });

  return {
    items: rows,
    total,
    page,
    limit,
    pageCount,
  };
}

/** The full filtered set (bounded) as a CSV document. */
export async function buildTransactionsCsv(
  userId: string,
  filters: TransactionFilters = {},
  client: PrismaClient = defaultPrisma,
): Promise<{ csv: string; count: number }> {
  const rows = await client.transaction.findMany({
    where: buildTransactionWhere(userId, filters),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: MAX_EXPORT_ROWS,
  });

  const items = serializeTransactions(rows).map((item) => ({
    createdAt: item.createdAt,
    type: item.type,
    category: item.category,
    description: item.description,
    reference: item.reference,
    amount: item.amount,
    status: item.status,
  }));

  return { csv: transactionsToCsv(items), count: items.length };
}

/**
 * How many transactions match each type under the current filters (ignoring the
 * type filter itself), plus `all`. Used to label the filter pills with real
 * totals instead of page-local ones.
 */
export async function countTransactionsByType(
  userId: string,
  filters: TransactionFilters = {},
  client: PrismaClient = defaultPrisma,
): Promise<Record<string, number>> {
  const rows = await client.transaction.groupBy({
    by: ["type"],
    where: buildTransactionWhere(userId, { ...filters, type: undefined }),
    _count: { _all: true },
  });

  const counts: Record<string, number> = {};
  let total = 0;
  for (const row of rows) {
    counts[row.type] = row._count._all;
    total += row._count._all;
  }
  return { ...counts, all: total };
}
