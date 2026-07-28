/**
 * Four Life Pillars — Health, Wealth, Knowledge, Productivity.
 *
 * Deliberately four numbers rather than one blended "life score": a single
 * figure hides which area is actually slipping, which is the whole point of
 * the dashboard. Pure functions over local data — no network, no model.
 */
import type {
  Budget,
  Goal,
  Habit,
  HabitLog,
  Pillar,
  Transaction,
} from "../db/db";
import { pillarForIdentity } from "../db/db";
import { localDateStr } from "./dates";
import { isDueOn } from "../modules/habits/habitStreaks";

export interface PillarScore {
  pillar: Pillar;
  /** 0-100, or null when there's nothing to measure yet. */
  score: number | null;
  /** Percentage-point change vs. the previous 7 days. */
  trend: number | null;
  habitCount: number;
}

const WINDOW_DAYS = 7;

function dayOffset(days: number, from = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() - days);
  return d;
}

/**
 * Completion rate over a window: completed ÷ scheduled, counting only days a
 * habit was actually due (so a weekday-only habit isn't punished on Sunday).
 */
function completionRate(
  habits: Habit[],
  logs: HabitLog[],
  startOffset: number,
  endOffset: number,
  now = new Date(),
): { rate: number | null; due: number; done: number } {
  const completed = new Set(
    logs.filter((l) => l.completed).map((l) => `${l.date}|${l.habitName}`),
  );

  let due = 0;
  let done = 0;
  for (let i = startOffset; i < endOffset; i++) {
    const d = dayOffset(i, now);
    const ds = localDateStr(d);
    for (const h of habits) {
      if (h.archived) continue;
      // Days before a habit existed aren't misses — they'd unfairly drag a
      // new user's score to zero on day one.
      if (h.createdAt && ds < localDateStr(new Date(h.createdAt))) continue;
      if (!isDueOn(h.schedule, d)) continue;
      due += 1;
      if (completed.has(`${ds}|${h.name}`)) done += 1;
    }
  }
  return { rate: due === 0 ? null : Math.round((done / due) * 100), due, done };
}

/** Budget adherence: 100 when nothing overspent, scaling down as spend passes budget. */
function wealthFromBudget(
  transactions: Transaction[],
  budgets: Budget[],
  monthKey: string,
): number | null {
  if (budgets.length === 0) return null;
  const total = budgets.reduce((s, b) => s + b.amount, 0);
  if (total <= 0) return null;
  const budgeted = new Set(budgets.map((b) => b.category));
  const spent = transactions
    .filter(
      (t) =>
        t.type === "expense" &&
        t.date.startsWith(monthKey) &&
        budgeted.has(t.category),
    )
    .reduce((s, t) => s + t.amount, 0);
  const ratio = spent / total;
  // Under budget → 100. Double the budget → 0. Linear in between.
  return Math.max(0, Math.min(100, Math.round((1 - Math.max(0, ratio - 1)) * 100)));
}

export function calcPillars(
  habits: Habit[],
  logs: HabitLog[],
  transactions: Transaction[],
  budgets: Budget[],
  monthKey: string,
  now = new Date(),
): PillarScore[] {
  const pillars: Pillar[] = ["health", "wealth", "knowledge", "productivity"];

  return pillars.map((pillar) => {
    const mine = habits.filter(
      (h) => !h.archived && pillarForIdentity(h.category) === pillar,
    );

    const current = completionRate(mine, logs, 0, WINDOW_DAYS, now);
    const prior = completionRate(mine, logs, WINDOW_DAYS, WINDOW_DAYS * 2, now);

    let score = current.rate;
    // Wealth blends habit consistency with real budget adherence; if the user
    // has budgets but no wealth habits, the budget alone still tells us something.
    if (pillar === "wealth") {
      const budgetScore = wealthFromBudget(transactions, budgets, monthKey);
      if (budgetScore !== null) {
        score = score === null ? budgetScore : Math.round((score + budgetScore) / 2);
      }
    }

    return {
      pillar,
      score,
      trend:
        current.rate === null || prior.rate === null
          ? null
          : current.rate - prior.rate,
      habitCount: mine.length,
    };
  });
}

/** Overall Life Balance — average of whichever pillars have data. */
export function calcLifeBalance(scores: PillarScore[]): number | null {
  const known = scores.filter((s) => s.score !== null).map((s) => s.score!);
  if (known.length === 0) return null;
  return Math.round(known.reduce((a, b) => a + b, 0) / known.length);
}

/** Identity strength — how many times a habit of this identity was completed. */
export function identityStrength(
  habits: Habit[],
  logs: HabitLog[],
): { identity: string; count: number }[] {
  const byName = new Map(habits.map((h) => [h.name, h.category]));
  const counts = new Map<string, number>();
  for (const l of logs) {
    if (!l.completed) continue;
    const identity = byName.get(l.habitName);
    if (!identity) continue;
    counts.set(identity, (counts.get(identity) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([identity, count]) => ({ identity, count }))
    .sort((a, b) => b.count - a.count);
}

/** Goals whose target date has passed but are still active. */
export function overdueGoals(goals: Goal[], now = new Date()): Goal[] {
  const today = localDateStr(now);
  return goals.filter(
    (g) => g.status === "active" && g.targetDate && g.targetDate < today,
  );
}
