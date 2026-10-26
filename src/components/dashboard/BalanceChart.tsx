"use client";

import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useT } from "@/components/ui/LanguageSwitcher";
import { useTheme } from "@/components/ui/ThemeToggle";
import { movementIncreasesBalance } from "@/lib/interest";
import type { TranslationKey } from "@/lib/i18n";
import type { TransactionForUi } from "@/types/ui";

interface BalanceChartProps {
  balance: number;
  previousBalance?: number;
  transactions: TransactionForUi[];
}

type Period = "day" | "week" | "month";

const PERIOD_KEYS: Record<Period, TranslationKey> = {
  day: "chart.day",
  week: "chart.week",
  month: "chart.month",
};

function signedMovement(transaction: TransactionForUi): number {
  return movementIncreasesBalance(transaction) ? transaction.amount : -transaction.amount;
}

/** Balance at each cutoff, walked back from the current total. */
export function computeChartData(
  transactions: TransactionForUi[],
  period: Period,
  nowLabel: string,
  formatDate: (value: Date | string, options?: Intl.DateTimeFormatOptions) => string,
  balance: number,
) {
  const now = new Date();
  const nowMs = now.getTime();

  // Build time points with cutoff timestamps
  const points: { name: string; value: number; cutoffMs: number }[] = [];

  if (period === "day") {
    for (let h = 24; h >= 0; h -= 3) {
      const cutoffMs = nowMs - h * 3600000;
      const d = new Date(cutoffMs);
      const label = h === 0 ? nowLabel : `${String(d.getHours()).padStart(2, "0")}:00`;
      points.push({ name: label, value: 0, cutoffMs });
    }
  } else if (period === "week") {
    for (let d = 6; d >= 0; d--) {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - d);
      cutoff.setHours(23, 59, 59, 999);
      points.push({
        name: formatDate(cutoff, { weekday: "short" }),
        value: 0,
        cutoffMs: cutoff.getTime(),
      });
    }
  } else {
    for (let m = 5; m >= 0; m--) {
      // Last day of the target month (month = now - m)
      const cutoff = new Date(
        now.getFullYear(),
        now.getMonth() - m + 1,
        0,
        23,
        59,
        59,
        999,
      );
      points.push({
        name: formatDate(cutoff, { month: "short" }),
        value: 0,
        cutoffMs: cutoff.getTime(),
      });
    }
  }

  // Sort transactions oldest first
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  // Movements after a cutoff are not in the balance yet at that moment.
  for (const point of points) {
    let after = 0;
    for (const txn of sorted) {
      if (new Date(txn.createdAt).getTime() > point.cutoffMs) {
        after += signedMovement(txn);
      }
    }
    point.value = Math.round((balance - after) * 100) / 100;
  }

  return points;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  const { format } = useT();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  if (active && payload && payload.length) {
    const val = payload[0]?.value ?? 0;
    return (
      <div
        data-testid="balance-chart-tooltip"
        className="rounded-xl border px-4 py-2.5 shadow-2xl"
        style={{
          backgroundColor: isDark ? "#0a0a0a" : "#ffffff",
          color: isDark ? "#f4f4f5" : "#18181b",
          borderColor: isDark ? "rgba(255,255,255,0.12)" : "#e4e4e7",
        }}
      >
        <p
          className="text-xs font-medium tracking-widest uppercase"
          style={{ color: isDark ? "#a1a1aa" : "#71717a" }}
        >
          {label}
        </p>
        <p className="mt-0.5 text-base font-semibold tracking-tight">
          {format.currency(val)}
        </p>
      </div>
    );
  }
  return null;
}

export function BalanceChart({
  balance,
  previousBalance = 0,
  transactions = [],
}: BalanceChartProps) {
  const { t, format } = useT();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [period, setPeriod] = useState<Period>("day");

  const periods: { key: Period }[] = [{ key: "day" }, { key: "week" }, { key: "month" }];

  const change = balance - previousBalance;
  const percentChange =
    previousBalance > 0 ? ((change / previousBalance) * 100).toFixed(1) : "0.0";
  const isPositive = change >= 0;

  const chartData = useMemo(
    () => computeChartData(transactions, period, t("chart.now"), format.date, balance),
    [transactions, period, t, format, balance],
  );

  const values = chartData.map((d) => d.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const range = rawMax - rawMin;
  const pad = Math.max(range * 0.15, Math.abs(rawMax) * 0.05, 100);
  const domainLow = rawMin >= 0 ? Math.max(0, rawMin - pad) : rawMin - pad;
  const domainHigh = rawMax + pad;

  const axisTick = isDark ? "#e4e4e7" : "#3f3f46";
  const gridStroke = isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.08)";

  return (
    <div
      data-testid="balance-chart"
      className={`rounded-2xl border p-5 shadow-sm sm:p-6 ${
        isDark ? "border-white/10 bg-zinc-900" : "border-zinc-200 bg-white"
      }`}
      style={{ backgroundColor: isDark ? "#18181b" : "#ffffff" }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.15em] text-zinc-600 uppercase dark:text-zinc-400">
            {t("dashboard.totalBalance")}
          </p>
          <p className="text-3xl font-light tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
            {format.currency(balance)}
          </p>
          <div className="flex items-center gap-2.5">
            <span
              className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                isPositive
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "bg-red-500/10 text-red-700 dark:text-red-400"
              }`}
            >
              <svg
                className="h-2.5 w-2.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d={
                    isPositive
                      ? "M4.5 15.75l7.5-7.5 7.5 7.5"
                      : "M19.5 8.25l-7.5 7.5-7.5-7.5"
                  }
                />
              </svg>
              {isPositive ? "+" : ""}
              {percentChange}%
            </span>
            <span className="text-xs text-zinc-600 font-medium dark:text-zinc-400">
              {t("dashboard.vsLastMonth")}
            </span>
          </div>
        </div>
        <div className="flex gap-0.5 self-start rounded-lg bg-zinc-100 p-0.5 border border-zinc-200/80 dark:bg-white/[0.06] dark:border-white/5">
          {periods.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-all duration-200 ${
                period === p.key
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-white/15 dark:text-white"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              {t(PERIOD_KEYS[p.key])}
            </button>
          ))}
        </div>
      </div>

      <div
        data-testid="balance-chart-plot"
        className="mt-6"
        style={{
          minHeight: 200,
          overflow: "hidden",
          backgroundColor: isDark ? "#18181b" : "#ffffff",
        }}
      >
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="goldArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.18} />
                <stop offset="50%" stopColor="#f59e0b" stopOpacity={0.06} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{
                fill: axisTick,
                fontSize: 11,
                fontWeight: 500,
              }}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={false}
              domain={[domainLow, domainHigh]}
            />
            <Tooltip
              content={<CustomTooltip />}
              defaultIndex={chartData.length - 1}
              wrapperStyle={{ outline: "none", background: "transparent" }}
              cursor={{ stroke: isDark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.2)" }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#f59e0b"
              strokeWidth={2}
              fill="url(#goldArea)"
              dot={false}
              activeDot={{
                r: 5,
                fill: "#f59e0b",
                stroke: isDark ? "#0a0a0a" : "#ffffff",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
