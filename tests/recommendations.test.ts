import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Budget, Goal, Habit, HabitLog, Transaction } from "../src/db/db";
import { consecutiveMisses, getRecommendation } from "../src/lib/recommendations";
import { localDateStr } from "../src/lib/dates";

const NOW = new Date(2026, 6, 14, 10, 0); // Tuesday
const MONTH = "2026-07";

const habit = (name: string, createdDaysAgo = 60): Habit => {
  const created = new Date(NOW);
  created.setDate(created.getDate() - createdDaysAgo);
  return {
    id: 0,
    name,
    color: "#fff",
    icon: "x",
    schedule: { type: "daily" },
    category: "Runner",
    archived: false,
    createdAt: created.getTime(),
  } as Habit;
};

const log = (name: string, daysAgo: number, completed = true): HabitLog => {
  const d = new Date(NOW);
  d.setDate(d.getDate() - daysAgo);
  return { id: 0, date: localDateStr(d), habitName: name, completed } as HabitLog;
};

const base = {
  habits: [] as Habit[],
  logs: [] as HabitLog[],
  transactions: [] as Transaction[],
  budgets: [] as Budget[],
  goals: [] as Goal[],
  monthKey: MONTH,
  now: NOW,
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

describe("consecutiveMisses", () => {
  it("counts back from yesterday and stops at a completion", () => {
    const h = habit("Run");
    // Missed yesterday & 2 days ago, done 3 days ago.
    expect(consecutiveMisses(h, [log("Run", 3)], NOW)).toBe(2);
  });

  it("is zero when yesterday was done", () => {
    expect(consecutiveMisses(habit("Run"), [log("Run", 1)], NOW)).toBe(0);
  });

  it("never counts days before the habit existed", () => {
    // Created today — a brand-new habit must not report a month of misses.
    expect(consecutiveMisses(habit("Run", 0), [], NOW)).toBe(0);
    // Created 3 days ago with no completions → at most 3 missed days.
    expect(consecutiveMisses(habit("Run", 3), [], NOW)).toBe(3);
  });
});

describe("getRecommendation priority order", () => {
  it("prompts to get started with no data at all", () => {
    expect(getRecommendation(base).kind).toBe("get-started");
  });

  it("does not scold a brand-new user on day one", () => {
    const rec = getRecommendation({ ...base, habits: [habit("Run", 0)] });
    expect(rec.kind).not.toBe("habit-recovery");
    expect(rec.message).not.toMatch(/missed/i);
  });

  it("habit recovery outranks everything else", () => {
    const rec = getRecommendation({
      ...base,
      habits: [habit("Run")],
      logs: [log("Run", 5)], // missed several due days
      budgets: [{ id: 1, category: "Food", amount: 100 } as Budget],
      transactions: [
        { id: 1, date: "2026-07-02", type: "expense", amount: 500, category: "Food" } as Transaction,
      ],
    });
    expect(rec.kind).toBe("habit-recovery");
    // Never scolds — offers a smaller version instead.
    expect(rec.message).toMatch(/smaller version/i);
  });

  it("flags overspend when habits are fine", () => {
    const rec = getRecommendation({
      ...base,
      habits: [habit("Run")],
      logs: [log("Run", 1), log("Run", 2), log("Run", 3)],
      budgets: [{ id: 1, category: "Food", amount: 100 } as Budget],
      transactions: [
        { id: 1, date: "2026-07-02", type: "expense", amount: 500, category: "Food" } as Transaction,
      ],
    });
    expect(rec.kind).toBe("overspend");
    expect(rec.message).toContain("over budget");
  });

  it("nudges remaining habits when nothing is wrong", () => {
    const rec = getRecommendation({
      ...base,
      habits: [habit("Run")],
      logs: [log("Run", 1)], // yesterday done, today still open
    });
    expect(rec.kind).toBe("momentum");
    expect(rec.message).toContain("Run");
  });

  it("celebrates when everything due is done", () => {
    const rec = getRecommendation({
      ...base,
      habits: [habit("Run")],
      logs: [log("Run", 0), log("Run", 1)],
    });
    expect(rec.kind).toBe("all-clear");
  });

  it("surfaces an overdue goal", () => {
    const rec = getRecommendation({
      ...base,
      habits: [habit("Run")],
      logs: [log("Run", 0), log("Run", 1)],
      goals: [
        { id: 1, title: "Ship it", status: "active", targetDate: "2026-07-01" } as Goal,
      ],
    });
    expect(rec.kind).toBe("goal-overdue");
  });

  it("never gives financial advice on a spending spike", () => {
    const rec = getRecommendation({
      ...base,
      habits: [habit("Run")],
      logs: [log("Run", 0), log("Run", 1)],
      transactions: [
        { id: 1, date: "2026-06-05", type: "expense", amount: 100, category: "Food" } as Transaction,
        { id: 2, date: "2026-07-05", type: "expense", amount: 200, category: "Food" } as Transaction,
      ],
    });
    expect(rec.kind).toBe("spending-spike");
    expect(rec.message).toMatch(/100% higher/);
    expect(rec.message).not.toMatch(/should|invest|advice/i);
  });
});
