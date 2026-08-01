import {
  db,
  type FinanceCategoryKind,
  type RecurringTransaction,
} from "../../db/db";
import { localDateStr, localMonthKey } from "../../lib/dates";

export async function addRecurringTransaction(input: {
  type: FinanceCategoryKind;
  category: string;
  amount: number;
  dayOfMonth: number;
  note?: string;
}): Promise<void> {
  await db.recurringTransactions.add({ ...input, active: true } as never);
}

export async function updateRecurringTransaction(
  id: number,
  patch: Partial<
    Pick<
      RecurringTransaction,
      "type" | "category" | "amount" | "dayOfMonth" | "note" | "active"
    >
  >,
): Promise<void> {
  await db.recurringTransactions.update(id, patch);
}

export async function deleteRecurringTransaction(id: number): Promise<void> {
  await db.recurringTransactions.delete(id);
}

/**
 * The single code path for turning a recurring transaction into an actual
 * ledger entry for this month — used by both the notification's confirm
 * sheet and the manual "Confirm" button on the pending list. Idempotent:
 * re-checks `generatedMonth` inside the transaction, so a retained
 * notification-tap replay or a double-tap can't double-book.
 */
export async function confirmRecurringTransaction(
  id: number,
  now: Date = new Date(),
): Promise<void> {
  await db.transaction(
    "rw",
    db.recurringTransactions,
    db.transactions,
    async () => {
      const r = await db.recurringTransactions.get(id);
      if (!r) return;
      const thisMonth = localMonthKey(now);
      if (r.generatedMonth === thisMonth) return; // already confirmed this month

      await db.transactions.add({
        date: localDateStr(now),
        type: r.type,
        amount: r.amount,
        category: r.category,
        note: r.note,
      } as never);
      await db.recurringTransactions.update(id, { generatedMonth: thisMonth });
    },
  );
}
