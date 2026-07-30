import { useState } from "react";
import { motion } from "framer-motion";
import type { Transaction } from "../../db/db";
import {
  calcMonthTotals,
  categoryDeltas,
  previousMonthKey,
} from "./financeSummary";

/** "2026-07" -> "Jul 2026" */
function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

/** The last `count` month keys, newest first, ending at `endKey`. */
function recentMonths(endKey: string, count: number): string[] {
  const out = [endKey];
  for (let i = 1; i < count; i++) out.push(previousMonthKey(out[out.length - 1]));
  return out;
}

const money = (n: number) => `₹${Math.round(n).toLocaleString()}`;

/**
 * Where the money actually went, over time.
 *
 * `categoryDeltas` already existed and computed month-over-month change — it
 * was just never imported by any view, so the app knew this and never said it.
 */
export function SpendingHistory({
  transactions,
  monthKey,
}: {
  transactions: Transaction[];
  monthKey: string;
}) {
  const [expanded, setExpanded] = useState(false);

  const months = recentMonths(monthKey, expanded ? 12 : 6);
  const series = months
    .map((k) => ({ key: k, ...calcMonthTotals(transactions, k) }))
    .reverse(); // oldest first, so the chart reads left-to-right

  const hasAny = series.some((m) => m.totalExpense > 0 || m.totalIncome > 0);
  if (!hasAny) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Once you've logged a month or two, your spending history shows up here.
      </p>
    );
  }

  const peak = Math.max(
    ...series.map((m) => Math.max(m.totalExpense, m.totalIncome)),
    1,
  );

  const deltas = categoryDeltas(transactions, monthKey)
    .filter((d) => d.current > 0 || d.previous > 0)
    .sort((a, b) => b.current - a.current)
    .slice(0, 6);

  return (
    <div className="flex flex-col gap-4">
      {/* Income vs expense per month */}
      <div>
        <div className="flex h-28 items-end gap-2">
          {series.map((m) => (
            <div key={m.key} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-full w-full items-end justify-center gap-0.5">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(m.totalIncome / peak) * 100}%` }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="w-1/2 min-h-[2px] rounded-t bg-emerald-400/70"
                  title={`${monthLabel(m.key)} in: ${money(m.totalIncome)}`}
                />
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(m.totalExpense / peak) * 100}%` }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="w-1/2 min-h-[2px] rounded-t bg-rose-400/80"
                  title={`${monthLabel(m.key)} out: ${money(m.totalExpense)}`}
                />
              </div>
              <span className="text-[9px] text-slate-400">
                {monthLabel(m.key).split(" ")[0]}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-center gap-4 text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <i className="h-2 w-2 rounded-sm bg-emerald-400/70" /> In
          </span>
          <span className="flex items-center gap-1">
            <i className="h-2 w-2 rounded-sm bg-rose-400/80" /> Out
          </span>
        </div>
      </div>

      {/* This month vs last, by category */}
      {deltas.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t border-slate-200/70 pt-3 dark:border-slate-600/40">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            vs {monthLabel(previousMonthKey(monthKey))}
          </div>
          {deltas.map((d) => {
            const up = d.pctChange > 0;
            const isNew = d.previous === 0;
            // An unchanged category showed "↓ 0%", which reads as a decrease.
            const flat = !isNew && d.pctChange === 0;
            return (
              <div key={d.category} className="flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200">
                  {d.category}
                </span>
                <span className="tabular-nums text-slate-500 dark:text-slate-400">
                  {money(d.current)}
                </span>
                <span
                  className={`w-16 text-right text-xs tabular-nums ${
                    isNew || flat
                      ? "text-slate-400"
                      : up
                        ? "text-rose-500"
                        : "text-emerald-500"
                  }`}
                >
                  {isNew
                    ? "new"
                    : flat
                      ? "same"
                      : `${up ? "↑" : "↓"} ${Math.abs(d.pctChange)}%`}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={() => setExpanded((v) => !v)}
        className="self-start text-xs font-semibold text-cyan-500 hover:underline dark:text-cyan-300"
      >
        {expanded ? "Show 6 months" : "Show 12 months"}
      </button>
    </div>
  );
}
