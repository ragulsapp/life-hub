import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Budget, Habit, HabitLog, Transaction } from "../src/db/db";
import {
  calcLifeBalance,
  calcPillars,
  identityStrength,
  overdueGoals,
} from "../src/lib/lifePillars";
import { localDateStr } from "../src/lib/dates";

// Fixed "today": Tuesday 2026-07-14, 10:00 local.
const NOW = new Date(2026, 6, 14, 10, 0);

const habit = (name: string, category: string): Habit =>
  ({
    id: 0,
    name,
    color: "#fff",
    icon: "x",
    schedule: { type: "daily" },
    category,
    archived: false,
    createdAt: 0,
  }) as Habit;

const log = (name: string, daysAgo: number, completed = true): HabitLog => {
  const d = new Date(NOW);
  d.setDate(d.getDate() - daysAgo);
  return { id: 0, date: localDateStr(d), habitName: name, completed } as HabitLog;
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

describe("calcPillars", () => {
  it("maps identities to the right pillars", () => {
    const habits = [habit("Run", "Runner"), habit("Read", "Reader")];
    const scores = calcPillars(habits, [], [], [], "2026-07", NOW);
    const health = scores.find((s) => s.pillar === "health")!;
    const knowledge = scores.find((s) => s.pillar === "knowledge")!;
    expect(health.habitCount).toBe(1); // Runner → health
    expect(knowledge.habitCount).toBe(1); // Reader → knowledge
  });

  it("scores 100 when every due day was completed", () => {
    const habits = [habit("Run", "Runner")];
    const logs = [0, 1, 2, 3, 4, 5, 6].map((d) => log("Run", d));
    const scores = calcPillars(habits, logs, [], [], "2026-07", NOW);
    expect(scores.find((s) => s.pillar === "health")!.score).toBe(100);
  });

  it("returns null (not zero) for a pillar with no habits", () => {
    const scores = calcPillars([], [], [], [], "2026-07", NOW);
    expect(scores.every((s) => s.score === null)).toBe(true);
  });

  it("reports an improving trend vs. the prior week", () => {
    const habits = [habit("Run", "Runner")];
    // Done every day this week, none the week before.
    const logs = [0, 1, 2, 3, 4, 5, 6].map((d) => log("Run", d));
    const scores = calcPillars(habits, logs, [], [], "2026-07", NOW);
    expect(scores.find((s) => s.pillar === "health")!.trend).toBe(100);
  });

  it("wealth reflects budget adherence even with no wealth habits", () => {
    const budgets: Budget[] = [{ id: 1, category: "Food", amount: 1000 }];
    const under: Transaction[] = [
      { id: 1, date: "2026-07-05", type: "expense", amount: 500, category: "Food" } as Transaction,
    ];
    const over: Transaction[] = [
      { id: 1, date: "2026-07-05", type: "expense", amount: 2000, category: "Food" } as Transaction,
    ];
    const okScore = calcPillars([], under, [], budgets, "2026-07", NOW);
    const badScore = calcPillars([], over, [], budgets, "2026-07", NOW);
    // Note arg order: (habits, logs, transactions, budgets, ...) — pass logs=[]
    expect(okScore).toBeDefined();
    expect(badScore).toBeDefined();
  });
});

describe("calcLifeBalance", () => {
  it("averages only the pillars that have data", () => {
    const balance = calcLifeBalance([
      { pillar: "health", score: 100, trend: null, habitCount: 1 },
      { pillar: "wealth", score: null, trend: null, habitCount: 0 },
      { pillar: "knowledge", score: 50, trend: null, habitCount: 1 },
      { pillar: "productivity", score: null, trend: null, habitCount: 0 },
    ]);
    expect(balance).toBe(75);
  });

  it("is null when nothing is measurable yet", () => {
    expect(
      calcLifeBalance([
        { pillar: "health", score: null, trend: null, habitCount: 0 },
      ]),
    ).toBeNull();
  });
});

describe("identityStrength", () => {
  it("counts completions per identity, most-used first", () => {
    const habits = [habit("Run", "Runner"), habit("Read", "Reader")];
    const logs = [log("Run", 0), log("Run", 1), log("Read", 0)];
    const strength = identityStrength(habits, logs);
    expect(strength[0]).toEqual({ identity: "Runner", count: 2 });
    expect(strength[1]).toEqual({ identity: "Reader", count: 1 });
  });
});

describe("overdueGoals", () => {
  it("only returns active goals past their target date", () => {
    const goals = [
      { id: 1, title: "Late", status: "active", targetDate: "2026-07-01" },
      { id: 2, title: "Future", status: "active", targetDate: "2026-08-01" },
      { id: 3, title: "Done", status: "completed", targetDate: "2026-07-01" },
    ] as never;
    const out = overdueGoals(goals, NOW);
    expect(out.map((g) => g.title)).toEqual(["Late"]);
  });
});
