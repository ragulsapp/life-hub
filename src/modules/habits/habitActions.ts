/**
 * Shared habit write-paths. Both the Dashboard quick-toggles and the Habits
 * screen mutate the same "one log row per habit per day" shape, so the logic
 * lives here rather than being duplicated (and drifting) in two components.
 */
import { db, type Habit } from "../../db/db";
import { localDateStr } from "../../lib/dates";
import { toast } from "../../lib/toast";
import { cancelReminder, habitNotifId } from "../../lib/notify";

export const MAX_PINNED = 2;

/** Flip (or create) the log row for a habit on a given date. */
export async function setHabitDone(
  habitName: string,
  date: string,
  done: boolean,
): Promise<void> {
  const existing = await db.habitLogs.where({ date, habitName }).first();
  if (existing) {
    await db.habitLogs.update(existing.id, { completed: done });
  } else {
    await db.habitLogs.add({ date, habitName, completed: done } as never);
  }
}

/** Toggle today's completion for a habit. */
export async function toggleHabitToday(
  habitName: string,
  currentlyDone: boolean,
): Promise<void> {
  await setHabitDone(habitName, localDateStr(), !currentlyDone);
}

/** Pin/unpin a habit as a Dashboard quick-toggle, capped at MAX_PINNED. */
export async function togglePinned(habit: Habit): Promise<void> {
  if (habit.pinned) {
    await db.habits.update(habit.id, { pinned: false });
    return;
  }
  const pinnedCount = await db.habits.filter((h) => !!h.pinned).count();
  if (pinnedCount >= MAX_PINNED) {
    toast(
      `Dashboard shows ${MAX_PINNED} habits — unpin one first.`,
      "error",
    );
    return;
  }
  await db.habits.update(habit.id, { pinned: true });
}

/** Delete a habit, its scheduled reminder, and every log row that references it. */
export async function deleteHabit(habitName: string): Promise<void> {
  const habit = await db.habits.where("name").equals(habitName).first();
  if (habit) await cancelReminder(habitNotifId(habit.id));
  await db.habitLogs.where("habitName").equals(habitName).delete();
  await db.habits.where("name").equals(habitName).delete();
}
