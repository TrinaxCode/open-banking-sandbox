"use client";

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useT } from "@/components/ui/LanguageSwitcher";
import { formatMoney } from "@/lib/money";
import type { AnalyticsData } from "@/lib/queries";

interface AnalyticsClientProps {
  data: AnalyticsData;
}

const CATEGORY_COLORS: Record<string, string> = {
  income: "#10b981",
  transfer: "#6366f1",
  food: "#f59e0b",
  shopping: "#ec4899",
  bills: "#ef4444",
  transport: "#3b82f6",
  entertainment: "#8b5cf6",
  health: "#14b8a6",
  travel: "#06b6d4",
  other: "#94a3b8",
};

function categoryLabel(t: (k: string) => string, key: string): string {
  const translated = t(`category.${key}`);
  // useT returns the key itself when missing; fall back to a capitalized word.
  if (translated === `category.${key}`) {
    return key.charAt(0).toUpperCase() + key.slice(1);
  }
  return translated;
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit" }).format(d);
}

export function AnalyticsClient({ data }: AnalyticsClientProps) {
  const { t } = useT();

  const pieData = data.spendingByCategory.map((c) => ({
    name: categoryLabel(t, c.category),
    key: c.category,
    value: c.total,
  }));

  const barData = data.monthly.map((m) => ({
    name: monthLabel(m.month),
    Income: m.income,
    Spending: m.spending,
  }));

  const net = Math.round((data.totalIncome - data.totalSpending) * 100) / 100;
  const hasData = data.spendingByCategory.length > 0 || data.monthly.length > 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 animate-fade-in">
        <h1 className="text-2xl font-semibold text-white">{t("analytics.title")}</h1>
        <p className="text-sm text-white/40">{t("analytics.subtitle")}</p>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.04] bg-white/[0.02] p-5 animate-fade-in">
          <p className="text-xs uppercase tracking-wider text-white/40">{t("analytics.income")}</p>
          <p className="mt-1 text-2xl font-light text-premium-green">{formatMoney(data.totalIncome)}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.04] bg-white/[0.02] p-5 animate-fade-in" style={{ animationDelay: "60ms" }}>
          <p className="text-xs uppercase tracking-wider text-white/40">{t("analytics.spending")}</p>
          <p className="mt-1 text-2xl font-light text-premium-coral">{formatMoney(data.totalSpending)}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.04] bg-white/[0.02] p-5 animate-fade-in" style={{ animationDelay: "120ms" }}>
          <p className="text-xs uppercase tracking-wider text-white/40">{t("analytics.net")}</p>
          <p className={`mt-1 text-2xl font-light ${net >= 0 ? "text-premium-green" : "text-premium-coral"}`}>
            {formatMoney(net)}
          </p>
        </div>
      </div>

      {!hasData ? (
        <div className="rounded-2xl border border-white/[0.04] bg-white/[0.01] py-16 text-center">
          <p className="text-sm text-white/30">{t("analytics.empty")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Spending by category */}
          <div className="rounded-2xl border border-white/[0.04] bg-white/[0.02] p-6 animate-fade-in">
            <h2 className="mb-4 text-sm font-semibold text-white/70">{t("analytics.byCategory")}</h2>
            {pieData.length === 0 ? (
              <p className="py-12 text-center text-sm text-white/25">{t("analytics.noSpending")}</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                      {pieData.map((entry) => (
                        <Cell key={entry.key} fill={CATEGORY_COLORS[entry.key] ?? "#94a3b8"} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff" }}
                      formatter={(value) => formatMoney(Number(value))}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {pieData.map((c) => (
                    <div key={c.key} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: CATEGORY_COLORS[c.key] ?? "#94a3b8" }} />
                        <span className="text-white/60">{c.name}</span>
                      </div>
                      <span className="font-mono text-white/80">{formatMoney(c.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Monthly trend */}
          <div className="rounded-2xl border border-white/[0.04] bg-white/[0.02] p-6 animate-fade-in" style={{ animationDelay: "60ms" }}>
            <h2 className="mb-4 text-sm font-semibold text-white/70">{t("analytics.monthly")}</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={11} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff" }}
                  formatter={(value) => formatMoney(Number(value))}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Spending" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
