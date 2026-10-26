import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { serializeTransactions } from "@/lib/serialize";
import {
  DEFAULT_PAGE_SIZE,
  countTransactionsByType,
  listTransactionsPage,
} from "@/lib/services/transactions";
import { transactionFilterSchema } from "@/lib/validations";
import { TransactionsPageClient } from "./TransactionsPageClient";

type SearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value || undefined;
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  const rawFilters = {
    type: single(params.type),
    category: single(params.category),
    q: single(params.q),
    from: single(params.from),
    to: single(params.to),
  };

  // Bad filter values fall back to "no filters" instead of erroring the page.
  const parsed = transactionFilterSchema.safeParse(rawFilters);
  const filters = parsed.success ? parsed.data : {};

  const [result, typeCounts] = await Promise.all([
    listTransactionsPage({
      userId: session.user.id,
      filters,
      page: Number(single(params.page)) || 1,
      limit: DEFAULT_PAGE_SIZE,
    }),
    countTransactionsByType(session.user.id, filters),
  ]);

  return (
    <TransactionsPageClient
      items={serializeTransactions(result.items)}
      total={result.total}
      page={result.page}
      pageCount={result.pageCount}
      typeCounts={typeCounts}
      filters={{
        type: rawFilters.type,
        category: rawFilters.category,
        q: rawFilters.q,
        from: rawFilters.from,
        to: rawFilters.to,
      }}
    />
  );
}
