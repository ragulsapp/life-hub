import { describe, it, expect } from "vitest";
import type { Goal, Habit, HabitLog, Transaction } from "../src/db/db";
import { evaluateAchievements, isUnlocked } from "../src/modules/achievements/achievementRules";

const log = (habitName: string, completed = true, date = "2026-07-01"): HabitLog =>
  ({ id: 0, date, habitName, completed }) as HabitLog;

const habit = (name: string, category?: string): Habit =>
  ({
    id: 0,
    name,
    color: "#fff",
    icon: "🎯",
    schedule: { type: "daily" },
    archived: false,
    createdAt: 0,
    category,
  }) as Habit;

describe("evaluateAchievements — new tiers", () => {
  it("adds 50,000 to the savings tiers, between 10k and 100k", () => {
    // Assert on the underlying target values, not the .toLocaleString()
    // title strings — those are locale-dependent (e.g. Indian digit
    // grouping vs. Western) and not what this test is actually checking.
    const all = evaluateAchievements([], [], []);
    const savingsTargets = all
      .filter((a) => a.key.startsWith("saved-"))
      .map((a) => a.target);
    expect(savingsTargets).toEqual([10_000, 50_000, 100_000, 500_000]);
  });

  it("unlocks the new 50,000 savings tier once net savings reach it", () => {
    const transactions: Transaction[] = [
      { id: 1, date: "2026-07-01", type: "income", amount: 60_000, category: "Salary" } as Transaction,
      { id: 2, date: "2026-07-02", type: "expense", amount: 5_000, category: "Rent" } as Transaction,
    ];
    const all = evaluateAchievements([], [], transactions);
    const tier = all.find((a) => a.key === "saved-50000")!;
    expect(isUnlocked(tier)).toBe(true);
  });

  it("adds 10 to the goal tiers", () => {
    const all = evaluateAchievements([], [], []);
    const goalTiers = all.filter((a) => a.key.startsWith("goals-")).map((a) => a.target);
    expect(goalTiers).toEqual([1, 5, 10, 25]);
  });
});

describe("evaluateAchievements — workouts", () => {
  it("counts only completions of Athlete-identity habits", () => {
    const habits = [habit("Run", "Athlete"), habit("Read", "Reader")];
    const logs = [
      log("Run"),
      log("Run", true, "2026-07-02"),
      log("Read"), // different identity — excluded
      log("Unknown habit"), // no matching habit row at all — excluded
    ];
    const all = evaluateAchievements(logs, [], [], [], habits);
    const workouts = all.find((a) => a.key === "workouts-100")!;
    expect(workouts.progress).toBe(2);
  });

  it("ignores incomplete logs", () => {
    const habits = [habit("Run", "Athlete")];
    const logs = [log("Run", false)];
    const all = evaluateAchievements(logs, [], [], [], habits);
    expect(all.find((a) => a.key === "workouts-100")!.progress).toBe(0);
  });

  it("unlocks at exactly 100 workouts", () => {
    const habits = [habit("Run", "Athlete")];
    const logs = Array.from({ length: 100 }, (_, i) => log("Run", true, `2026-01-${i}`));
    const all = evaluateAchievements(logs, [], [], [], habits);
    expect(isUnlocked(all.find((a) => a.key === "workouts-100")!)).toBe(true);
  });

  it("defaults to no workout progress when habits are omitted (backward compatible)", () => {
    const logs = [log("Run")];
    const all = evaluateAchievements(logs, [], []);
    expect(all.find((a) => a.key === "workouts-100")!.progress).toBe(0);
  });
});

describe("evaluateAchievements — first month", () => {
  it("does not appear when onboardingCompletedAt is undefined", () => {
    const all = evaluateAchievements([], [], [], [], [], undefined);
    expect(all.find((a) => a.key === "first-month")).toBeUndefined();
  });

  it("appears with partial progress before 30 days have passed", () => {
    const fifteenDaysAgo = Date.now() - 15 * 86_400_000;
    const all = evaluateAchievements([], [], [], [], [], fifteenDaysAgo);
    const fm = all.find((a) => a.key === "first-month")!;
    expect(fm).toBeDefined();
    expect(fm.progress).toBeGreaterThanOrEqual(14);
    expect(fm.progress).toBeLessThanOrEqual(15);
    expect(isUnlocked(fm)).toBe(false);
  });

  it("is unlocked once 30 days have passed", () => {
    const fortyDaysAgo = Date.now() - 40 * 86_400_000;
    const all = evaluateAchievements([], [], [], [], [], fortyDaysAgo);
    const fm = all.find((a) => a.key === "first-month")!;
    expect(isUnlocked(fm)).toBe(true);
    expect(fm.progress).toBe(30); // capped at target, not allowed to overshoot
  });

  it("never goes negative for a future timestamp (defensive)", () => {
    const inTheFuture = Date.now() + 86_400_000;
    const all = evaluateAchievements([], [], [], [], [], inTheFuture);
    const fm = all.find((a) => a.key === "first-month")!;
    expect(fm.progress).toBe(0);
  });
});
