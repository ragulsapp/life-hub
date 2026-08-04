/**
 * Health write-paths. Kept in one place because "how a metric is stored"
 * depends on its aggregation mode, and getting that wrong silently corrupts
 * charts (the old inline writes created a duplicate row per weigh-in, which
 * then rendered as several points on the same day).
 */
import {
  db,
  GLASS_ML,
  METRIC_AGGREGATION,
  type BodyProfile,
  type HealthMetricType,
} from "../../db/db";
import { localDateStr } from "../../lib/dates";

/**
 * Record a metric for a day.
 *
 * Additive metrics (water) append a row, so each glass is independently
 * undoable. Readings (weight, sleep, energy) upsert on `[date+metricType]`,
 * so logging twice corrects the day rather than duplicating it.
 */
export async function logMetric(
  metricType: HealthMetricType,
  value: number,
  date = localDateStr(),
  note?: string,
): Promise<void> {
  if (!Number.isFinite(value)) return;

  if (METRIC_AGGREGATION[metricType] === "sum") {
    await db.healthMetrics.add({ date, metricType, value, note } as never);
    return;
  }

  // Wrapped in a transaction so the read-then-decide-then-write is atomic.
  // Without this, two near-simultaneous calls for the same day (e.g. an
  // Enter-key submit racing a click) could both see "no existing row" and
  // both insert — leaving a duplicate pair where the next edit silently
  // updates the wrong (hidden) one. IndexedDB itself serializes overlapping
  // readwrite transactions on a store, so a second concurrent call now
  // genuinely waits for the first to commit before its own lookup runs.
  //
  // Self-healing, not just forward-fixing: this also repairs any duplicate
  // pair that already exists from BEFORE this fix shipped. `dailyValues()`
  // treats the highest-id row as canonical, so that's the one edited here —
  // and every other row for the same day is deleted in the same transaction,
  // so a user who hit the old bug is fixed the next time they log that day,
  // with no separate migration needed.
  await db.transaction("rw", db.healthMetrics, async () => {
    const rows = await db.healthMetrics
      .where("[date+metricType]")
      .equals([date, metricType])
      .toArray();
    if (rows.length === 0) {
      await db.healthMetrics.add({ date, metricType, value, note } as never);
      return;
    }
    const canonical = rows.reduce((a, b) => (b.id > a.id ? b : a));
    const staleIds = rows.filter((r) => r.id !== canonical.id).map((r) => r.id);
    if (staleIds.length > 0) await db.healthMetrics.bulkDelete(staleIds);
    await db.healthMetrics.update(canonical.id, { value, note });
  });
}

/** Add one glass of water to today. */
export async function addGlass(date = localDateStr()): Promise<void> {
  await logMetric("water-ml", GLASS_ML, date);
}

/** Remove the most recent water row for a day — the undo for `addGlass`. */
export async function removeLastGlass(date = localDateStr()): Promise<void> {
  const rows = await db.healthMetrics
    .where("[date+metricType]")
    .equals([date, "water-ml"])
    .toArray();
  const last = rows.sort((a, b) => a.id - b.id).at(-1);
  if (last) await db.healthMetrics.delete(last.id);
}

/**
 * Set a day's water total to an exact value — for tap-to-edit correction,
 * where the user means "this many ml total," not "add this many." Deletes
 * every water-ml row for the day and inserts one row holding the corrected
 * total, wrapped in the same read+delete+write transaction pattern as the
 * A1 fix so a concurrent `addGlass` can't race the edit into a lost update.
 */
export async function setTodayWaterTotal(
  ml: number,
  date = localDateStr(),
): Promise<void> {
  if (!Number.isFinite(ml) || ml < 0) return;
  await db.transaction("rw", db.healthMetrics, async () => {
    const rows = await db.healthMetrics
      .where("[date+metricType]")
      .equals([date, "water-ml"])
      .toArray();
    if (rows.length > 0) await db.healthMetrics.bulkDelete(rows.map((r) => r.id));
    if (ml > 0) {
      await db.healthMetrics.add({ date, metricType: "water-ml", value: ml } as never);
    }
  });
}

/**
 * Patch the body profile. Read-modify-write because Dexie's `update` would
 * replace the whole nested object, silently dropping the other fields.
 */
export async function saveBodyProfile(
  patch: Partial<BodyProfile>,
): Promise<void> {
  const settings = await db.appSettings.get(1);
  await db.appSettings.update(1, {
    bodyProfile: { ...settings?.bodyProfile, ...patch },
  });
}

export async function setFastingEnabled(enabled: boolean): Promise<void> {
  await db.appSettings.update(1, { fastingEnabled: enabled });
}
