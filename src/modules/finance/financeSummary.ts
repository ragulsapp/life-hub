import type { Transaction } from "../../db/db";

export function currentMonthKey(date = new Date()): string {
  return date.toISOString().slice(0, 7); // YYYY-MM
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

export function calcProfitMargin(
  transactions: Transaction[],
  monthKey: string,
): { income: number; expense: number; profit: number } {
  const income = sumByCategory(
    transactions,
    "Agency Retainers (day1to1day)",
    monthKey,
  );
  const expense = sumByCategory(transactions, "Meta Ad Spend", monthKey);
  return { income, expense, profit: income - expense };
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

/** Monthly Recurring Revenue: recurring income categories summed for the month. */
const RECURRING_INCOME_CATEGORIES = [
  "Agency Retainers (day1to1day)",
  "Career Consulting (CCC)",
];

export function calcMRR(transactions: Transaction[], monthKey: string): number {
  return transactions
    .filter(
      (t) =>
        t.type === "income" &&
        RECURRING_INCOME_CATEGORIES.includes(t.category) &&
        isInMonth(t.date, monthKey),
    )
    .reduce((sum, t) => sum + t.amount, 0);
}
