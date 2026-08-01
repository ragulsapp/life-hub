import type { Budget, FinanceCategory, Transaction } from "../../db/db";
import { addDaysStr, localMonthKey } from "../../lib/dates";

export function currentMonthKey(date = new Date()): string {
  return localMonthKey(date); // YYYY-MM, local calendar (not UTC)
}

export function isInMonth(dateStr: string, monthKey: string): boolean {
  return dateStr.startsWith(monthKey);
}

export function sumByCategory(
  transactions: Transaction[],
  category: string,
  monthKey: string,
): number {
  return transactions
    .filter((t) => t.category === category && isInMonth(t.date, monthKey))
    .reduce((sum, t) => sum + t.amount, 0);
}

/** Expense totals grouped by category for the month, sorted high → low. */
export function expenseByCategory(
  transactions: Transaction[],
  monthKey: string,
): { category: string; total: number }[] {
  const map = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "expense" || !isInMonth(t.date, monthKey)) continue;
    map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
  }
  return [...map.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

/** Income totals grouped by category for the month, sorted high → low. */
export function incomeByCategory(
  transactions: Transaction[],
  monthKey: string,
): { category: string; total: number }[] {
  const map = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "income" || !isInMonth(t.date, monthKey)) continue;
    map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
  }
  return [...map.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

/** Previous month key, e.g. "2026-01" → "2025-12". */
export function previousMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, m - 2, 1); // m is 1-based; -2 steps back one month
  return localMonthKey(d);
}

export function calcMonthTotals(
  transactions: Transaction[],
  monthKey: string,
): { totalIncome: number; totalExpense: number; net: number } {
  const inMonth = transactions.filter((t) => isInMonth(t.date, monthKey));
  const totalIncome = inMonth
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = inMonth
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  return { totalIncome, totalExpense, net: totalIncome - totalExpense };
}

type PeriodTotals = { totalIncome: number; totalExpense: number; net: number };

function sumTotals(transactions: Transaction[]): PeriodTotals {
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  return { totalIncome, totalExpense, net: totalIncome - totalExpense };
}

/** Totals for a single calendar day (YYYY-MM-DD). */
export function calcDayTotal(transactions: Transaction[], date: string): PeriodTotals {
  return sumTotals(transactions.filter((t) => t.date === date));
}

/** Totals for the 7-day window starting at `weekStart` (inclusive both ends). */
export function calcWeekTotal(
  transactions: Transaction[],
  weekStart: string,
): PeriodTotals {
  const weekEnd = addDaysStr(weekStart, 6);
  return sumTotals(
    transactions.filter((t) => t.date >= weekStart && t.date <= weekEnd),
  );
}

/** Totals for a calendar year. */
export function calcYearTotals(transactions: Transaction[], year: number): PeriodTotals {
  const prefix = String(year);
  return sumTotals(transactions.filter((t) => t.date.startsWith(prefix)));
}

/**
 * Monthly Recurring Revenue — income from categories the user flagged as
 * recurring (replaces the old hardcoded category-name list).
 */
export function calcMRR(
  transactions: Transaction[],
  monthKey: string,
  categories: FinanceCategory[] = [],
): number {
  const recurring = new Set(
    categories.filter((c) => c.recurring && c.kind === "income").map((c) => c.name),
  );
  if (recurring.size === 0) return 0;
  return transactions
    .filter(
      (t) =>
        t.type === "income" &&
        recurring.has(t.category) &&
        isInMonth(t.date, monthKey),
    )
    .reduce((sum, t) => sum + t.amount, 0);
}

export function daysRemainingInMonth(now = new Date()): number {
  const total = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return Math.max(1, total - now.getDate() + 1); // include today
}

/**
 * Decision support, not accounting: how much is still safe to spend today,
 * pacing the remaining budget evenly across the days left in the month.
 * Returns null when no budgets are set (nothing meaningful to say yet).
 */
export function calcSafeToSpendToday(
  transactions: Transaction[],
  budgets: Budget[],
  monthKey: string,
  now = new Date(),
): { perDay: number; remaining: number; budgetTotal: number } | null {
  if (budgets.length === 0) return null;
  const budgetTotal = budgets.reduce((sum, b) => sum + b.amount, 0);
  if (budgetTotal <= 0) return null;

  const budgeted = new Set(budgets.map((b) => b.category));
  const spent = transactions
    .filter(
      (t) =>
        t.type === "expense" &&
        isInMonth(t.date, monthKey) &&
        budgeted.has(t.category),
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const remaining = budgetTotal - spent;
  const perDay = remaining / daysRemainingInMonth(now);
  return {
    perDay: Math.max(0, Math.round(perDay)),
    remaining: Math.round(remaining),
    budgetTotal,
  };
}

/**
 * Month-over-month movement per expense category — the input for the
 * "you spent 30% more on food" Finance Insight. Sorted by biggest change.
 */
export function categoryDeltas(
  transactions: Transaction[],
  monthKey: string,
): { category: string; current: number; previous: number; pctChange: number }[] {
  const prevKey = previousMonthKey(monthKey);
  const current = new Map(
    expenseByCategory(transactions, monthKey).map((r) => [r.category, r.total]),
  );
  const previous = new Map(
    expenseByCategory(transactions, prevKey).map((r) => [r.category, r.total]),
  );

  const rows: {
    category: string;
    current: number;
    previous: number;
    pctChange: number;
  }[] = [];
  for (const [category, cur] of current) {
    const prev = previous.get(category) ?? 0;
    if (prev <= 0) continue; // no baseline — a % change would be meaningless
    rows.push({
      category,
      current: cur,
      previous: prev,
      pctChange: Math.round(((cur - prev) / prev) * 100),
    });
  }
  return rows.sort((a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange));
}
