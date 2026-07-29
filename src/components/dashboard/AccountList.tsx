import type { Account } from "@prisma/client";
import Link from "next/link";
import { useT } from "@/components/ui/LanguageSwitcher";

interface AccountListProps {
  accounts: Account[];
}

function formatBalance(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

const typeStyles: Record<string, { gradient: string; border: string; iconBg: string; iconColor: string }> = {
  checking: {
    gradient: "from-blue-950/30 to-transparent",
    border: "border-blue-500/15",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-400",
  },
  savings: {
    gradient: "from-indigo-950/30 to-transparent",
    border: "border-indigo-500/15",
    iconBg: "bg-indigo-500/10",
    iconColor: "text-indigo-400",
  },
  credit: {
    gradient: "from-amber-950/30 to-transparent",
    border: "border-amber-500/15",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-400",
  },
};

export function AccountList({ accounts }: AccountListProps) {
  const { t } = useT();

  const typeLabelKey: Record<string, string> = {
    checking: "account.checking",
    savings: "account.savings",
    credit: "account.credit",
  };

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.04] bg-white/[0.01] py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03]">
          <svg className="h-7 w-7 text-white/15" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </div>
        <p className="text-sm font-medium text-white/25">No accounts yet</p>
        <p className="mt-1 text-xs text-white/15">Open your first account to get started.</p>
        <Link
          href="/dashboard/accounts/new"
          className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-4 py-2 text-xs font-medium text-white/50 transition-all hover:bg-white/[0.08] hover:text-white/80"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Open Account
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {accounts.map((account, index) => {
        const cfg = typeStyles[account.type] ?? typeStyles.checking;
        return (
          <div
            key={account.id}
            className="animate-fade-in"
            style={{ animationDelay: `${index * 80}ms`, animationFillMode: "backwards" }}
          >
            <Link href={`/dashboard/accounts/${account.id}`}>
              <div
                className={`group relative overflow-hidden rounded-xl border bg-gradient-to-br p-5 transition-all duration-300 hover:border-white/20 hover:scale-[1.01] ${cfg.gradient} ${cfg.border}`}
              >
                {/* Top row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${cfg.iconBg}`}>
                      <svg className={`h-5 w-5 ${cfg.iconColor}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round"
                          d={account.type === "credit"
                            ? "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                            : "M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"}
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white/80">{account.nickname || t(typeLabelKey[account.type] ?? "account.checking")}</p>
                      <p className="text-[10px] text-white/20 font-mono tracking-tight">{account.number}</p>
                    </div>
                  </div>
                  <svg className="h-4 w-4 text-white/10 transition-all group-hover:translate-x-0.5 group-hover:text-white/30" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
                {/* Balance */}
                <p className="mt-4 text-2xl font-light tracking-tight text-white">
                  {formatBalance(account.balance)}
                </p>
                {account.type === "credit" && account.creditLimit && account.creditLimit > 0 && (
                  <p className="mt-1 text-[10px] text-white/15">of {formatBalance(account.creditLimit)} limit</p>
                )}
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
