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
import { useTheme } from "@/components/ui/ThemeToggle";
import type { AnalyticsData } from "@/lib/queries";
import { CATEGORY_KEYS } from "@/lib/i18n/labels";
import type { Formatters } from "@/components/ui/LanguageSwitcher";
import type { TranslationKey } from "@/lib/i18n";
import type { TransactionCategory } from "@/lib/domain";

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

function categoryLabel(t: (key: TranslationKey) => string, key: string): string {
  const translationKey = CATEGORY_KEYS[key as TransactionCategory];
  if (!translationKey) return key.charAt(0).toUpperCase() + key.slice(1);
  return t(translationKey);
}

/** "2026-03" → "Mar 26" / "mar 26". */
function monthLabel(month: string, format: Formatters): string {
  const [year, monthIndex] = month.split("-");
  const date = new Date(Number(year), Number(monthIndex) - 1, 1);
  return format.monthYear(date);
}

export function AnalyticsClient({ data }: AnalyticsClientProps) {
  const { t, format } = useT();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const pieData = data.spendingByCategory.map((c) => ({
    name: categoryLabel(t, c.category),
    key: c.category,
    value: c.total,
  }));

  const barData = data.monthly.map((m) => ({
    name: monthLabel(m.month, format),
    Income: m.income,
    Spending: m.spending,
  }));

  const net = Math.round((data.totalIncome - data.totalSpending) * 100) / 100;
  const avgDaily = Math.round((data.totalSpending / 30) * 100) / 100;
  const hasData = data.spendingByCategory.length > 0 || data.monthly.length > 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 animate-fade-in">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">
          {t("analytics.title")}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">
          {t("analytics.subtitle")} · {t("analytics.window")}
        </p>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.02] animate-fade-in">
          <p className="text-xs uppercase tracking-wider text-zinc-600 dark:text-zinc-400 font-semibold">
            {t("analytics.income")}
          </p>
          <p className="mt-1 text-2xl font-light text-emerald-700 dark:text-emerald-400">
            {format.currency(data.totalIncome)}
          </p>
        </div>
        <div
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.02] animate-fade-in"
          style={{ animationDelay: "60ms" }}
        >
          <p className="text-xs uppercase tracking-wider text-zinc-600 dark:text-zinc-400 font-semibold">
            {t("analytics.spending")}
          </p>
          <p className="mt-1 text-2xl font-light text-red-700 dark:text-premium-coral">
            {format.currency(data.totalSpending)}
          </p>
        </div>
        <div
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.02] animate-fade-in"
          style={{ animationDelay: "120ms" }}
        >
          <p className="text-xs uppercase tracking-wider text-zinc-600 dark:text-zinc-400 font-semibold">
            {t("analytics.net")}
          </p>
          <p
            className={`mt-1 text-2xl font-light ${net >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-premium-coral"}`}
          >
            {format.currency(net)}
          </p>
        </div>
        <div
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.02] animate-fade-in"
          style={{ animationDelay: "180ms" }}
        >
          <p className="text-xs uppercase tracking-wider text-zinc-600 dark:text-zinc-400 font-semibold">
            {t("analytics.avgDaily")}
          </p>
          <p className="mt-1 text-2xl font-light text-zinc-900 dark:text-zinc-100 font-medium">
            {format.currency(avgDaily)}
          </p>
        </div>
      </div>

      {!hasData ? (
        <div className="rounded-2xl border border-zinc-200 bg-white py-16 text-center dark:border-white/[0.08] dark:bg-white/[0.01]">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">
            {t("analytics.empty")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Spending by category */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.02] animate-fade-in">
            <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-200">
              {t("analytics.byCategory")}
            </h2>
            {pieData.length === 0 ? (
              <p className="py-12 text-center text-sm text-zinc-600 dark:text-zinc-400">
                {t("analytics.noSpending")}
              </p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {pieData.map((entry) => (
                        <Cell
                          key={entry.key}
                          fill={CATEGORY_COLORS[entry.key] ?? "#94a3b8"}
                          stroke="transparent"
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: isDark ? "#0a0a0a" : "#ffffff",
                        border: isDark
                          ? "1px solid rgba(255,255,255,0.1)"
                          : "1px solid #e4e4e7",
                        borderRadius: 12,
                        color: isDark ? "#fff" : "#18181b",
                        boxShadow: isDark ? "none" : "0 10px 15px -3px rgba(0,0,0,0.1)",
                      }}
                      formatter={(value) => format.currency(Number(value))}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {pieData.map((c) => (
                    <div
                      key={c.key}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: CATEGORY_COLORS[c.key] ?? "#94a3b8" }}
                        />
                        <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                          {c.name}
                        </span>
                      </div>
                      <span className="font-mono text-zinc-900 dark:text-zinc-100 font-semibold">
                        {format.currency(c.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Monthly trend */}
          <div
            className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/[0.04] dark:bg-white/[0.02] animate-fade-in"
            style={{ animationDelay: "60ms" }}
          >
            <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-200">
              {t("analytics.monthly")}
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <XAxis
                  dataKey="name"
                  stroke={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"}
                  fontSize={11}
                />
                <YAxis
                  stroke={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"}
                  fontSize={11}
                />
                <Tooltip
                  cursor={{
                    fill: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                  }}
                  contentStyle={{
                    background: isDark ? "#0a0a0a" : "#ffffff",
                    border: isDark
                      ? "1px solid rgba(255,255,255,0.1)"
                      : "1px solid #e4e4e7",
                    borderRadius: 12,
                    color: isDark ? "#fff" : "#18181b",
                    boxShadow: isDark ? "none" : "0 10px 15px -3px rgba(0,0,0,0.1)",
                  }}
                  formatter={(value) => format.currency(Number(value))}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="Income"
                  name={t("analytics.income")}
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="Spending"
                  name={t("analytics.spending")}
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
