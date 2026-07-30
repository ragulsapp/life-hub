import { db, type SoundId } from "../db/db";
import {
  ensureChannels,
  habitNotifId,
  isNative,
  noteNotifId,
  scheduleDailyReminder,
  setReminderSound,
  taskNotifId,
} from "./notify";

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
  if (sound) setReminderSound(sound);
  await ensureChannels();

  const [habits, tasks, notes] = await Promise.all([
    db.habits.toArray(),
    db.tasks.toArray(),
    db.notes.toArray(),
  ]);

  for (const h of habits) {
    if (h.reminderEnabled && h.reminderTime && !h.archived) {
      await scheduleDailyReminder(
        habitNotifId(h.id),
        "Habit reminder",
        `Time for: ${h.name}`,
        h.reminderTime,
      );
    }
  }
  for (const t of tasks) {
    if (t.reminderEnabled && t.reminderTime && !t.done) {
      await scheduleDailyReminder(
        taskNotifId(t.id),
        "Task reminder",
        t.title,
        t.reminderTime,
      );
    }
  }
  for (const n of notes) {
    if (n.reminderEnabled && n.reminderTime) {
      await scheduleDailyReminder(
        noteNotifId(n.id),
        "Note reminder",
        n.title,
        n.reminderTime,
      );
    }
  }
}
