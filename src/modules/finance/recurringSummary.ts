import type { RecurringTransaction } from "../../db/db";
import { localMonthKey } from "../../lib/dates";

function daysInMonth(now: Date): number {
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

/**
 * A recurring transaction whose day has arrived this month and hasn't been
 * confirmed yet. `dayOfMonth` is clamped to the month's actual last day, so
 * e.g. day 31 still fires on Feb 28 rather than never firing at all in a
 * shorter month.
 */
export function isPending(r: RecurringTransaction, now: Date = new Date()): boolean {
  if (!r.active) return false;
  if (r.generatedMonth === localMonthKey(now)) return false;
  const effectiveDay = Math.min(r.dayOfMonth, daysInMonth(now));
  return now.getDate() >= effectiveDay;
}

/**
 * Computed straight from Dexie state, independent of whether any
 * notification ever fired — this is the actual reliability backstop, not
 * the notification itself.
 */
export function pendingRecurring(
  all: RecurringTransaction[],
  now: Date = new Date(),
): RecurringTransaction[] {
  return all.filter((r) => isPending(r, now));
}
