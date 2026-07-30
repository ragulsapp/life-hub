/**
 * Wake-up streaks — consecutive days the alarm mission was solved.
 *
 * Pure functions over local data, same shape as habitStreaks.ts. The streak
 * counts *days you got up with the app*, deliberately not "days you were on
 * time": the mission can only be cleared by solving it, so a row already
 * proves you were up. Punctuality is reported separately rather than being a
 * second way to lose the streak.
 */
import { WAKE_ON_TIME_GRACE_MIN, type WakeLog } from "../db/db";
import { localDateStr } from "./dates";

function dayBefore(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return d;
}

/**
 * Consecutive days ending today (or yesterday, if today's alarm hasn't gone
 * off yet — an unfinished morning shouldn't read as a broken streak).
 */
export function calcWakeStreak(logs: WakeLog[], now = new Date()): number {
  const days = new Set(logs.map((l) => l.date));
  if (days.size === 0) return 0;

  const today = localDateStr(now);
  // Anchor on today if it's already logged, else on yesterday.
  let cursor = days.has(today) ? new Date(now) : dayBefore(now);
  let streak = 0;
  while (days.has(localDateStr(cursor))) {
    streak += 1;
    cursor = dayBefore(cursor);
  }
  return streak;
}

/** Longest run of consecutive logged days, ever. */
export function calcBestWakeStreak(logs: WakeLog[]): number {
  const dates = [...new Set(logs.map((l) => l.date))].sort();
  if (dates.length === 0) return 0;

  let best = 1;
  let run = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(`${dates[i - 1]}T00:00:00`);
    prev.setDate(prev.getDate() + 1);
    if (localDateStr(prev) === dates[i]) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }
  return best;
}

/** Share of the most recent `days` wakes that were within the grace window. */
export function onTimeRate(logs: WakeLog[], days = 30): number | null {
  const recent = [...logs].sort((a, b) => b.solvedAt - a.solvedAt).slice(0, days);
  if (recent.length === 0) return null;
  const onTime = recent.filter(
    (l) => l.minutesLate <= WAKE_ON_TIME_GRACE_MIN,
  ).length;
  return Math.round((onTime / recent.length) * 100);
}

export const isOnTime = (minutesLate: number): boolean =>
  minutesLate <= WAKE_ON_TIME_GRACE_MIN;

/**
 * How many minutes after its scheduled time an alarm was actually cleared.
 * Rounds toward zero so a "Ring now" preview reads as 0 rather than negative.
 */
export function minutesAfterScheduled(
  scheduledTime: string,
  solvedAt: number,
): number {
  const [h, m] = scheduledTime.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  const solved = new Date(solvedAt);
  const scheduled = new Date(solved);
  scheduled.setHours(h, m, 0, 0);
  // An alarm cleared just after midnight belongs to the previous evening's
  // scheduled time, not one 23 hours in the future.
  if (scheduled.getTime() - solved.getTime() > 12 * 3600_000) {
    scheduled.setDate(scheduled.getDate() - 1);
  }
  return Math.max(0, Math.round((solved.getTime() - scheduled.getTime()) / 60_000));
}

/** A short, never-scolding line about how the wake went. */
export function wakeLine(streak: number, minutesLate: number): string {
  const punctual = isOnTime(minutesLate);
  if (streak <= 1) {
    return punctual
      ? "You're up. That's day one of the streak."
      : "You're up — that's what counts. Day one of the streak.";
  }
  if (punctual) {
    return `${streak} mornings in a row. You're becoming someone who gets up.`;
  }
  return `${streak} mornings in a row — ${minutesLate} min past the alarm, but you still got up.`;
}
