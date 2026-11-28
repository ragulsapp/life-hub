/**
 * Pure scheduling predicates — no React, no Dexie, fully unit-testable.
 *
 * Design (audit H4): a reminder is due once its time has PASSED today, not
 * only in the exact minute — browser timer throttling must never silently
 * skip one. Firing-once-per-day idempotency comes from lastFiredDate /
 * lastReminderDate, checked by the caller.
 */
import { localDateStr, localTimeStr } from "./dates";

/** Alarms ring up to this many minutes late; beyond it they count as missed. */
export const ALARM_GRACE_MINUTES = 60;

export function matchesDays(days: number[], now: Date): boolean {
  return days.length === 0 || days.includes(now.getDay());
}

/** Reminders (habit/task/note): due any time at-or-after `time` today. */
export function reminderDue(time: string, now: Date): boolean {
  return time <= localTimeStr(now); // HH:MM strings compare lexicographically
}

export function minutesLate(time: string, now: Date): number {
  const [h, m] = time.split(":").map(Number);
  return now.getHours() * 60 + now.getMinutes() - (h * 60 + m);
}

export type AlarmDueState = "not-due" | "ring" | "missed";

/**
 * Alarms: ring if within the grace window; report "missed" beyond it so the
 * caller can mark the day handled and notify instead of ringing absurdly late.
 */
export function alarmDueState(
  time: string,
  days: number[],
  now: Date,
  /** One-off on a specific day (YYYY-MM-DD). Only meaningful with no days. */
  onDate?: string,
): AlarmDueState {
  if (onDate && days.length === 0) {
    const today = localDateStr(now);
    if (today < onDate) return "not-due";
    if (today > onDate) return "missed";
  }
  if (!matchesDays(days, now)) return "not-due";
  const late = minutesLate(time, now);
  if (late < 0) return "not-due";
  return late <= ALARM_GRACE_MINUTES ? "ring" : "missed";
}

/**
 * When Android should fire a one-off alarm, or null if it isn't one / its
 * moment is gone. One-offs used to be scheduled as a DAILY repeat, so with
 * the app closed a "rings once" alarm kept arriving every morning until the
 * app was opened and the poll switched it off.
 */
export function oneOffAt(
  alarm: { time: string; days: number[]; onDate?: string },
  now: Date = new Date(),
): Date | null {
  if (alarm.days.length > 0) return null;
  const [h, m] = alarm.time.split(":").map(Number);
  let at: Date;
  if (alarm.onDate) {
    const [y, mo, d] = alarm.onDate.split("-").map(Number);
    at = new Date(y, mo - 1, d, h, m);
  } else {
    at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
    if (at <= now) at.setDate(at.getDate() + 1);
  }
  return at > now ? at : null;
}

/**
 * When creating/enabling a reminder whose time already passed today, anchor
 * lastFired to today so it doesn't fire the instant it's saved — it starts
 * from the next occurrence (standard alarm-clock semantics).
 */
export function reminderCreationGuard(
  time: string,
  now: Date = new Date(),
): string | undefined {
  return reminderDue(time, now) ? localDateStr(now) : undefined;
}
