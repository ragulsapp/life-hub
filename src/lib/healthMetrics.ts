/**
 * The single place same-day health rows collapse into one value per day.
 *
 * Water accumulates (each glass is its own row, so the day is their sum);
 * everything else is a reading where the latest wins. Every consumer — charts,
 * the "today" cards, goal progress, pillar scoring — must route through
 * `dailyValues` so they can never disagree about what a day's number is.
 */
import { METRIC_AGGREGATION, type HealthMetric, type HealthMetricType } from "../db/db";

export interface DailyValue {
  date: string; // YYYY-MM-DD
  value: number;
}

/**
 * One point per day for a metric, oldest first.
 *
 * Note on sleep: a night spans two dates, and this app attributes it to **the
 * date you woke up**. Fixed here so adherence math is never ambiguous.
 */
export function dailyValues(
  metrics: HealthMetric[],
  type: HealthMetricType,
): DailyValue[] {
  const mode = METRIC_AGGREGATION[type];
  const byDate = new Map<string, { value: number; rowId: number }>();

  for (const m of metrics) {
    if (m.metricType !== type) continue;
    const existing = byDate.get(m.date);
    if (!existing) {
      byDate.set(m.date, { value: m.value, rowId: m.id });
      continue;
    }
    if (mode === "sum") {
      existing.value += m.value;
    } else if (m.id >= existing.rowId) {
      // "latest" means most recently written, i.e. highest row id — not
      // whatever order the caller's array happened to arrive in.
      existing.value = m.value;
      existing.rowId = m.id;
    }
  }

  return [...byDate.entries()]
    .map(([date, v]) => ({ date, value: v.value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Today's total (or latest) for a metric, or null if nothing is logged. */
export function valueOn(
  metrics: HealthMetric[],
  type: HealthMetricType,
  date: string,
): number | null {
  const hit = dailyValues(metrics, type).find((d) => d.date === date);
  return hit ? hit.value : null;
}

/** The most recent logged value for a metric, or null. */
export function latestValue(
  metrics: HealthMetric[],
  type: HealthMetricType,
): number | null {
  const series = dailyValues(metrics, type);
  return series.length ? series[series.length - 1].value : null;
}

/**
 * Share of the last `days` days that met a daily target, 0-100.
 * Days with nothing logged count as misses only if the user has logged this
 * metric at least once — otherwise there's nothing to be accountable to yet.
 */
export function targetAdherence(
  metrics: HealthMetric[],
  type: HealthMetricType,
  target: number,
  days: number,
  recentDates: string[],
): number | null {
  const series = dailyValues(metrics, type);
  if (series.length === 0 || !(target > 0)) return null;
  const byDate = new Map(series.map((d) => [d.date, d.value]));
  const window = recentDates.slice(0, days);
  if (window.length === 0) return null;
  const met = window.filter((d) => (byDate.get(d) ?? 0) >= target).length;
  return Math.round((met / window.length) * 100);
}
