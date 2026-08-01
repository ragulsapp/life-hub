import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { motion } from "framer-motion";
import { db } from "../../db/db";
import { Card } from "../../components/Card";
import { AnimatedNumber } from "../../components/AnimatedNumber";
import { localDateStr, startOfWeekStr } from "../../lib/dates";
import {
  calcDayTotal,
  calcMonthTotals,
  calcWeekTotal,
  calcYearTotals,
  currentMonthKey,
  expenseByCategory,
  incomeByCategory,
  previousMonthKey,
  sumByCategory,
} from "./financeSummary";

type Period = "day" | "week" | "month" | "year";

const PERIODS: { id: Period; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
];

const money = (n: number) => `₹${Math.round(n).toLocaleString()}`;

/** The last `count` month keys, newest first, ending at `endKey`. */
function recentMonths(endKey: string, count: number): string[] {
  const out = [endKey];
  for (let i = 1; i < count; i++) out.push(previousMonthKey(out[out.length - 1]));
  return out;
}

function CategoryList({ rows }: { rows: { category: string; total: number }[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-400">Nothing this month yet.</p>;
  }
  const max = Math.max(...rows.map((r) => r.total), 1);
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((r) => (
        <li key={r.category}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-slate-700 dark:text-slate-200">{r.category}</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {money(r.total)}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700/50">
            <div
              className="h-full rounded-full bg-cyan-400"
              style={{ width: `${(r.total / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ReportsView() {
  const [period, setPeriod] = useState<Period>("month");
  const transactions = useLiveQuery(() => db.transactions.toArray(), []) ?? [];
  const budgets = useLiveQuery(() => db.budgets.toArray(), []) ?? [];
  const now = new Date();
  const monthKey = currentMonthKey(now);

  const totals =
    period === "day"
      ? calcDayTotal(transactions, localDateStr(now))
      : period === "week"
        ? calcWeekTotal(transactions, startOfWeekStr(now))
        : period === "year"
          ? calcYearTotals(transactions, now.getFullYear())
          : calcMonthTotals(transactions, monthKey);

  const months = recentMonths(monthKey, 6).reverse();
  const savings = months.map((k) => ({ key: k, net: calcMonthTotals(transactions, k).net }));
  const maxAbsNet = Math.max(...savings.map((s) => Math.abs(s.net)), 1);

  const income = incomeByCategory(transactions, monthKey);
  const expense = expenseByCategory(transactions, monthKey);

  const budgetUsage = budgets
    .map((b) => ({
      category: b.category,
      spent: sumByCategory(transactions, b.category, monthKey),
      limit: b.amount,
    }))
    .sort((a, b) => b.spent / b.limit - a.spent / a.limit);

  return (
    <div className="flex flex-col gap-4">
      <Card title="Totals">
        <div className="mb-3 flex gap-1.5 rounded-2xl bg-slate-100 p-1 dark:bg-slate-700/40">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`flex-1 rounded-xl py-1.5 text-xs font-semibold transition-colors ${
                period === p.id
                  ? "bg-white text-cyan-500 shadow-e1 dark:bg-slate-800 dark:text-cyan-300"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-lg font-bold text-emerald-500">
              <AnimatedNumber value={totals.totalIncome} prefix="₹" />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Income</div>
          </div>
          <div>
            <div className="text-lg font-bold text-red-500">
              <AnimatedNumber value={totals.totalExpense} prefix="₹" />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Expense</div>
          </div>
          <div>
            <div
              className={`text-lg font-bold ${totals.net >= 0 ? "text-emerald-500" : "text-red-500"}`}
            >
              <AnimatedNumber value={totals.net} prefix="₹" />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Net</div>
          </div>
        </div>
      </Card>

      <Card title="Savings Over Time" delay={0.04}>
        <div className="flex h-24 items-center gap-2">
          {savings.map((s) => (
            <div key={s.key} className="flex h-full flex-1 flex-col items-center justify-center gap-1">
              <div className="flex h-full w-full flex-col justify-center">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(Math.abs(s.net) / maxAbsNet) * 50}%` }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className={`mx-auto w-2/3 min-h-[2px] rounded ${
                    s.net >= 0
                      ? "self-end rounded-b-none bg-emerald-400/80"
                      : "self-start rounded-t-none bg-red-400/80"
                  }`}
                  title={`${s.key}: ${money(s.net)}`}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-center text-xs text-slate-400">
          Net (income − expense) per month, last {months.length} months.
        </p>
      </Card>

      <Card title="Income Report" delay={0.06}>
        <CategoryList rows={income} />
      </Card>

      <Card title="Expense Report" delay={0.08}>
        <CategoryList rows={expense} />
      </Card>

      {budgetUsage.length > 0 && (
        <Card title="Budget Usage" delay={0.1}>
          <ul className="flex flex-col gap-2">
            {budgetUsage.map((b) => {
              const pct = b.limit > 0 ? Math.min(100, (b.spent / b.limit) * 100) : 0;
              const over = b.spent > b.limit;
              return (
                <li key={b.category}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-slate-700 dark:text-slate-200">{b.category}</span>
                    <span className={over ? "font-semibold text-red-500" : "text-slate-500 dark:text-slate-400"}>
                      {money(b.spent)} / {money(b.limit)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700/50">
                    <div
                      className={`h-full rounded-full ${over ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-emerald-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
