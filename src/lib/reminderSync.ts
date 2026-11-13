import { db, type SoundId } from "../db/db";
import { nextDueAt, rescheduleRecurring } from "../modules/finance/recurringDue";
import {
  fastTargetAt,
  scheduleFastComplete,
} from "../modules/health/fastingActions";
import {
  alarmSlotIds,
  cancelNotifications,
  cancelReminder,
  isManagedNotifId,
  pendingNotificationIds,
  fastNotifId,
  recurringNotifId,
  scheduleAlarm,
  ensureChannels,
  habitNotifId,
  isNative,
  NIGHT_REMINDER_NOTIF_ID,
  noteNotifId,
  scheduleDailyReminder,
  setReminderSound,
  taskNotifId,
} from "./notify";

/** One reminder the last resync could not register with the OS. */
export interface ResyncFailure {
  /** Human-readable: which row, so the diagnostic can name it. */
  what: string;
  error: string;
}

let lastFailures: ResyncFailure[] = [];

/** What the most recent resync failed to schedule. Empty when all went in. */
export function lastResyncFailures(): ResyncFailure[] {
  return [...lastFailures];
}

/**
 * Run one schedule call so that its failure stays its own.
 *
 * The resync used to be one long chain of awaits: a single throw — one row
 * Android refused, one malformed time — aborted every reminder after it, and
 * nothing anywhere said so. The order was alarms, habits, tasks, notes, then
 * the nightly reminder, so a failure in a task silently took out every note
 * reminder while habit reminders kept working. That is precisely the fault
 * that was reported, and it is the shape this guard removes: each reminder
 * now succeeds or fails alone, and a failure is recorded where the Settings
 * diagnostic can show it.
 */
async function attempt(what: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    console.error("reminder resync failed:", what, err);
    lastFailures.push({
      what,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Re-register every enabled reminder's native OS schedule.
 *
 * Needed on launch (covers reminders created before the plugin existed,
 * restored from a backup, or cleared by an OS/app-data reset) and again after
 * the reminder tone changes — a scheduled notification is pinned to the channel
 * it was created with, so a new tone only reaches reminders that get rescheduled.
 */
export async function resyncNativeReminders(sound?: SoundId): Promise<void> {
  if (!isNative) return;
  lastFailures = [];
  if (sound) setReminderSound(sound);
  await attempt("notification channels", ensureChannels);

  const [habits, tasks, notes, alarms, fasts, recurring, settings] =
    await Promise.all([
      db.habits.toArray(),
      db.tasks.toArray(),
      db.notes.toArray(),
      db.alarms.toArray(),
      db.fastingSessions.toArray(),
      db.recurringTransactions.toArray(),
      db.appSettings.get(1),
    ]);

  // Every id this run intends the OS to hold. Anything else in the app's own
  // ranges is a leftover and gets cleared at the end.
  const wanted = new Set<number>();

  // Alarms were missing from this resync because they had no native schedule
  // at all — they relied on the in-app poll, which cannot run when the app is
  // closed, which is exactly when an alarm has to work.
  for (const a of alarms) {
    alarmSlotIds(a).forEach((id) => wanted.add(id));
    await attempt(`alarm "${a.label || a.time}"`, () => scheduleAlarm(a));
  }

  for (const h of habits) {
    if (h.reminderEnabled && h.reminderTime && !h.archived) {
      const time = h.reminderTime;
      wanted.add(habitNotifId(h.id));
      await attempt(`habit "${h.name}"`, () =>
        scheduleDailyReminder(
          habitNotifId(h.id),
          "Habit reminder",
          `Time for: ${h.name}`,
          time,
        ),
      );
    }
  }
  for (const t of tasks) {
    if (t.reminderEnabled && t.reminderTime && !t.done) {
      const time = t.reminderTime;
      wanted.add(taskNotifId(t.id));
      await attempt(`task "${t.title}"`, () =>
        scheduleDailyReminder(taskNotifId(t.id), "Task reminder", t.title, time),
      );
    }
  }
  for (const n of notes) {
    if (n.reminderEnabled && n.reminderTime) {
      const time = n.reminderTime;
      wanted.add(noteNotifId(n.id));
      await attempt(`note "${n.title}"`, () =>
        scheduleDailyReminder(noteNotifId(n.id), "Note reminder", n.title, time),
      );
    }
  }

  // A running fast's completion. Covers fasts started before this existed
  // and any whose schedule failed at start. One already past its target is
  // left to the in-app poll; it is due now, not later.
  const now = Date.now();
  for (const f of fasts) {
    if (f.endedAt === undefined && !f.targetNotified && fastTargetAt(f).getTime() > now) {
      wanted.add(fastNotifId(f.id));
      await attempt(`fast "${f.label ?? `${f.targetHours}h`}"`, () =>
        scheduleFastComplete(f),
      );
    }
  }

  // Each active recurring payment holds one alert for its next due day.
  for (const r of recurring) {
    if (nextDueAt(r)) {
      wanted.add(recurringNotifId(r.id));
      await attempt(`payment "${r.category}"`, () => rescheduleRecurring(r.id));
    }
  }

  // On by default — undefined (pre-existing installs) and `true` both mean on.
  if (settings?.nightReminderEnabled !== false) {
    wanted.add(NIGHT_REMINDER_NOTIF_ID);
    await attempt("nightly plan-tomorrow reminder", () =>
      scheduleDailyReminder(
        NIGHT_REMINDER_NOTIF_ID,
        "Plan tomorrow",
        "Plan tomorrow before you sleep.",
        settings?.nightReminderTime ?? "21:00",
        { kind: "night-reminder" },
      ),
    );
  } else {
    await attempt("nightly reminder (cancel)", () =>
      cancelReminder(NIGHT_REMINDER_NOTIF_ID),
    );
  }

  /**
   * Clear what nothing wants any more.
   *
   * Scheduling only ever ADDS. A reminder whose row stopped wanting one — a
   * task ticked done, a note deleted before deletes cancelled, a reminder
   * switched off while the OS call failed — stayed queued in Android
   * forever, because no code path ever looked at what the OS was holding.
   * Finished tasks went on reminding every day. This compares the OS's
   * queue with what the database actually wants and removes the
   * difference, so every phone heals on its next launch.
   */
  await attempt("clearing reminders no longer wanted", async () => {
    const stale = (await pendingNotificationIds()).filter(
      (id) => isManagedNotifId(id) && !wanted.has(id),
    );
    await cancelNotifications(stale);
  });
}
