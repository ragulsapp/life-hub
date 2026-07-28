import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Budget, Habit, HabitLog, Transaction } from "../src/db/db";
import {
  dailyCoachMessage,
  greeting,
  statsForDay,
} from "../src/lib/coachMessages";
import { localDateStr } from "../src/lib/dates";

const NOW = new Date(2026, 6, 14, 8, 0); // Tuesday morning
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
    archived: false,
    createdAt: created.getTime(),
  } as Habit;
};

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

describe("greeting", () => {
  it("changes with the time of day", () => {
    expect(greeting(new Date(2026, 6, 14, 8))).toBe("Good morning");
    expect(greeting(new Date(2026, 6, 14, 14))).toBe("Good afternoon");
    expect(greeting(new Date(2026, 6, 14, 20))).toBe("Good evening");
  });
});

describe("statsForDay", () => {
  it("counts only habits actually due that day", () => {
    const weekdayOnly = {
      ...habit("Work"),
      schedule: { type: "weekdays", days: [1, 2, 3, 4, 5] },
    } as Habit;
    const sunday = new Date(2026, 6, 12); // a Sunday
    expect(statsForDay([weekdayOnly], [], sunday).due).toBe(0);
    expect(statsForDay([weekdayOnly], [], NOW).due).toBe(1);
  });
});

describe("dailyCoachMessage", () => {
  const habits = [habit("Run"), habit("Read")];

  it("praises a strong yesterday", () => {
    const logs = [log("Run", 1), log("Read", 1)];
    const msg = dailyCoachMessage(habits, logs, [], [], MONTH, NOW);
    expect(msg).toMatch(/Yesterday was strong/);
  });

  it("is encouraging, never scolding, after a bad day", () => {
    const logs = [log("Run", 1, false), log("Read", 1, false)];
    const msg = dailyCoachMessage(habits, logs, [], [], MONTH, NOW);
    expect(msg).toMatch(/clean slate/i);
    expect(msg).not.toMatch(/failed|lazy|bad job/i);
  });

  it("greets a brand-new user with a fresh start, not a bad-day message", () => {
    // Habits created today — yesterday shouldn't be judged at all.
    const brandNew = [habit("Run", 0), habit("Read", 0)];
    const msg = dailyCoachMessage(brandNew, [], [], [], MONTH, NOW);
    expect(msg).toMatch(/Fresh start/i);
    expect(msg).not.toMatch(/got away from you/i);
  });

  it("says how many habits remain today", () => {
    const logs = [log("Run", 0)]; // one of two done today
    const msg = dailyCoachMessage(habits, logs, [], [], MONTH, NOW);
    expect(msg).toMatch(/1 habit due today/);
  });

  it("includes a safe-to-spend figure when budgets exist", () => {
    const budgets: Budget[] = [{ id: 1, category: "Food", amount: 3100 }];
    const txns: Transaction[] = [
      { id: 1, date: "2026-07-01", type: "expense", amount: 100, category: "Food" } as Transaction,
    ];
    const msg = dailyCoachMessage(habits, [], txns, budgets, MONTH, NOW);
    expect(msg).toMatch(/safe to spend today/);
  });

  it("stays short — at most a few sentences", () => {
    const logs = [log("Run", 1), log("Read", 1)];
    const msg = dailyCoachMessage(habits, logs, [], [], MONTH, NOW);
    expect(msg.split(".").filter(Boolean).length).toBeLessThanOrEqual(4);
  });
});
