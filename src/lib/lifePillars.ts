/**
 * Four Life Pillars — Health, Wealth, Knowledge, Productivity.
 *
 * Deliberately four numbers rather than one blended "life score": a single
 * figure hides which area is actually slipping, which is the whole point of
 * the dashboard. Pure functions over local data — no network, no model.
 */
import type {
  BodyProfile,
  Budget,
  Goal,
  Habit,
  HabitLog,
  HealthMetric,
  Pillar,
  Transaction,
} from "../db/db";
import { pillarForIdentity } from "../db/db";
import { localDateStr } from "./dates";
import { isDueOn } from "../modules/habits/habitStreaks";
import {
  ageFromBirthYear,
  sleepTargetHours,
  waterTargetMl,
} from "./bodyMetrics";
import { latestValue, targetAdherence } from "./healthMetrics";

export interface PillarScore {
  pillar: Pillar;
  /** 0-100, or null when there's nothing to measure yet. */
  score: number | null;
  /** Percentage-point change vs. the previous 7 days. */
  trend: number | null;
  habitCount: number;
}

const WINDOW_DAYS = 7;

/** Average days in a month — used to prorate a monthly budget onto a window. */
const DAYS_PER_MONTH = 30.44;

function dayOffset(days: number, from = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() - days);
  return d;
}

/** The dates in a window, newest first. */
function windowDates(
  startOffset: number,
  endOffset: number,
  now = new Date(),
): string[] {
  const out: string[] = [];
  for (let i = startOffset; i < endOffset; i++) {
    out.push(localDateStr(dayOffset(i, now)));
  }
  return out;
}

/**
 * Budget adherence over an arbitrary window, by prorating the monthly budget
 * across it. Windowed (rather than month-to-date) so the current and prior
 * windows are directly comparable — which is what makes a trend arrow honest.
 */
function budgetAdherenceOverWindow(
  transactions: Transaction[],
  budgets: Budget[],
  dates: string[],
): number | null {
  if (budgets.length === 0 || dates.length === 0) return null;
  const monthlyTotal = budgets.reduce((s, b) => s + b.amount, 0);
  if (monthlyTotal <= 0) return null;
  const allowance = (monthlyTotal / DAYS_PER_MONTH) * dates.length;
  const inWindow = new Set(dates);
  const budgeted = new Set(budgets.map((b) => b.category));
  const spent = transactions
    .filter(
      (t) =>
        t.type === "expense" &&
        inWindow.has(t.date) &&
        budgeted.has(t.category),
    )
    .reduce((s, t) => s + t.amount, 0);
  const ratio = spent / allowance;
  return Math.max(
    0,
    Math.min(100, Math.round((1 - Math.max(0, ratio - 1)) * 100)),
  );
}

/**
 * How well the user met their own hydration and sleep targets over a window.
 *
 * Deliberately excludes weight: weight is an *outcome*, not a behaviour, and
 * scoring it would turn the dashboard into a source of pressure about body
 * size. Returns null unless the user has both a profile and actual logs — so
 * enabling this can never silently move someone's Life Balance.
 */
function healthAdherenceOverWindow(
  metrics: HealthMetric[],
  profile: BodyProfile | undefined,
  dates: string[],
): number | null {
  if (!profile || dates.length === 0) return null;
  const parts: number[] = [];

  const weight = latestValue(metrics, "weight");
  const water =
    profile.waterTargetMlOverride ?? (weight ? waterTargetMl(weight) : null);
  if (water) {
    const hit = targetAdherence(metrics, "water-ml", water, dates.length, dates);
    if (hit !== null) parts.push(hit);
  }

  const age = profile.birthYear ? ageFromBirthYear(profile.birthYear) : null;
  const sleepMin =
    profile.sleepTargetHoursOverride ??
    (age ? sleepTargetHours(age).min : null);
  if (sleepMin) {
    const hit = targetAdherence(
      metrics,
      "sleep-hours",
      sleepMin,
      dates.length,
      dates,
    );
    if (hit !== null) parts.push(hit);
  }

  if (parts.length === 0) return null;
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
}

/** Average of the components a pillar actually has data for. */
function blend(...parts: (number | null)[]): number | null {
  const known = parts.filter((p): p is number => p !== null);
  if (known.length === 0) return null;
  return Math.round(known.reduce((a, b) => a + b, 0) / known.length);
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
  /** Optional so existing call sites keep working unchanged. */
  healthMetrics: HealthMetric[] = [],
  profile?: BodyProfile,
): PillarScore[] {
  const pillars: Pillar[] = ["health", "wealth", "knowledge", "productivity"];
  const currentDates = windowDates(0, WINDOW_DAYS, now);
  const priorDates = windowDates(WINDOW_DAYS, WINDOW_DAYS * 2, now);

  return pillars.map((pillar) => {
    const mine = habits.filter(
      (h) => !h.archived && pillarForIdentity(h.category) === pillar,
    );

    const current = completionRate(mine, logs, 0, WINDOW_DAYS, now);
    const prior = completionRate(mine, logs, WINDOW_DAYS, WINDOW_DAYS * 2, now);

    /**
     * Score and trend must be built from the SAME components, or the arrow
     * contradicts the number it sits next to. Anything blended into the score
     * is therefore also blended into the prior window.
     */
    const extraFor = (dates: string[]): (number | null)[] => {
      if (pillar === "wealth") {
        return [budgetAdherenceOverWindow(transactions, budgets, dates)];
      }
      if (pillar === "health") {
        return [healthAdherenceOverWindow(healthMetrics, profile, dates)];
      }
      return [];
    };

    const score = blend(current.rate, ...extraFor(currentDates));
    const priorScore = blend(prior.rate, ...extraFor(priorDates));

    // The headline wealth number stays month-to-date, which is what a user
    // means by "am I within budget" — the windowed figure above only drives
    // the direction arrow.
    const monthBudget =
      pillar === "wealth"
        ? wealthFromBudget(transactions, budgets, monthKey)
        : null;
    const headline =
      pillar === "wealth" && monthBudget !== null
        ? blend(current.rate, monthBudget)
        : score;

    return {
      pillar,
      score: headline,
      trend:
        score === null || priorScore === null ? null : score - priorScore,
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
