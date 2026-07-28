import { describe, it, expect } from "vitest";
import type { Budget, FinanceCategory, Transaction } from "../src/db/db";
import {
  calcMRR,
  calcMonthTotals,
  calcSafeToSpendToday,
  categoryDeltas,
  currentMonthKey,
  expenseByCategory,
  isInMonth,
  previousMonthKey,
  sumByCategory,
} from "../src/modules/finance/financeSummary";

const tx = (
  date: string,
  type: "income" | "expense",
  amount: number,
  category: string,
): Transaction => ({ id: 0, date, type, amount, category }) as Transaction;

const cat = (
  name: string,
  kind: "income" | "expense",
  recurring = false,
): FinanceCategory => ({ id: 0, name, kind, recurring }) as FinanceCategory;

const M = "2026-07";
const SAMPLE: Transaction[] = [
  tx("2026-07-01", "income", 50000, "Salary"),
  tx("2026-07-05", "income", 10000, "Freelance Income"),
  tx("2026-07-06", "income", 5000, "Business"),
  tx("2026-07-10", "expense", 12000, "Rent"),
  tx("2026-07-11", "expense", 3000, "Food"),
  tx("2026-06-30", "income", 99999, "Salary"), // last month
];

describe("currentMonthKey", () => {
  it("uses the LOCAL month (C1 regression)", () => {
    // Dec 31 23:59 local — UTC implementation reported January in UTC+ zones.
    expect(currentMonthKey(new Date(2026, 11, 31, 23, 59))).toBe("2026-12");
  });
});

describe("month filtering and sums", () => {
  it("isInMonth matches by prefix", () => {
    expect(isInMonth("2026-07-15", M)).toBe(true);
    expect(isInMonth("2026-06-30", M)).toBe(false);
  });

  it("sumByCategory only counts the month", () => {
    expect(sumByCategory(SAMPLE, "Salary", M)).toBe(50000);
  });

  it("previousMonthKey rolls back across a year boundary", () => {
    expect(previousMonthKey("2026-07")).toBe("2026-06");
    expect(previousMonthKey("2026-01")).toBe("2025-12");
  });

  it("calcMonthTotals nets income vs expense", () => {
    const { totalIncome, totalExpense, net } = calcMonthTotals(SAMPLE, M);
    expect(totalIncome).toBe(65000);
    expect(totalExpense).toBe(15000);
    expect(net).toBe(50000);
  });
});

describe("business metrics", () => {
  it("MRR uses the user's recurring flag, not hardcoded names", () => {
    const categories = [
      cat("Salary", "income", true),
      cat("Freelance Income", "income", true),
      cat("Business", "income", false), // one-off, excluded
    ];
    expect(calcMRR(SAMPLE, M, categories)).toBe(60000);
  });

  it("MRR is zero when nothing is marked recurring", () => {
    expect(calcMRR(SAMPLE, M, [cat("Salary", "income", false)])).toBe(0);
    expect(calcMRR(SAMPLE, M, [])).toBe(0);
  });

  it("expenseByCategory sorts high to low", () => {
    const rows = expenseByCategory(SAMPLE, M);
    expect(rows).toEqual([
      { category: "Rent", total: 12000 },
      { category: "Food", total: 3000 },
    ]);
  });
});

describe("calcSafeToSpendToday", () => {
  const budgets: Budget[] = [
    { id: 1, category: "Food", amount: 3000 } as Budget,
    { id: 2, category: "Rent", amount: 12000 } as Budget,
  ];

  it("is null without budgets — nothing meaningful to say yet", () => {
    expect(calcSafeToSpendToday(SAMPLE, [], M)).toBeNull();
  });

  it("paces the remaining budget across the days left", () => {
    // July 15th → 17 days remaining (inclusive of today).
    const now = new Date(2026, 6, 15, 12);
    const out = calcSafeToSpendToday(SAMPLE, budgets, M, now)!;
    expect(out.budgetTotal).toBe(15000);
    expect(out.remaining).toBe(0); // 15000 budget − 15000 spent
    expect(out.perDay).toBe(0);
  });

  it("reports a negative remaining when over budget", () => {
    const over = [...SAMPLE, tx("2026-07-12", "expense", 5000, "Food")];
    const out = calcSafeToSpendToday(over, budgets, M, new Date(2026, 6, 15))!;
    expect(out.remaining).toBe(-5000);
    expect(out.perDay).toBe(0); // never suggests a negative daily allowance
  });

  it("ignores spending in categories with no budget", () => {
    const withUnbudgeted = [
      ...SAMPLE,
      tx("2026-07-12", "expense", 9999, "Shopping"),
    ];
    const out = calcSafeToSpendToday(
      withUnbudgeted,
      budgets,
      M,
      new Date(2026, 6, 15),
    )!;
    expect(out.remaining).toBe(0); // unchanged by the unbudgeted category
  });
});

describe("categoryDeltas", () => {
  it("reports month-over-month percentage change", () => {
    const txns = [
      tx("2026-06-05", "expense", 100, "Food"),
      tx("2026-07-05", "expense", 130, "Food"),
    ];
    const rows = categoryDeltas(txns, M);
    expect(rows[0]).toEqual({
      category: "Food",
      current: 130,
      previous: 100,
      pctChange: 30,
    });
  });

  it("skips categories with no prior-month baseline", () => {
    const txns = [tx("2026-07-05", "expense", 500, "New Thing")];
    expect(categoryDeltas(txns, M)).toEqual([]);
  });
});
