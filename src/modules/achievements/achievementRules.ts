/**
 * Milestones worth celebrating — deliberately sparse.
 *
 * A badge for every small thing is noise; these are thresholds that take real
 * time to reach, so hitting one actually means something. Pure functions over
 * local data, evaluated on render.
 */
import type { Goal, HabitLog, Transaction } from "../../db/db";
import { calcBestStreak } from "../habits/habitStreaks";

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
const SAVINGS_TIERS = [10_000, 100_000, 500_000];
const GOAL_TIERS = [1, 5, 25];

export function evaluateAchievements(
  logs: HabitLog[],
  goals: Goal[],
  transactions: Transaction[],
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

  return out;
}

export const isUnlocked = (a: AchievementDef): boolean =>
  a.progress >= a.target;
