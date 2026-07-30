import { describe, it, expect } from "vitest";
import type { HealthMetric, HealthMetricType } from "../src/db/db";
import {
  dailyValues,
  latestValue,
  targetAdherence,
  valueOn,
} from "../src/lib/healthMetrics";

let nextId = 1;
const m = (
  date: string,
  metricType: HealthMetricType,
  value: number,
): HealthMetric => ({ id: nextId++, date, metricType, value }) as HealthMetric;

describe("dailyValues", () => {
  it("sums same-day rows for additive metrics (water)", () => {
    const rows = [
      m("2026-07-01", "water-ml", 250),
      m("2026-07-01", "water-ml", 250),
      m("2026-07-01", "water-ml", 250),
      m("2026-07-01", "water-ml", 250),
    ];
    // Four glasses is ONE day at 1000ml, not four chart points.
    expect(dailyValues(rows, "water-ml")).toEqual([
      { date: "2026-07-01", value: 1000 },
    ]);
  });

  it("takes the latest row for readings (weight)", () => {
    const rows = [m("2026-07-01", "weight", 70), m("2026-07-01", "weight", 71)];
    expect(dailyValues(rows, "weight")).toEqual([
      { date: "2026-07-01", value: 71 },
    ]);
  });

  it("uses row id, not array order, to decide which reading is latest", () => {
    const first = m("2026-07-01", "weight", 70);
    const second = m("2026-07-01", "weight", 71);
    // Deliberately reversed — a caller's array order must not change the result.
    expect(dailyValues([second, first], "weight")).toEqual([
      { date: "2026-07-01", value: 71 },
    ]);
  });

  it("ignores other metric types", () => {
    const rows = [
      m("2026-07-01", "weight", 70),
      m("2026-07-01", "water-ml", 500),
    ];
    expect(dailyValues(rows, "weight")).toEqual([
      { date: "2026-07-01", value: 70 },
    ]);
  });

  it("returns days oldest-first regardless of input order", () => {
    const rows = [
      m("2026-07-03", "weight", 72),
      m("2026-07-01", "weight", 70),
      m("2026-07-02", "weight", 71),
    ];
    expect(dailyValues(rows, "weight").map((d) => d.date)).toEqual([
      "2026-07-01",
      "2026-07-02",
      "2026-07-03",
    ]);
  });

  it("is empty when nothing is logged", () => {
    expect(dailyValues([], "weight")).toEqual([]);
  });
});

describe("valueOn", () => {
  it("returns the aggregated value for a specific day", () => {
    const rows = [
      m("2026-07-01", "water-ml", 250),
      m("2026-07-01", "water-ml", 500),
    ];
    expect(valueOn(rows, "water-ml", "2026-07-01")).toBe(750);
  });

  it("returns null for a day with nothing logged", () => {
    expect(valueOn([], "water-ml", "2026-07-01")).toBeNull();
  });
});

describe("latestValue", () => {
  it("returns the most recent day's value", () => {
    const rows = [m("2026-07-01", "weight", 70), m("2026-07-05", "weight", 68)];
    expect(latestValue(rows, "weight")).toBe(68);
  });

  it("returns null with no data", () => {
    expect(latestValue([], "weight")).toBeNull();
  });
});

describe("targetAdherence", () => {
  const dates = ["2026-07-03", "2026-07-02", "2026-07-01"];

  it("is the share of days that met the target", () => {
    const rows = [
      m("2026-07-01", "water-ml", 2000),
      m("2026-07-02", "water-ml", 2000),
      m("2026-07-03", "water-ml", 500),
    ];
    expect(targetAdherence(rows, "water-ml", 2000, 3, dates)).toBe(67);
  });

  it("counts unlogged days in the window as misses", () => {
    const rows = [m("2026-07-01", "water-ml", 2000)];
    expect(targetAdherence(rows, "water-ml", 2000, 3, dates)).toBe(33);
  });

  it("returns null when the metric has never been logged", () => {
    // Critical: this is what stops the Health pillar flipping from null to a
    // number — and silently moving Life Balance — for users who never log.
    expect(targetAdherence([], "water-ml", 2000, 3, dates)).toBeNull();
  });

  it("returns null for a nonsense target", () => {
    const rows = [m("2026-07-01", "water-ml", 2000)];
    expect(targetAdherence(rows, "water-ml", 0, 3, dates)).toBeNull();
  });
});
