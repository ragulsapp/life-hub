import {
  db,
  type FinanceCategoryKind,
  type RecurringTransaction,
} from "../../db/db";
import { localDateStr, localMonthKey } from "../../lib/dates";
import { syncReminder } from "../../lib/reminderActions";
import { rescheduleRecurring } from "./recurringDue";

export async function addRecurringTransaction(input: {
  type: FinanceCategoryKind;
  category: string;
  amount: number;
  dayOfMonth: number;
  note?: string;
}): Promise<void> {
  const id = (await db.recurringTransactions.add({
    ...input,
    active: true,
  } as never)) as unknown as number;
  await syncReminder(() => rescheduleRecurring(id), { enabling: true });
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
  // A new day, a new amount, or a pause all change the alert.
  await syncReminder(() => rescheduleRecurring(id), { enabling: false });
}

export async function deleteRecurringTransaction(id: number): Promise<void> {
  await db.recurringTransactions.delete(id);
  await syncReminder(() => rescheduleRecurring(id), { enabling: false });
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
  // After the transaction commits: confirming this month moves the alert to
  // next month, so paying early never leaves a stale "due" on the way.
  await syncReminder(() => rescheduleRecurring(id), { enabling: false });
}
