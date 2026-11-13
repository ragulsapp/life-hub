import { db, type SoundId } from "../db/db";
import {
  cancelReminder,
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

  const [habits, tasks, notes, alarms, settings] = await Promise.all([
    db.habits.toArray(),
    db.tasks.toArray(),
    db.notes.toArray(),
    db.alarms.toArray(),
    db.appSettings.get(1),
  ]);

  // Alarms were missing from this resync because they had no native schedule
  // at all — they relied on the in-app poll, which cannot run when the app is
  // closed, which is exactly when an alarm has to work.
  for (const a of alarms) {
    await attempt(`alarm "${a.label || a.time}"`, () => scheduleAlarm(a));
  }

  for (const h of habits) {
    if (h.reminderEnabled && h.reminderTime && !h.archived) {
      const time = h.reminderTime;
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
      await attempt(`task "${t.title}"`, () =>
        scheduleDailyReminder(taskNotifId(t.id), "Task reminder", t.title, time),
      );
    }
  }
  for (const n of notes) {
    if (n.reminderEnabled && n.reminderTime) {
      const time = n.reminderTime;
      await attempt(`note "${n.title}"`, () =>
        scheduleDailyReminder(noteNotifId(n.id), "Note reminder", n.title, time),
      );
    }
  }

  // On by default — undefined (pre-existing installs) and `true` both mean on.
  if (settings?.nightReminderEnabled !== false) {
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
}
