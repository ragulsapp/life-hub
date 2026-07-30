/**
 * Shared habit write-paths. Both the Dashboard quick-toggles and the Habits
 * screen mutate the same "one log row per habit per day" shape, so the logic
 * lives here rather than being duplicated (and drifting) in two components.
 */
import { db, type Habit, type HabitSchedule } from "../../db/db";
import { localDateStr } from "../../lib/dates";
import { toast } from "../../lib/toast";
import { cancelReminder, habitNotifId } from "../../lib/notify";

export const MAX_PINNED = 2;

/**
 * Case-insensitive habit lookup. Dexie's `&name` unique index is
 * case-sensitive, so "exercise" and "Exercise" would otherwise both insert
 * and read as two unrelated habits.
 */
export async function findHabitByName(
  name: string,
): Promise<Habit | undefined> {
  const target = name.trim().toLowerCase();
  return db.habits
    .filter((h) => h.name.trim().toLowerCase() === target)
    .first();
}

export type CreateHabitResult = "created" | "restored" | "exists";

/**
 * The one habit-creation path. Previously the manual form, onboarding, and
 * (now) the Health practices shelf each rolled their own and drifted apart —
 * one seeded today's log row and never pinned, the other did the opposite.
 *
 * Returns what actually happened so callers can phrase their own feedback:
 *  - "created"  → a new habit row
 *  - "restored" → the name existed but was archived, so it was un-archived.
 *                 Archived habits are hidden from HabitsView but still hold
 *                 the unique name, so a blind `add()` here throws ConstraintError.
 *  - "exists"   → already active; nothing written. The existing identity is
 *                 left alone even if it differs from the template's — the user
 *                 may have filed it deliberately.
 */
export async function createHabitFromTemplate(
  tpl: { name: string; icon: string; color: string; identity?: string },
  opts: {
    schedule?: HabitSchedule;
    pinned?: boolean;
    seedTodayLog?: boolean;
  } = {},
): Promise<CreateHabitResult> {
  const { schedule = { type: "daily" }, pinned = false, seedTodayLog = true } =
    opts;
  const name = tpl.name.trim();
  if (!name) return "exists";

  const existing = await findHabitByName(name);
  if (existing) {
    if (existing.archived) {
      await db.habits.update(existing.id, { archived: false });
      return "restored";
    }
    return "exists";
  }

  await db.habits.add({
    name,
    color: tpl.color,
    icon: tpl.icon,
    schedule,
    category: tpl.identity,
    archived: false,
    pinned,
    createdAt: Date.now(),
  } as never);

  if (seedTodayLog) {
    const date = localDateStr();
    const log = await db.habitLogs.where({ date, habitName: name }).first();
    if (!log) {
      await db.habitLogs.add({ date, habitName: name, completed: false } as never);
    }
  }
  return "created";
}

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
