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

  const existing = await db.healthMetrics
    .where("[date+metricType]")
    .equals([date, metricType])
    .first();
  if (existing) {
    await db.healthMetrics.update(existing.id, { value, note });
  } else {
    await db.healthMetrics.add({ date, metricType, value, note } as never);
  }
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
