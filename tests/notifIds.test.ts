import { describe, expect, it } from "vitest";
import {
  alarmNotifId,
  habitNotifId,
  noteNotifId,
  NIGHT_REMINDER_NOTIF_ID,
  taskNotifId,
} from "../src/lib/notify";

/**
 * Notification ids are the only thing stopping one feature's reminder from
 * cancelling another's: `scheduleDailyReminder` cancels by id before it
 * writes, so a collision means feature A silently deletes feature B's alarm
 * from the OS. Nothing in the app would report that — the reminder would just
 * stop arriving, which is precisely the class of bug this guards.
 *
 * Alarms made the risk real by needing a BLOCK of eight ids each (one per
 * weekday, plus a daily slot) rather than a single id.
 */
describe("notification id allocation", () => {
  const ids = (n: number) => [
    ...Array.from({ length: n }, (_, i) => habitNotifId(i + 1)),
    ...Array.from({ length: n }, (_, i) => taskNotifId(i + 1)),
    ...Array.from({ length: n }, (_, i) => noteNotifId(i + 1)),
    ...Array.from({ length: n }, (_, i) =>
      Array.from({ length: 8 }, (_, s) => alarmNotifId(i + 1, s)),
    ).flat(),
    NIGHT_REMINDER_NOTIF_ID,
  ];

  it("never collides across features for a realistic number of rows", () => {
    const all = ids(1000);
    expect(new Set(all).size).toBe(all.length);
  });

  it("gives each alarm eight distinct slots", () => {
    const slots = Array.from({ length: 8 }, (_, s) => alarmNotifId(42, s));
    expect(new Set(slots).size).toBe(8);
  });

  it("keeps one alarm's block clear of the next alarm's", () => {
    const a = Array.from({ length: 8 }, (_, s) => alarmNotifId(7, s));
    const b = Array.from({ length: 8 }, (_, s) => alarmNotifId(8, s));
    expect(a.some((x) => b.includes(x))).toBe(false);
  });
});
