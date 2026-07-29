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
import type { Transaction } from "@prisma/client";

interface BalanceChartProps {
  balance: number;
  previousBalance?: number;
  transactions: Transaction[];
}

type Period = "day" | "week" | "month";

const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function computeChartData(transactions: Transaction[], period: Period, currentBalance: number, nowLabel: string) {
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
      points.push({ name: dayNames[cutoff.getDay()] ?? "", value: 0, cutoffMs: cutoff.getTime() });
    }
  } else {
    for (let m = 5; m >= 0; m--) {
      // Last day of the target month (month = now - m)
      const cutoff = new Date(now.getFullYear(), now.getMonth() - m + 1, 0, 23, 59, 59, 999);
      const monthIdx = (now.getMonth() - m + 12) % 12;
      points.push({ name: monthNames[monthIdx] ?? "", value: 0, cutoffMs: cutoff.getTime() });
    }
  }

  // Sort transactions oldest first
  const sorted = [...transactions].sort((a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Forward pass: compute cumulative balance at each point's cutoff
  let txnIdx = 0;
  let running = 0;

  for (let i = 0; i < points.length; i++) {
    while (txnIdx < sorted.length && new Date(sorted[txnIdx].createdAt).getTime() <= points[i].cutoffMs) {
      const txn = sorted[txnIdx];
      if (txn.type === "deposit" || txn.type === "transfer_in") {
        running += txn.amount;
      } else {
        running -= txn.amount;
      }
      txnIdx++;
    }
    points[i].value = Math.round(running * 100) / 100;
  }

  return points;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (active && payload && payload.length) {
    const val = payload[0]?.value ?? 0;
    return (
      <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a]/95 px-4 py-2.5 shadow-2xl backdrop-blur-xl">
        <p className="text-[10px] font-medium tracking-widest text-white/30 uppercase">{label}</p>
        <p className="mt-0.5 text-base font-semibold tracking-tight text-white">
          ${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
    );
  }
  return null;
}

export function BalanceChart({ balance, previousBalance = 0, transactions = [] }: BalanceChartProps) {
  const { t } = useT();
  const [period, setPeriod] = useState<Period>("day");

  const periods: { key: Period }[] = [
    { key: "day" }, { key: "week" }, { key: "month" },
  ];

  const change = balance - previousBalance;
  const percentChange = previousBalance > 0 ? ((change / previousBalance) * 100).toFixed(1) : "0.0";
  const isPositive = change >= 0;

  const chartData = useMemo(
    () => computeChartData(transactions, period, balance, t("chart.now")),
    [transactions, period, balance, t]
  );

  const values = chartData.map(d => d.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const range = rawMax - rawMin;
  const pad = Math.max(range * 0.15, Math.abs(rawMax) * 0.05, 100);
  const domainLow = rawMin >= 0 ? Math.max(0, rawMin - pad) : rawMin - pad;
  const domainHigh = rawMax + pad;

  return (
    <div className="rounded-2xl border border-white/[0.04] bg-gradient-to-br from-white/[0.02] to-transparent p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-white/25 uppercase">
            {t("dashboard.totalBalance")}
          </p>
          <p className="text-3xl font-light tracking-tight text-white sm:text-4xl">
            ${balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-2.5">
            <span
              className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
              }`}
            >
              <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d={isPositive ? "M4.5 15.75l7.5-7.5 7.5 7.5" : "M19.5 8.25l-7.5 7.5-7.5-7.5"} />
              </svg>
              {isPositive ? "+" : ""}{percentChange}%
            </span>
            <span className="text-[11px] text-white/20">{t("dashboard.vsLastMonth")}</span>
          </div>
        </div>
        <div className="flex gap-0.5 self-start rounded-lg bg-white/[0.04] p-0.5">
          {periods.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-all duration-200 ${
                period === p.key
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-white/30 hover:text-white/60"
              }`}
            >
              {t(`chart.${p.key}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6" style={{ minHeight: 200, overflow: "hidden" }}>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="goldArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.18} />
                <stop offset="50%" stopColor="#f59e0b" stopOpacity={0.06} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" axisLine={false} tickLine={false}
              tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 10, fontWeight: 500 }} dy={8} />
            <YAxis axisLine={false} tickLine={false} tick={false}
              domain={[domainLow, domainHigh]} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2}
              fill="url(#goldArea)" dot={false}
              activeDot={{ r: 5, fill: "#f59e0b", stroke: "#0a0a0a", strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
