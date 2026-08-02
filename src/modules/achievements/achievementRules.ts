/**
 * Milestones worth celebrating — deliberately sparse.
 *
 * A badge for every small thing is noise; these are thresholds that take real
 * time to reach, so hitting one actually means something. Pure functions over
 * local data, evaluated on render.
 */
import type { Goal, Habit, HabitLog, Transaction, WakeLog } from "../../db/db";
import { calcBestStreak } from "../habits/habitStreaks";
import { calcBestWakeStreak } from "../../lib/wakeStreak";

export interface AchievementDef {
  key: string;
  title: string;
  icon: string;
  /** Human-readable requirement, shown while still locked. */
  requirement: string;
  progress: number;
  target: number;
}

const STREAK_TIERS = [7, 30, 100, 365];
const COMPLETION_TIERS = [10, 50, 100, 500];
const SAVINGS_TIERS = [10_000, 50_000, 100_000, 500_000];
const GOAL_TIERS = [1, 5, 10, 25];
const WAKE_TIERS = [7, 30, 100, 365];
const WORKOUT_TIERS = [100];
const FIRST_MONTH_DAYS = 30;

export function evaluateAchievements(
  logs: HabitLog[],
  goals: Goal[],
  transactions: Transaction[],
  /** Optional so existing call sites keep working unchanged. */
  wakeLogs: WakeLog[] = [],
  habits: Habit[] = [],
  /** Undefined for installs that completed onboarding before this field
   *  existed — the achievement simply doesn't appear for them, rather than
   *  inventing a start date. */
  onboardingCompletedAt?: number,
): AchievementDef[] {
  const out: AchievementDef[] = [];

  // Longest streak across every habit.
  const habitNames = [...new Set(logs.map((l) => l.habitName))];
  const bestStreak = habitNames.reduce(
    (max, name) => Math.max(max, calcBestStreak(logs, name)),
    0,
  );
  for (const tier of STREAK_TIERS) {
    out.push({
      key: `streak-${tier}`,
      title: `${tier}-Day Streak`,
      icon: "🔥",
      requirement: `Keep any habit going ${tier} days straight`,
      progress: Math.min(bestStreak, tier),
      target: tier,
    });
  }

  // Total completions — rewards volume over time.
  const completions = logs.filter((l) => l.completed).length;
  for (const tier of COMPLETION_TIERS) {
    out.push({
      key: `completions-${tier}`,
      title: `${tier} Completions`,
      icon: "✅",
      requirement: `Complete ${tier} habits in total`,
      progress: Math.min(completions, tier),
      target: tier,
    });
  }

  // Net saved = lifetime income − expense (only meaningful once positive).
  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const expense = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const saved = Math.max(0, income - expense);
  for (const tier of SAVINGS_TIERS) {
    out.push({
      key: `saved-${tier}`,
      title: `₹${tier.toLocaleString()} Saved`,
      icon: "💰",
      requirement: `Net savings reach ₹${tier.toLocaleString()}`,
      progress: Math.min(saved, tier),
      target: tier,
    });
  }

  // Mornings you beat the mission — the alarm can't be silenced any other way,
  // so each one is a day you genuinely got out of bed.
  const bestWake = calcBestWakeStreak(wakeLogs);
  for (const tier of WAKE_TIERS) {
    out.push({
      key: `wake-${tier}`,
      title: `${tier}-Morning Streak`,
      icon: "🌅",
      requirement: `Beat the wake-up mission ${tier} days straight`,
      progress: Math.min(bestWake, tier),
      target: tier,
    });
  }

  const completedGoals = goals.filter((g) => g.status === "completed").length;
  for (const tier of GOAL_TIERS) {
    out.push({
      key: `goals-${tier}`,
      title: tier === 1 ? "First Goal Done" : `${tier} Goals Completed`,
      icon: "🏆",
      requirement: `Complete ${tier} goal${tier > 1 ? "s" : ""}`,
      progress: Math.min(completedGoals, tier),
      target: tier,
    });
  }

  // Workouts — completions of habits under the "Athlete" identity, joined
  // by name the same way identityStrength() in lifePillars.ts does.
  const identityByName = new Map(habits.map((h) => [h.name, h.category]));
  const workouts = logs.filter(
    (l) => l.completed && identityByName.get(l.habitName) === "Athlete",
  ).length;
  for (const tier of WORKOUT_TIERS) {
    out.push({
      key: `workouts-${tier}`,
      title: `${tier} Workouts`,
      icon: "💪",
      requirement: `Complete ${tier} Athlete-identity habits`,
      progress: Math.min(workouts, tier),
      target: tier,
    });
  }

  // First month — anchored to onboarding completion, not backfilled for
  // installs that finished onboarding before this field existed.
  if (onboardingCompletedAt !== undefined) {
    const daysSince = (Date.now() - onboardingCompletedAt) / 86_400_000;
    out.push({
      key: "first-month",
      title: "First Month Completed",
      icon: "📅",
      requirement: `Use Life Mentor for ${FIRST_MONTH_DAYS} days`,
      progress: Math.min(Math.max(daysSince, 0), FIRST_MONTH_DAYS),
      target: FIRST_MONTH_DAYS,
    });
  }

  return out;
}

export const isUnlocked = (a: AchievementDef): boolean =>
  a.progress >= a.target;
