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

/** Tomorrow's local calendar date as YYYY-MM-DD. Built from the date
 *  components (not `+ 86400000`ms) so month/year rollovers are exact. */
export function tomorrowStr(now: Date = new Date()): string {
  return localDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
}

/** `dateStr` (YYYY-MM-DD) shifted by `days` (may be negative), built from
 *  date components so month/year rollovers are exact. */
export function addDaysStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return localDateStr(new Date(y, m - 1, d + days));
}

/** Most recent Sunday on/before `now`, as YYYY-MM-DD — the app's week start. */
export function startOfWeekStr(now: Date = new Date()): string {
  return localDateStr(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()),
  );
}
