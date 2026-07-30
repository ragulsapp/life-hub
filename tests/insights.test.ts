import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Goal, Habit, HabitLog, HealthMetric, Task, Transaction } from "../src/db/db";
import {
  MIN_SAMPLE_DAYS,
  completionOver,
  findCorrelations,
  strugglingHabits,
  weeklyReview,
  windowDates,
} from "../src/lib/insights";
import { localDateStr } from "../src/lib/dates";

// Fixed "today": Friday 2026-07-31, 10:00 local.
const NOW = new Date(2026, 6, 31, 10, 0);

const habit = (name: string): Habit =>
  ({
    id: 0,
    name,
    color: "#fff",
    icon: "x",
    schedule: { type: "daily" },
    category: "Healthy Person",
    archived: false,
    createdAt: 0,
  }) as Habit;

const dayAgo = (n: number) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  return localDateStr(d);
};

const log = (name: string, daysAgo: number, completed = true): HabitLog =>
  ({ id: 0, date: dayAgo(daysAgo), habitName: name, completed }) as HabitLog;

const metric = (
  daysAgo: number,
  metricType: HealthMetric["metricType"],
  value: number,
): HealthMetric =>
  ({ id: daysAgo + 1, date: dayAgo(daysAgo), metricType, value }) as HealthMetric;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

describe("windowDates", () => {
  it("returns the requested span, newest first", () => {
    const w = windowDates(0, 3, NOW);
    expect(w).toEqual([dayAgo(0), dayAgo(1), dayAgo(2)]);
  });
});

describe("completionOver", () => {
  it("counts completed over due", () => {
    const habits = [habit("Run")];
    const logs = [log("Run", 0), log("Run", 1), log("Run", 2, false)];
    const r = completionOver(habits, logs, [dayAgo(0), dayAgo(1), dayAgo(2)]);
    expect(r).toEqual({ rate: 67, due: 3, done: 2 });
  });

  it("returns null rather than 0 when nothing was due", () => {
    expect(completionOver([], [], [dayAgo(0)]).rate).toBeNull();
  });

  it("ignores days before the habit existed, so day one isn't a 0%", () => {
    const h = { ...habit("Run"), createdAt: NOW.getTime() } as Habit;
    const r = completionOver([h], [], [dayAgo(0), dayAgo(5)]);
    expect(r.due).toBe(1); // only today counts
  });
});

describe("weeklyReview", () => {
  const empty = { tx: [] as Transaction[], tasks: [] as Task[], goals: [] as Goal[] };

  it("leads with improvement when habits went up", () => {
    const habits = [habit("Run")];
    // Perfect this week, nothing last week.
    const logs = [0, 1, 2, 3, 4, 5, 6].map((d) => log("Run", d));
    const r = weeklyReview(habits, logs, empty.tx, empty.tasks, empty.goals, NOW);
    expect(r.habitRate).toBe(100);
    expect(r.habitDelta).toBe(100);
    expect(r.strength).toMatch(/up 100 points|100%/);
  });

  it("suggests shrinking the plan on a bad week, and never scolds", () => {
    const habits = [habit("Run")];
    const logs = [0, 1, 2, 3, 4, 5, 6].map((d) => log("Run", d, false));
    const r = weeklyReview(habits, logs, empty.tx, empty.tasks, empty.goals, NOW);
    expect(r.habitRate).toBe(0);
    expect(r.suggestion).toMatch(/one habit a day/);
    // Tone check: no blame language anywhere in the output.
    const all = `${r.strength} ${r.challenge} ${r.suggestion}`.toLowerCase();
    for (const bad of ["fail", "lazy", "should have", "bad", "poor"]) {
      expect(all).not.toContain(bad);
    }
  });

  it("credits completed goals ahead of habit stats", () => {
    const goals = [
      { id: 1, title: "Ship it", status: "completed", completedAt: NOW.getTime() - 86400000 },
    ] as Goal[];
    const r = weeklyReview([], [], empty.tx, empty.tasks, goals, NOW);
    expect(r.strength).toMatch(/completed 1 goal/);
  });

  it("ignores goals completed before this week", () => {
    const goals = [
      { id: 1, title: "Old", status: "completed", completedAt: NOW.getTime() - 30 * 86400000 },
    ] as Goal[];
    const r = weeklyReview([], [], empty.tx, empty.tasks, goals, NOW);
    expect(r.strength).not.toMatch(/completed 1 goal/);
  });
});

describe("findCorrelations", () => {
  const habits = [habit("Run")];

  /** n good-sleep days with the habit done, n bad-sleep days with it missed. */
  const build = (n: number) => {
    const logs: HabitLog[] = [];
    const metrics: HealthMetric[] = [];
    for (let i = 0; i < n; i++) {
      metrics.push(metric(i, "sleep-hours", 8));
      logs.push(log("Run", i, true));
    }
    for (let i = n; i < n * 2; i++) {
      metrics.push(metric(i, "sleep-hours", 5));
      logs.push(log("Run", i, false));
    }
    return { logs, metrics };
  };

  it("reports a strong, well-sampled pattern", () => {
    const { logs, metrics } = build(MIN_SAMPLE_DAYS + 2);
    const out = findCorrelations(habits, logs, metrics, { sleepTargetHours: 7 }, 30, NOW);
    expect(out).toHaveLength(1);
    expect(out[0].text).toMatch(/full night's sleep/);
    expect(out[0].sample).toBeGreaterThanOrEqual(MIN_SAMPLE_DAYS);
  });

  it("stays SILENT below the minimum sample — the whole point of the guard", () => {
    const { logs, metrics } = build(MIN_SAMPLE_DAYS - 2);
    const out = findCorrelations(habits, logs, metrics, { sleepTargetHours: 7 }, 30, NOW);
    expect(out).toEqual([]);
  });

  it("stays silent when the gap is real but tiny", () => {
    const logs: HabitLog[] = [];
    const metrics: HealthMetric[] = [];
    for (let i = 0; i < 8; i++) {
      metrics.push(metric(i, "sleep-hours", 8));
      logs.push(log("Run", i, i < 7)); // ~88%
    }
    for (let i = 8; i < 16; i++) {
      metrics.push(metric(i, "sleep-hours", 5));
      logs.push(log("Run", i, i < 14)); // ~75% — only a 13pt gap
    }
    const out = findCorrelations(habits, logs, metrics, { sleepTargetHours: 7 }, 30, NOW);
    expect(out).toEqual([]);
  });

  it("says nothing when there is no target to compare against", () => {
    const { logs, metrics } = build(10);
    expect(
      findCorrelations(habits, logs, metrics, { sleepTargetHours: null }, 30, NOW),
    ).toEqual([]);
  });
});

describe("strugglingHabits", () => {
  it("finds habits missed several times in a row", () => {
    const habits = [habit("Run")];
    const logs = [1, 2, 3, 4].map((d) => log("Run", d, false));
    const out = strugglingHabits(habits, logs, 3, NOW);
    expect(out).toHaveLength(1);
    expect(out[0].missedInARow).toBeGreaterThanOrEqual(3);
  });

  it("stops counting at the most recent completion", () => {
    const habits = [habit("Run")];
    // Missed 1 and 2 days ago, but done 3 days ago -> only 2 in a row.
    const logs = [log("Run", 1, false), log("Run", 2, false), log("Run", 3, true)];
    expect(strugglingHabits(habits, logs, 3, NOW)).toEqual([]);
  });

  it("ignores archived habits", () => {
    const habits = [{ ...habit("Run"), archived: true } as Habit];
    const logs = [1, 2, 3, 4].map((d) => log("Run", d, false));
    expect(strugglingHabits(habits, logs, 3, NOW)).toEqual([]);
  });
});
