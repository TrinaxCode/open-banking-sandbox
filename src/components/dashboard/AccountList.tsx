import Link from "next/link";
import { useT } from "@/components/ui/LanguageSwitcher";
import type { AccountType } from "@/lib/domain";
import { ACCOUNT_TYPE_KEYS } from "@/lib/i18n/labels";
import type { AccountForUi } from "@/types/ui";

interface AccountListProps {
  accounts: AccountForUi[];
}

const typeStyles: Record<
  AccountType,
  { gradient: string; border: string; iconBg: string; iconColor: string }
> = {
  checking: {
    gradient: "from-blue-500/10 to-transparent dark:from-blue-950/30 dark:to-transparent",
    border: "border-blue-500/20 dark:border-blue-500/15",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  savings: {
    gradient:
      "from-indigo-500/10 to-transparent dark:from-indigo-950/30 dark:to-transparent",
    border: "border-indigo-500/20 dark:border-indigo-500/15",
    iconBg: "bg-indigo-500/10",
    iconColor: "text-indigo-600 dark:text-indigo-400",
  },
  credit: {
    gradient:
      "from-amber-500/10 to-transparent dark:from-amber-950/30 dark:to-transparent",
    border: "border-amber-500/20 dark:border-amber-500/15",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
};

export function AccountList({ accounts }: AccountListProps) {
  const { t, format } = useT();

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white py-16 text-center shadow-sm dark:border-white/10 dark:bg-zinc-900 dark:shadow-none">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500 dark:bg-white/[0.05] dark:text-zinc-400">
          <svg
            className="h-7 w-7"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
        </div>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">
          {t("dashboard.noAccounts")}
        </p>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          {t("dashboard.noAccountsDesc")}
        </p>
        <Link
          href="/dashboard/accounts/new"
          className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 transition-all hover:bg-zinc-50 hover:text-zinc-900 dark:border-white/10 dark:bg-white/[0.06] dark:text-zinc-200 dark:hover:bg-white/[0.1] dark:hover:text-white"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          {t("dashboard.openAccount")}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {accounts.map((account, index) => {
        const cfg = typeStyles[account.type];
        const showLimit =
          account.type === "credit" &&
          account.creditLimit != null &&
          account.creditLimit > 0;
        return (
          <div
            key={account.id}
            className="h-full animate-fade-in"
            style={{ animationDelay: `${index * 80}ms`, animationFillMode: "backwards" }}
          >
            <Link href={`/dashboard/accounts/${account.id}`} className="block h-full">
              <div
                data-testid="account-card"
                className={`group relative flex h-40 w-full flex-col overflow-hidden rounded-xl border bg-white p-4 shadow-sm transition-all duration-300 hover:border-zinc-300 hover:scale-[1.01] dark:bg-zinc-900 dark:shadow-none dark:hover:border-white/20 ${cfg.border}`}
              >
                <div
                  aria-hidden
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${cfg.gradient}`}
                />
                {/* Top row */}
                <div className="relative z-10 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cfg.iconBg}`}
                    >
                      <svg
                        className={`h-5 w-5 ${cfg.iconColor}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d={
                            account.type === "credit"
                              ? "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                              : "M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                          }
                        />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                        {account.nickname || t(ACCOUNT_TYPE_KEYS[account.type])}
                      </p>
                      <p className="truncate text-xs font-mono tracking-tight text-zinc-600 dark:text-zinc-400">
                        {account.number}
                      </p>
                    </div>
                  </div>
                  <svg
                    className="h-4 w-4 shrink-0 text-zinc-500 transition-all group-hover:translate-x-0.5 group-hover:text-zinc-700 dark:text-zinc-400 dark:group-hover:text-zinc-200"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.25 4.5l7.5 7.5-7.5 7.5"
                    />
                  </svg>
                </div>
                {/* Balance sits on the bottom so a limit line cannot stretch the card. */}
                <div className="relative z-10 mt-auto">
                  <p className="text-2xl font-light tracking-tight text-zinc-900 dark:text-white">
                    {format.currency(account.balance)}
                  </p>
                  <p className="mt-1 h-4 truncate text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    {showLimit
                      ? t("account.ofLimit").replace(
                          "{0}",
                          format.currency(account.creditLimit ?? 0),
                        )
                      : "\u00a0"}
                  </p>
                </div>
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
