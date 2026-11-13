import { db, type RecurringTransaction } from "../../db/db";
import { localMonthKey } from "../../lib/dates";
import {
  cancelReminder,
  recurringNotifId,
  scheduleOnce,
} from "../../lib/notify";

/** The hour a payment-due alert arrives on its day. */
const DUE_HOUR = 9;

function dueOn(year: number, monthIndex: number, dayOfMonth: number): Date {
  // Day 0 of the next month is the last day of this one — so day 31 lands on
  // the 28th/29th/30th in a short month, matching isPending's clamp.
  const last = new Date(year, monthIndex + 1, 0).getDate();
  return new Date(year, monthIndex, Math.min(dayOfMonth, last), DUE_HOUR, 0);
}

/**
 * Whether today is the item's (clamped) due day — the day the OS alert
 * covers. The in-app poll stays quiet on that day on the phone, so the two
 * never double up, but still nudges on a later day while it is unpaid.
 */
export function isDueToday(
  r: Pick<RecurringTransaction, "dayOfMonth">,
  now: Date = new Date(),
): boolean {
  return dueOn(now.getFullYear(), now.getMonth(), r.dayOfMonth).getDate() === now.getDate();
}

/**
 * When a recurring item's "payment due" alert should next fire, or null if it
 * should have none.
 *
 * Always exactly one alert ahead. This month's due moment if it is still to
 * come and the month is unconfirmed; otherwise next month's. A due date that
 * has already passed unconfirmed is not lost — it sits in the pending list,
 * which is computed from the data and is the real backstop.
 */
export function nextDueAt(
  r: Pick<RecurringTransaction, "dayOfMonth" | "active" | "generatedMonth">,
  now: Date = new Date(),
): Date | null {
  if (!r.active) return null;
  const thisMonth = dueOn(now.getFullYear(), now.getMonth(), r.dayOfMonth);
  if (r.generatedMonth !== localMonthKey(now) && thisMonth > now) {
    return thisMonth;
  }
  return dueOn(now.getFullYear(), now.getMonth() + 1, r.dayOfMonth);
}

/**
 * Bring one recurring item's OS alert in line with its row.
 *
 * The due alert used to come only from the in-app poll, so on the phone it
 * arrived only if the app was open on the day. Every change to a recurring
 * item — add, edit, pause, confirm, delete — goes through recurringActions,
 * which calls this afterwards, so the alert can never drift from the data.
 */
export async function rescheduleRecurring(id: number): Promise<void> {
  const r = await db.recurringTransactions.get(id);
  const at = r ? nextDueAt(r) : null;
  if (!r || !at) {
    await cancelReminder(recurringNotifId(id));
    return;
  }
  await scheduleOnce(
    recurringNotifId(id),
    "Recurring payment due",
    `${r.category} — ₹${r.amount.toLocaleString()}`,
    at,
    { kind: "recurring-due", recurringId: id },
  );
}
