import { describe, it, expect } from "vitest";
import type { WakeLog } from "../src/db/db";
import {
  calcBestWakeStreak,
  calcWakeStreak,
  isOnTime,
  minutesAfterScheduled,
  onTimeRate,
  wakeLine,
} from "../src/lib/wakeStreak";
import { localDateStr } from "../src/lib/dates";

// Fixed "today": Tuesday 2026-07-14, 08:00 local.
const NOW = new Date(2026, 6, 14, 8, 0);

let nextId = 1;
const wake = (daysAgo: number, minutesLate = 0): WakeLog => {
  const d = new Date(NOW);
  d.setDate(d.getDate() - daysAgo);
  return {
    id: nextId++,
    date: localDateStr(d),
    solvedAt: d.getTime(),
    scheduledTime: "06:00",
    minutesLate,
  } as WakeLog;
};

describe("calcWakeStreak", () => {
  it("is zero with no wakes", () => {
    expect(calcWakeStreak([], NOW)).toBe(0);
  });

  it("counts consecutive days ending today", () => {
    const logs = [wake(0), wake(1), wake(2)];
    expect(calcWakeStreak(logs, NOW)).toBe(3);
  });

  it("still counts the run when today's alarm hasn't gone off yet", () => {
    // An unfinished morning must not read as a broken streak.
    const logs = [wake(1), wake(2), wake(3)];
    expect(calcWakeStreak(logs, NOW)).toBe(3);
  });

  it("stops at the first missed day", () => {
    const logs = [wake(0), wake(1), wake(3), wake(4)];
    expect(calcWakeStreak(logs, NOW)).toBe(2);
  });

  it("is zero once two days have been missed", () => {
    const logs = [wake(2), wake(3)];
    expect(calcWakeStreak(logs, NOW)).toBe(0);
  });

  it("does not care about input order", () => {
    const logs = [wake(2), wake(0), wake(1)];
    expect(calcWakeStreak(logs, NOW)).toBe(3);
  });
});

describe("calcBestWakeStreak", () => {
  it("is zero with no wakes", () => {
    expect(calcBestWakeStreak([])).toBe(0);
  });

  it("finds the longest historical run, not the current one", () => {
    // 4-day run ending 10 days ago, 2-day run ending today.
    const logs = [
      wake(13), wake(12), wake(11), wake(10),
      wake(1), wake(0),
    ];
    expect(calcBestWakeStreak(logs)).toBe(4);
  });

  it("counts a single wake as a streak of one", () => {
    expect(calcBestWakeStreak([wake(5)])).toBe(1);
  });
});

describe("onTimeRate", () => {
  it("is null with nothing logged", () => {
    expect(onTimeRate([])).toBeNull();
  });

  it("is the share of wakes inside the grace window", () => {
    const logs = [wake(0, 2), wake(1, 5), wake(2, 90), wake(3, 60)];
    expect(onTimeRate(logs)).toBe(50);
  });

  it("treats exactly-at-the-grace-limit as on time", () => {
    expect(isOnTime(15)).toBe(true);
    expect(isOnTime(16)).toBe(false);
  });
});

describe("minutesAfterScheduled", () => {
  it("measures the gap from the scheduled time", () => {
    const solved = new Date(2026, 6, 14, 6, 20).getTime();
    expect(minutesAfterScheduled("06:00", solved)).toBe(20);
  });

  it("never returns a negative for an early/preview dismissal", () => {
    const solved = new Date(2026, 6, 14, 5, 30).getTime();
    expect(minutesAfterScheduled("06:00", solved)).toBe(0);
  });

  it("attributes a just-after-midnight solve to the previous evening's alarm", () => {
    // Alarm set for 23:30, cleared at 00:10 — 40 minutes late, not 23h early.
    const solved = new Date(2026, 6, 14, 0, 10).getTime();
    expect(minutesAfterScheduled("23:30", solved)).toBe(40);
  });

  it("returns 0 for a malformed time rather than NaN", () => {
    expect(minutesAfterScheduled("", Date.now())).toBe(0);
  });
});

describe("wakeLine", () => {
  it("never scolds a late wake — it credits getting up", () => {
    const line = wakeLine(5, 40);
    expect(line).toContain("5 mornings in a row");
    expect(line).toContain("still got up");
  });

  it("celebrates an on-time streak", () => {
    expect(wakeLine(9, 3)).toBe(
      "9 mornings in a row. You're becoming someone who gets up.",
    );
  });

  it("handles day one", () => {
    expect(wakeLine(1, 2)).toContain("day one");
    expect(wakeLine(1, 90)).toContain("that's what counts");
  });
});
