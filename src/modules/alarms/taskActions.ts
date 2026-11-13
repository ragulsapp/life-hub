import { db } from "../../db/db";
import {
  cancelReminder,
  scheduleDailyReminder,
  taskNotifId,
} from "../../lib/notify";

/**
 * Mark a task done or not done — the one place that does it.
 *
 * Two screens tick tasks (Today's mission and the task list) and each used to
 * write `done` straight to the database. Neither touched the OS schedule, so
 * a finished task's reminder kept firing every day indefinitely: the resync
 * skips done tasks but never cancelled them, and nothing else did either.
 *
 * The tick is written first and the OS call second, and the OS call cannot
 * fail the tick. Marking something done is the user's action and must land;
 * a reminder that fails to cancel here is caught by the launch resync, which
 * clears any reminder it no longer wants.
 */
export async function setTaskDone(id: number, done: boolean): Promise<void> {
  const task = await db.tasks.get(id);
  if (!task) return;

  await db.tasks.update(id, {
    done,
    // Clearing completedAt on un-tick keeps "finished this week" honest.
    completedAt: done ? Date.now() : undefined,
  });

  try {
    if (done) {
      await cancelReminder(taskNotifId(id));
    } else if (task.reminderEnabled && task.reminderTime) {
      await scheduleDailyReminder(
        taskNotifId(id),
        "Task reminder",
        task.title,
        task.reminderTime,
      );
    }
  } catch (err) {
    console.error("task reminder update failed", id, err);
  }
}
