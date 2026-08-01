import type { Debt, DebtType } from "../../db/db";
import { localDateStr } from "../../lib/dates";

/** Types that represent money the user owes someone else. */
const LIABILITY_TYPES: DebtType[] = ["loan", "emi", "borrowed"];

/** What's left on a debt — always derived, never stored, and floored at 0
 *  for display (a payment can exceed the principal without going negative). */
export function remainingAmount(debt: Debt): number {
  return Math.max(0, debt.amount - debt.paidAmount);
}

export function isSettled(debt: Debt): boolean {
  return debt.settledAt !== undefined || remainingAmount(debt) <= 0;
}

/** Total still owed by the user across loans, EMIs, and borrowed money. */
export function totalOwed(debts: Debt[]): number {
  return debts
    .filter((d) => LIABILITY_TYPES.includes(d.type) && !isSettled(d))
    .reduce((sum, d) => sum + remainingAmount(d), 0);
}

/** Total still owed back to the user by others. */
export function totalLentOut(debts: Debt[]): number {
  return debts
    .filter((d) => d.type === "lent" && !isSettled(d))
    .reduce((sum, d) => sum + remainingAmount(d), 0);
}

/** Unsettled debts whose due date has passed, most overdue first. */
export function overdueDebts(debts: Debt[], today = localDateStr()): Debt[] {
  return debts
    .filter((d) => !isSettled(d) && d.dueDate && d.dueDate < today)
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
}
