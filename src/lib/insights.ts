/**
 * The on-device coach.
 *
 * Everything here is arithmetic over the user's own local data plus a
 * sentence template. No model, no network, no API key, no server — which
 * means zero cost, zero latency, works on a plane, and nothing to leak.
 *
 * The honest constraint that shapes this file: with a few weeks of one
 * person's data you can find a *suggestive* pattern but never a proven one.
 * So every correlation is gated behind a minimum sample size and phrased as
 * an observation ("you tend to…"), never as a causal claim or advice.
 */
import type { Goal, Habit, HabitLog, HealthMetric, Task, Transaction } from "../db/db";
import { localDateStr } from "./dates";
import { isDueOn } from "../modules/habits/habitStreaks";
import { dailyValues } from "./healthMetrics";
import { calcMonthTotals, currentMonthKey, previousMonthKey } from "../modules/finance/financeSummary";

/** Below this many days on EITHER side, a comparison isn't worth stating. */
export const MIN_SAMPLE_DAYS = 5;

function dayOffset(days: number, from = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() - days);
  return d;
}

/** Dates in [start, end) days ago, newest first. */
export function windowDates(start: number, end: number, now = new Date()): string[] {
  const out: string[] = [];
  for (let i = start; i < end; i++) out.push(localDateStr(dayOffset(i, now)));
  return out;
}

/** completed ÷ due across a set of dates, counting only days a habit was due. */
export function completionOver(
  habits: Habit[],
  logs: HabitLog[],
  dates: string[],
): { rate: number | null; due: number; done: number } {
  const done = new Set(
    logs.filter((l) => l.completed).map((l) => `${l.date}|${l.habitName}`),
  );
  let dueCount = 0;
  let doneCount = 0;
  for (const ds of dates) {
    const d = new Date(ds + "T12:00:00");
    for (const h of habits) {
      if (h.archived) continue;
      if (h.createdAt && ds < localDateStr(new Date(h.createdAt))) continue;
      if (!isDueOn(h.schedule, d)) continue;
      dueCount++;
      if (done.has(`${ds}|${h.name}`)) doneCount++;
    }
  }
  return {
    rate: dueCount === 0 ? null : Math.round((doneCount / dueCount) * 100),
    due: dueCount,
    done: doneCount,
  };
}

export interface WeeklyReview {
  strength: string;
  challenge: string;
  suggestion: string;
  habitRate: number | null;
  habitDelta: number | null;
}

/**
 * Sunday-style review: one thing that went well, one that didn't, one thing
 * to do about it. Never scolds — a bad week gets a smaller next step, not
 * a telling-off.
 */
export function weeklyReview(
  habits: Habit[],
  logs: HabitLog[],
  transactions: Transaction[],
  tasks: Task[],
  goals: Goal[],
  now = new Date(),
): WeeklyReview {
  const thisWeek = windowDates(0, 7, now);
  const lastWeek = windowDates(7, 14, now);
  const cur = completionOver(habits, logs, thisWeek);
  const prev = completionOver(habits, logs, lastWeek);
  const delta =
    cur.rate === null || prev.rate === null ? null : cur.rate - prev.rate;

  const weekAgoMs = now.getTime() - 7 * 86400000;
  const tasksDone = tasks.filter(
    (t) => t.completedAt != null && t.completedAt >= weekAgoMs,
  ).length;
  const goalsDone = goals.filter(
    (g) => g.completedAt != null && g.completedAt >= weekAgoMs,
  ).length;

  const monthKey = currentMonthKey(now);
  const thisMonth = calcMonthTotals(transactions, monthKey);
  const lastMonth = calcMonthTotals(transactions, previousMonthKey(monthKey));

  // --- Strength: lead with whatever genuinely went best.
  let strength = "You showed up this week — that's the part that compounds.";
  if (goalsDone > 0) {
    strength = `You completed ${goalsDone} goal${goalsDone > 1 ? "s" : ""} this week.`;
  } else if (delta !== null && delta > 0) {
    strength = `Habits are up ${delta} points on last week — ${cur.rate}% now.`;
  } else if (cur.rate !== null && cur.rate >= 80) {
    strength = `You held ${cur.rate}% habit completion this week.`;
  } else if (tasksDone > 0) {
    strength = `You cleared ${tasksDone} task${tasksDone > 1 ? "s" : ""} this week.`;
  }

  // --- Challenge: name one thing, factually, without blame.
  let challenge = "Nothing stands out as a problem this week.";
  if (delta !== null && delta < -10) {
    challenge = `Habits slipped ${Math.abs(delta)} points versus last week.`;
  } else if (cur.rate !== null && cur.rate < 50) {
    challenge = `You hit ${cur.rate}% of what you planned — the plan may be too big.`;
  } else if (
    lastMonth.totalExpense > 0 &&
    thisMonth.totalExpense > lastMonth.totalExpense * 1.25
  ) {
    challenge = "Spending is running well above last month.";
  }

  // --- Suggestion: exactly one concrete next action.
  let suggestion = "Pick tomorrow's single most important thing tonight.";
  if (cur.rate !== null && cur.rate < 50) {
    suggestion = "Try dropping to one habit a day until the streak returns.";
  } else if (delta !== null && delta < -10) {
    suggestion = "Pick the one habit that matters most and protect just that.";
  } else if (cur.rate !== null && cur.rate >= 80) {
    suggestion = "You have room for one more habit if you want it.";
  }

  return { strength, challenge, suggestion, habitRate: cur.rate, habitDelta: delta };
}

export interface Correlation {
  /** Plain-language observation, already phrased non-causally. */
  text: string;
  /** Days on the "good" side — surfaced so the UI can show its own footing. */
  sample: number;
}

/**
 * Split habit completion by whether a daily metric cleared its target.
 * Returns null unless BOTH sides have enough days — the whole point of the
 * guard is to avoid announcing a pattern from three days of data.
 */
function splitByMetric(
  habits: Habit[],
  logs: HabitLog[],
  metrics: HealthMetric[],
  type: "sleep-hours" | "water-ml",
  target: number,
  days: number,
  now: Date,
): { hitRate: number; missRate: number; sample: number } | null {
  const byDate = new Map(dailyValues(metrics, type).map((d) => [d.date, d.value]));
  const dates = windowDates(0, days, now).filter((d) => byDate.has(d));
  const hit = dates.filter((d) => (byDate.get(d) ?? 0) >= target);
  const miss = dates.filter((d) => (byDate.get(d) ?? 0) < target);
  if (hit.length < MIN_SAMPLE_DAYS || miss.length < MIN_SAMPLE_DAYS) return null;

  const a = completionOver(habits, logs, hit).rate;
  const b = completionOver(habits, logs, miss).rate;
  if (a === null || b === null) return null;
  return { hitRate: a, missRate: b, sample: hit.length };
}

/**
 * Observations worth showing. Empty is a perfectly good answer — saying
 * nothing beats inventing a pattern.
 */
export function findCorrelations(
  habits: Habit[],
  logs: HabitLog[],
  metrics: HealthMetric[],
  opts: { sleepTargetHours?: number | null; waterTargetMl?: number | null },
  days = 30,
  now = new Date(),
): Correlation[] {
  const out: Correlation[] = [];

  if (opts.sleepTargetHours) {
    const s = splitByMetric(habits, logs, metrics, "sleep-hours", opts.sleepTargetHours, days, now);
    // Only worth saying if the gap is big enough to be visible.
    if (s && s.hitRate - s.missRate >= 15) {
      out.push({
        text: `You tend to complete more habits after a full night's sleep — ${s.hitRate}% versus ${s.missRate}%.`,
        sample: s.sample,
      });
    }
  }

  if (opts.waterTargetMl) {
    const w = splitByMetric(habits, logs, metrics, "water-ml", opts.waterTargetMl, days, now);
    if (w && w.hitRate - w.missRate >= 15) {
      out.push({
        text: `Days you hit your water target line up with more habits done — ${w.hitRate}% versus ${w.missRate}%.`,
        sample: w.sample,
      });
    }
  }

  return out;
}

/**
 * The adaptive bit: after repeated misses, suggest a SMALLER target rather
 * than repeating the same one. People quit at exactly this moment, and the
 * useful response is to lower the bar, not to nag.
 */
export function strugglingHabits(
  habits: Habit[],
  logs: HabitLog[],
  missThreshold = 3,
  now = new Date(),
): { habit: Habit; missedInARow: number }[] {
  const done = new Set(
    logs.filter((l) => l.completed).map((l) => `${l.date}|${l.habitName}`),
  );
  const out: { habit: Habit; missedInARow: number }[] = [];

  for (const h of habits) {
    if (h.archived) continue;
    let missed = 0;
    // Walk back over days this habit was actually due; stop at the first hit.
    for (let i = 1; i <= 21; i++) {
      const d = dayOffset(i, now);
      const ds = localDateStr(d);
      if (h.createdAt && ds < localDateStr(new Date(h.createdAt))) break;
      if (!isDueOn(h.schedule, d)) continue;
      if (done.has(`${ds}|${h.name}`)) break;
      missed++;
    }
    if (missed >= missThreshold) out.push({ habit: h, missedInARow: missed });
  }
  return out.sort((a, b) => b.missedInARow - a.missedInARow);
}
