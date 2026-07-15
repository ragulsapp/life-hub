import type { HabitLog, HabitSchedule } from "../../db/db";

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Whether a habit with this schedule is expected on the given date. */
export function isDueOn(schedule: HabitSchedule, date: Date): boolean {
  switch (schedule.type) {
    case "daily":
      return true;
    case "weekdays":
      return schedule.days.includes(date.getDay());
    case "times-per-week":
      return true; // flexible — always available to log
  }
}

export function scheduleLabel(schedule: HabitSchedule): string {
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  switch (schedule.type) {
    case "daily":
      return "Every day";
    case "weekdays":
      if (schedule.days.length === 7) return "Every day";
      if (
        schedule.days.length === 5 &&
        [1, 2, 3, 4, 5].every((d) => schedule.days.includes(d))
      )
        return "Weekdays";
      if (
        schedule.days.length === 2 &&
        [0, 6].every((d) => schedule.days.includes(d))
      )
        return "Weekends";
      return schedule.days
        .slice()
        .sort()
        .map((d) => names[d])
        .join(", ");
    case "times-per-week":
      return `${schedule.target}× / week`;
  }
}

/** Completions logged in the current ISO-ish week (Mon–Sun) for a habit. */
export function calcWeekCompletions(
  logs: HabitLog[],
  habitName: string,
): number {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const mondayOffset = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - mondayOffset);
  const weekDates = new Set<string>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDates.add(toDateStr(d));
  }
  return logs.filter(
    (l) => l.habitName === habitName && l.completed && weekDates.has(l.date),
  ).length;
}

/** Counts consecutive completed days ending today (or the most recent logged day). */
export function calcStreak(logs: HabitLog[], habitName: string): number {
  const completedDates = new Set(
    logs
      .filter((l) => l.habitName === habitName && l.completed)
      .map((l) => l.date),
  );

  let streak = 0;
  const cursor = new Date();
  for (;;) {
    const dateStr = toDateStr(cursor);
    if (!completedDates.has(dateStr)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Longest ever run of consecutive completed days for this habit. */
export function calcBestStreak(logs: HabitLog[], habitName: string): number {
  const completedDates = Array.from(
    new Set(
      logs
        .filter((l) => l.habitName === habitName && l.completed)
        .map((l) => l.date),
    ),
  ).sort();

  let best = 0;
  let run = 0;
  let prev: Date | null = null;

  for (const dateStr of completedDates) {
    const d = new Date(dateStr + "T00:00:00");
    if (prev) {
      const diffDays = Math.round((d.getTime() - prev.getTime()) / 86400000);
      run = diffDays === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

/** % of the last `days` calendar days (ending today) marked completed. */
export function calcCompletionRate(
  logs: HabitLog[],
  habitName: string,
  days = 30,
): number {
  const completedDates = new Set(
    logs
      .filter((l) => l.habitName === habitName && l.completed)
      .map((l) => l.date),
  );
  let hits = 0;
  const cursor = new Date();
  for (let i = 0; i < days; i++) {
    if (completedDates.has(toDateStr(cursor))) hits += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return Math.round((hits / days) * 100);
}

export interface DayCell {
  date: string;
  weekday: string;
  completed: boolean;
  isToday: boolean;
}

/** Last `days` calendar days (oldest first) with completion state for this habit. */
export function calcRecentDays(
  logs: HabitLog[],
  habitName: string,
  days = 7,
): DayCell[] {
  const completedDates = new Set(
    logs
      .filter((l) => l.habitName === habitName && l.completed)
      .map((l) => l.date),
  );
  const today = toDateStr(new Date());
  const cells: DayCell[] = [];
  const cursor = new Date();
  cursor.setDate(cursor.getDate() - (days - 1));
  for (let i = 0; i < days; i++) {
    const dateStr = toDateStr(cursor);
    cells.push({
      date: dateStr,
      weekday: cursor.toLocaleDateString(undefined, { weekday: "narrow" }),
      completed: completedDates.has(dateStr),
      isToday: dateStr === today,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return cells;
}

export interface HeatCell {
  date: string;
  completed: boolean;
  inFuture: boolean;
}

/**
 * GitHub-style grid: `weeks` columns, each a Mon–Sun column ending with the
 * current week. Returns columns of 7 cells (index 0 = Monday).
 */
export function calcHeatmap(
  logs: HabitLog[],
  habitName: string,
  weeks = 12,
): HeatCell[][] {
  const completedDates = new Set(
    logs
      .filter((l) => l.habitName === habitName && l.completed)
      .map((l) => l.date),
  );
  const today = new Date();
  const todayStr = toDateStr(today);
  const day = today.getDay();
  const mondayOffset = day === 0 ? 6 : day - 1;
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() - mondayOffset);

  const columns: HeatCell[][] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const colMonday = new Date(thisMonday);
    colMonday.setDate(thisMonday.getDate() - w * 7);
    const col: HeatCell[] = [];
    for (let d = 0; d < 7; d++) {
      const cell = new Date(colMonday);
      cell.setDate(colMonday.getDate() + d);
      const ds = toDateStr(cell);
      col.push({
        date: ds,
        completed: completedDates.has(ds),
        inFuture: ds > todayStr,
      });
    }
    columns.push(col);
  }
  return columns;
}

export function uniqueHabitNames(logs: HabitLog[]): string[] {
  return Array.from(new Set(logs.map((l) => l.habitName)));
}
