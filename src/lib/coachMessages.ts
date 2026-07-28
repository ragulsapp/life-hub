/**
 * Daily Coach copy — composed from local data with templates, no LLM.
 *
 * Voice rules (see the plan's "Coach personality"): supportive, practical,
 * short, motivating. Never scold, never give financial or medical advice,
 * always end with one concrete action. 2-3 sentences maximum.
 */
import type { Budget, Habit, HabitLog, Transaction } from "../db/db";
import { localDateStr } from "./dates";
import { isDueOn } from "../modules/habits/habitStreaks";
import { calcSafeToSpendToday } from "../modules/finance/financeSummary";

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export interface DayStats {
  due: number;
  done: number;
  /** Percentage 0-100, or null when nothing was scheduled. */
  rate: number | null;
}

export function statsForDay(
  habits: Habit[],
  logs: HabitLog[],
  day: Date,
): DayStats {
  const ds = localDateStr(day);
  const completed = new Set(
    logs.filter((l) => l.completed && l.date === ds).map((l) => l.habitName),
  );
  const due = habits.filter(
    (h) =>
      !h.archived &&
      // A habit can't be "missed" on a day before it was created.
      (!h.createdAt || localDateStr(new Date(h.createdAt)) <= ds) &&
      isDueOn(h.schedule, day),
  );
  const done = due.filter((h) => completed.has(h.name)).length;
  return {
    due: due.length,
    done,
    rate: due.length === 0 ? null : Math.round((done / due.length) * 100),
  };
}

/**
 * The morning briefing line: how yesterday went, plus today's shape.
 * Returns one short paragraph; the "what to do next" line comes from
 * getRecommendation() so there's exactly one call to action on screen.
 */
export function dailyCoachMessage(
  habits: Habit[],
  logs: HabitLog[],
  transactions: Transaction[],
  budgets: Budget[],
  monthKey: string,
  now = new Date(),
): string {
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const y = statsForDay(habits, logs, yesterday);
  const t = statsForDay(habits, logs, now);
  const parts: string[] = [];

  if (y.rate === null) {
    parts.push("Fresh start today.");
  } else if (y.rate >= 80) {
    parts.push(`Yesterday was strong — ${y.done} of ${y.due} habits done.`);
  } else if (y.rate >= 40) {
    parts.push(`Yesterday you finished ${y.done} of ${y.due} habits.`);
  } else {
    parts.push("Yesterday got away from you — today's a clean slate.");
  }

  if (t.due > 0) {
    const left = t.due - t.done;
    parts.push(
      left === 0
        ? "Everything due today is already done."
        : `${left} ${left === 1 ? "habit" : "habits"} due today.`,
    );
  }

  const safe = calcSafeToSpendToday(transactions, budgets, monthKey, now);
  if (safe && safe.remaining >= 0) {
    parts.push(`₹${safe.perDay.toLocaleString()} safe to spend today.`);
  }

  return parts.join(" ");
}
