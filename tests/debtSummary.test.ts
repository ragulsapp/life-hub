import { describe, it, expect } from "vitest";
import type { Debt } from "../src/db/db";
import {
  isSettled,
  overdueDebts,
  remainingAmount,
  totalLentOut,
  totalOwed,
} from "../src/modules/finance/debtSummary";

const debt = (
  type: Debt["type"],
  amount: number,
  paidAmount: number,
  extra: Partial<Debt> = {},
): Debt =>
  ({ id: 0, type, name: type, amount, paidAmount, createdAt: 0, ...extra }) as Debt;

describe("remainingAmount", () => {
  it("is amount minus paidAmount", () => {
    expect(remainingAmount(debt("loan", 1000, 400))).toBe(600);
  });

  it("floors at 0 rather than going negative on overpayment", () => {
    expect(remainingAmount(debt("loan", 1000, 1200))).toBe(0);
  });
});

describe("isSettled", () => {
  it("is settled once fully paid, even without an explicit settledAt", () => {
    expect(isSettled(debt("loan", 1000, 1000))).toBe(true);
  });

  it("is settled if settledAt is set even when a payment cleared it manually", () => {
    expect(isSettled(debt("loan", 1000, 1000, { settledAt: 5 }))).toBe(true);
  });

  it("is not settled while a balance remains", () => {
    expect(isSettled(debt("loan", 1000, 400))).toBe(false);
  });
});

describe("totalOwed / totalLentOut", () => {
  const debts: Debt[] = [
    debt("loan", 1000, 400), // owed: 600
    debt("emi", 500, 500), // settled
    debt("borrowed", 200, 0), // owed: 200
    debt("lent", 300, 100), // owed to user: 200
  ];

  it("sums only unsettled liability types for totalOwed", () => {
    expect(totalOwed(debts)).toBe(800);
  });

  it("sums only unsettled lent debts for totalLentOut", () => {
    expect(totalLentOut(debts)).toBe(200);
  });

  it("excludes settled debts from both totals", () => {
    const allSettled = debts.map((d) => ({ ...d, paidAmount: d.amount }));
    expect(totalOwed(allSettled)).toBe(0);
    expect(totalLentOut(allSettled)).toBe(0);
  });
});

describe("overdueDebts", () => {
  it("only returns unsettled debts past their due date, most overdue first", () => {
    const debts: Debt[] = [
      debt("loan", 1000, 0, { dueDate: "2026-07-01" }),
      debt("loan", 1000, 0, { dueDate: "2026-06-01" }),
      debt("loan", 1000, 1000, { dueDate: "2026-01-01" }), // settled — excluded
      debt("loan", 1000, 0, { dueDate: "2026-12-31" }), // future — excluded
      debt("loan", 1000, 0), // no due date — excluded
    ];
    const result = overdueDebts(debts, "2026-08-01");
    expect(result.map((d) => d.dueDate)).toEqual(["2026-06-01", "2026-07-01"]);
  });
});
