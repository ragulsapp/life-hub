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
): AlarmDueState {
  if (!matchesDays(days, now)) return "not-due";
  const late = minutesLate(time, now);
  if (late < 0) return "not-due";
  return late <= ALARM_GRACE_MINUTES ? "ring" : "missed";
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
