import { db, type Alarm } from "../../db/db";
import { localDateStr } from "../../lib/dates";
import { minutesAfterScheduled } from "../../lib/wakeStreak";

/**
 * Record that today's wake-up mission was solved.
 *
 * Idempotent per day: `wakeLogs.date` is a unique index, and a second alarm on
 * the same morning shouldn't count as a second wake. The first one wins, so
 * the recorded time is when the user actually got up.
 */
export async function recordWakeUp(
  alarm: Alarm,
  solvedAt = Date.now(),
): Promise<void> {
  const date = localDateStr(new Date(solvedAt));
  const existing = await db.wakeLogs.where("date").equals(date).first();
  if (existing) return;

  await db.wakeLogs.add({
    date,
    solvedAt,
    scheduledTime: alarm.time,
    minutesLate: minutesAfterScheduled(alarm.time, solvedAt),
  } as never);
}
