/**
 * Local calendar/time helpers — the ONLY place date strings are generated.
 *
 * Never use `toISOString()` for calendar dates: it returns UTC, so in any
 * timezone ahead of UTC (e.g. IST, +5:30) "today" would be wrong between
 * local midnight and the UTC offset. (Audit finding C1.)
 */

const pad = (n: number) => String(n).padStart(2, "0");

/** Local calendar date as YYYY-MM-DD. */
export function localDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local wall-clock time as HH:MM (24h). */
export function localTimeStr(d: Date = new Date()): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Local month key as YYYY-MM. */
export function localMonthKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
