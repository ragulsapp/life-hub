import { describe, it, expect } from "vitest";
import type { Transaction } from "../src/db/db";
import {
  calcMRR,
  calcMonthTotals,
  calcProfitMargin,
  currentMonthKey,
  expenseByCategory,
  isInMonth,
  sumByCategory,
} from "../src/modules/finance/financeSummary";

const tx = (
  date: string,
  type: "income" | "expense",
  amount: number,
  category: string,
): Transaction => ({ id: 0, date, type, amount, category }) as Transaction;

const M = "2026-07";
const SAMPLE: Transaction[] = [
  tx("2026-07-01", "income", 50000, "Agency Retainers (day1to1day)"),
  tx("2026-07-05", "income", 10000, "Career Consulting (CCC)"),
  tx("2026-07-06", "income", 5000, "Digital Course Sales"),
  tx("2026-07-10", "expense", 12000, "Meta Ad Spend"),
  tx("2026-07-11", "expense", 3000, "Operations"),
  tx("2026-06-30", "income", 99999, "Agency Retainers (day1to1day)"), // last month
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
    expect(sumByCategory(SAMPLE, "Agency Retainers (day1to1day)", M)).toBe(50000);
  });

  it("calcMonthTotals nets income vs expense", () => {
    const { totalIncome, totalExpense, net } = calcMonthTotals(SAMPLE, M);
    expect(totalIncome).toBe(65000);
    expect(totalExpense).toBe(15000);
    expect(net).toBe(50000);
  });
});

describe("business metrics", () => {
  it("profit margin = retainers minus Meta Ad Spend", () => {
    const { income, expense, profit } = calcProfitMargin(SAMPLE, M);
    expect(income).toBe(50000);
    expect(expense).toBe(12000);
    expect(profit).toBe(38000);
  });

  it("MRR counts only recurring income categories", () => {
    expect(calcMRR(SAMPLE, M)).toBe(60000); // retainers + consulting, not course sales
  });

  it("expenseByCategory sorts high to low", () => {
    const rows = expenseByCategory(SAMPLE, M);
    expect(rows).toEqual([
      { category: "Meta Ad Spend", total: 12000 },
      { category: "Operations", total: 3000 },
    ]);
  });
});
