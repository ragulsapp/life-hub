import { db, type Debt, type DebtType } from "../../db/db";
import { localDateStr } from "../../lib/dates";

/** Transaction category each debt type's payments post under. Free-text —
 *  no financeCategories row is required for these to total correctly. */
const DEBT_CATEGORY_LABEL: Record<DebtType, string> = {
  loan: "Loan Repayment",
  emi: "EMI Payment",
  borrowed: "Borrowed Repayment",
  lent: "Lent Repayment",
};

export async function addDebt(input: {
  type: DebtType;
  name: string;
  amount: number;
  dueDate?: string;
  note?: string;
}): Promise<void> {
  await db.debts.add({
    ...input,
    paidAmount: 0,
    createdAt: Date.now(),
  } as never);
}

export async function updateDebt(
  id: number,
  patch: Partial<Pick<Debt, "type" | "name" | "amount" | "dueDate" | "note">>,
): Promise<void> {
  await db.debts.update(id, patch);
}

export async function deleteDebt(id: number): Promise<void> {
  await db.debts.delete(id);
}

/**
 * Record a payment against a debt. Also writes a linked Transaction — an
 * expense for money the user owes (loan/EMI/borrowed), income for money
 * being repaid to the user (lent) — inside the same Dexie transaction, so
 * Safe-to-Spend and every other finance total stay a complete picture of
 * cash movement rather than silently missing debt-related money.
 */
export async function recordDebtPayment(id: number, amount: number): Promise<void> {
  if (!Number.isFinite(amount) || amount <= 0) return;

  await db.transaction("rw", db.debts, db.transactions, async () => {
    const debt = await db.debts.get(id);
    if (!debt) return;

    const paidAmount = debt.paidAmount + amount;
    await db.debts.update(id, {
      paidAmount,
      settledAt: paidAmount >= debt.amount ? (debt.settledAt ?? Date.now()) : debt.settledAt,
    });

    await db.transactions.add({
      date: localDateStr(),
      type: debt.type === "lent" ? "income" : "expense",
      amount,
      category: DEBT_CATEGORY_LABEL[debt.type],
      note: debt.name,
    } as never);
  });
}
