import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { HabitLog } from "../src/db/db";
import {
  calcBestStreak,
  calcCompletionRate,
  calcHeatmap,
  calcRecentDays,
  calcStreak,
  calcWeekCompletions,
  isDueOn,
  scheduleLabel,
} from "../src/modules/habits/habitStreaks";

// Fixed "today": Tuesday 2026-07-14, 10:00 local.
const TODAY = new Date(2026, 6, 14, 10, 0);

const log = (date: string, completed = true, habitName = "Read"): HabitLog =>
  ({ id: 0, date, habitName, completed }) as HabitLog;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(TODAY);
});
afterEach(() => vi.useRealTimers());

describe("calcStreak", () => {
  it("counts consecutive completed days ending today", () => {
    const logs = [log("2026-07-14"), log("2026-07-13"), log("2026-07-12")];
    expect(calcStreak(logs, "Read")).toBe(3);
  });

  it("is zero when today is not completed", () => {
    const logs = [log("2026-07-13"), log("2026-07-12")];
    expect(calcStreak(logs, "Read")).toBe(0);
  });

  it("stops at a gap", () => {
    const logs = [log("2026-07-14"), log("2026-07-12")];
    expect(calcStreak(logs, "Read")).toBe(1);
  });

  it("ignores other habits and incomplete rows", () => {
    const logs = [
      log("2026-07-14", true, "Other"),
      log("2026-07-14", false, "Read"),
    ];
    expect(calcStreak(logs, "Read")).toBe(0);
  });
});

describe("calcBestStreak", () => {
  it("finds the longest historical run", () => {
    const logs = [
      log("2026-07-01"),
      log("2026-07-02"),
      log("2026-07-03"),
      log("2026-07-10"),
      log("2026-07-11"),
    ];
    expect(calcBestStreak(logs, "Read")).toBe(3);
  });

  it("is zero with no completions", () => {
    expect(calcBestStreak([log("2026-07-14", false)], "Read")).toBe(0);
  });
});

describe("calcCompletionRate", () => {
  it("computes percent over the window", () => {
    // 3 of the last 30 days completed
    const logs = [log("2026-07-14"), log("2026-07-13"), log("2026-07-01")];
    expect(calcCompletionRate(logs, "Read", 30)).toBe(10);
  });
});

describe("calcRecentDays", () => {
  it("returns the last 7 local days, oldest first, today flagged", () => {
    const days = calcRecentDays([log("2026-07-14")], "Read", 7);
    expect(days).toHaveLength(7);
    expect(days[0].date).toBe("2026-07-08");
    expect(days[6].date).toBe("2026-07-14");
    expect(days[6].isToday).toBe(true);
    expect(days[6].completed).toBe(true);
  });
});

describe("calcHeatmap", () => {
  it("produces N weeks of Mon–Sun columns ending with the current week", () => {
    const cols = calcHeatmap([], "Read", 12);
    expect(cols).toHaveLength(12);
    for (const col of cols) expect(col).toHaveLength(7);
    // Current week's Monday for Tue 2026-07-14 is 2026-07-13.
    const lastCol = cols[11];
    expect(lastCol[0].date).toBe("2026-07-13");
    expect(lastCol[1].date).toBe("2026-07-14");
    expect(lastCol[2].inFuture).toBe(true); // Wednesday onward
  });
});

describe("calcWeekCompletions", () => {
  it("counts completions in the current Mon–Sun week only", () => {
    const logs = [
      log("2026-07-13"), // Monday this week
      log("2026-07-14"), // today
      log("2026-07-12"), // Sunday LAST week
    ];
    expect(calcWeekCompletions(logs, "Read")).toBe(2);
  });
});

describe("schedules", () => {
  it("isDueOn respects weekday schedules (Tue=2)", () => {
    expect(isDueOn({ type: "weekdays", days: [2] }, TODAY)).toBe(true);
    expect(isDueOn({ type: "weekdays", days: [0, 6] }, TODAY)).toBe(false);
    expect(isDueOn({ type: "daily" }, TODAY)).toBe(true);
    expect(isDueOn({ type: "times-per-week", target: 3 }, TODAY)).toBe(true);
  });

  it("scheduleLabel names common patterns", () => {
    expect(scheduleLabel({ type: "daily" })).toBe("Every day");
    expect(scheduleLabel({ type: "weekdays", days: [1, 2, 3, 4, 5] })).toBe(
      "Weekdays",
    );
    expect(scheduleLabel({ type: "weekdays", days: [0, 6] })).toBe("Weekends");
    expect(scheduleLabel({ type: "times-per-week", target: 3 })).toBe(
      "3× / week",
    );
  });
});
