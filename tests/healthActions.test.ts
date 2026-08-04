// fake-indexeddb must load before Dexie touches indexedDB.
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../src/db/db";
import { logMetric, setTodayWaterTotal } from "../src/modules/health/healthActions";

beforeEach(async () => {
  await db.healthMetrics.clear();
});

describe("logMetric — the A1 race fix", () => {
  it("two concurrent calls for the same day never produce two rows", async () => {
    // Fired without awaiting either individually — this is exactly the
    // check-then-act race: both used to see "no existing row" and both
    // insert. Wrapping the upsert in a Dexie transaction closes the window.
    await Promise.all([
      logMetric("weight", 70, "2026-08-01"),
      logMetric("weight", 71, "2026-08-01"),
    ]);
    const rows = await db.healthMetrics
      .where("[date+metricType]")
      .equals(["2026-08-01", "weight"])
      .toArray();
    expect(rows).toHaveLength(1);
  });

  it("stays a single row across many concurrent writes, not just two", async () => {
    await Promise.all(
      Array.from({ length: 10 }, (_, i) => logMetric("weight", 70 + i, "2026-08-02")),
    );
    const rows = await db.healthMetrics
      .where("[date+metricType]")
      .equals(["2026-08-02", "weight"])
      .toArray();
    expect(rows).toHaveLength(1);
  });

  it("self-heals a pre-existing duplicate pair (from before this fix) on the next edit", async () => {
    // Simulate the exact failure mode: force a duplicate pair the old race
    // could have produced, then confirm a later edit both corrects the
    // canonical (highest-id) row AND deletes the stale one — not just masks
    // it. A user who hit the old bug is fixed the next time they log that
    // day, with no separate migration needed.
    await db.healthMetrics.add({
      date: "2026-08-03", metricType: "weight", value: 70,
    } as never);
    await db.healthMetrics.add({
      date: "2026-08-03", metricType: "weight", value: 71,
    } as never);
    await logMetric("weight", 72, "2026-08-03");

    const rows = await db.healthMetrics
      .where("[date+metricType]")
      .equals(["2026-08-03", "weight"])
      .toArray();
    expect(rows).toHaveLength(1); // the stale duplicate is gone, not just outranked
    expect(rows[0].value).toBe(72);
  });

  it("sum-mode metrics (water) still create one row per call — unaffected by the fix", async () => {
    await Promise.all([
      logMetric("water-ml", 250, "2026-08-04"),
      logMetric("water-ml", 250, "2026-08-04"),
    ]);
    const rows = await db.healthMetrics
      .where("[date+metricType]")
      .equals(["2026-08-04", "water-ml"])
      .toArray();
    expect(rows).toHaveLength(2);
  });
});

describe("setTodayWaterTotal", () => {
  it("collapses several glass rows into one row holding the exact total", async () => {
    await logMetric("water-ml", 250, "2026-08-05");
    await logMetric("water-ml", 250, "2026-08-05");
    await logMetric("water-ml", 250, "2026-08-05");
    await setTodayWaterTotal(1000, "2026-08-05");

    const rows = await db.healthMetrics
      .where("[date+metricType]")
      .equals(["2026-08-05", "water-ml"])
      .toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].value).toBe(1000);
  });

  it("setting to 0 clears the day rather than leaving a zero row", async () => {
    await logMetric("water-ml", 500, "2026-08-06");
    await setTodayWaterTotal(0, "2026-08-06");

    const rows = await db.healthMetrics
      .where("[date+metricType]")
      .equals(["2026-08-06", "water-ml"])
      .toArray();
    expect(rows).toHaveLength(0);
  });

  it("ignores negative or non-finite input, leaving existing rows untouched", async () => {
    await logMetric("water-ml", 500, "2026-08-07");
    await setTodayWaterTotal(-1, "2026-08-07");
    await setTodayWaterTotal(NaN, "2026-08-07");

    const rows = await db.healthMetrics
      .where("[date+metricType]")
      .equals(["2026-08-07", "water-ml"])
      .toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].value).toBe(500);
  });

  it("works on a day with no prior rows", async () => {
    await setTodayWaterTotal(750, "2026-08-08");
    const rows = await db.healthMetrics
      .where("[date+metricType]")
      .equals(["2026-08-08", "water-ml"])
      .toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].value).toBe(750);
  });
});
