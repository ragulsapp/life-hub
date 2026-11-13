import { describe, expect, it } from "vitest";
import { isDueToday, nextDueAt } from "../src/modules/finance/recurringDue";

/**
 * When the "payment due" alert for a recurring transaction should fire.
 *
 * The rule: always exactly one alert ahead, at 09:00 on the due day. If this
 * month is unconfirmed and its due day is still ahead, that is the alert.
 * Otherwise — confirmed already, or already past and sitting in the pending
 * list, which is the real backstop — the alert moves to next month.
 */
const r = (over: Partial<{ dayOfMonth: number; active: boolean; generatedMonth: string }> = {}) => ({
  dayOfMonth: 15,
  active: true,
  ...over,
});
const at = (y: number, m: number, d: number, h = 9, min = 0) =>
  new Date(y, m - 1, d, h, min);

describe("nextDueAt", () => {
  it("is this month's due day when it is still ahead", () => {
    expect(nextDueAt(r(), at(2026, 11, 10, 20))).toEqual(at(2026, 11, 15));
  });

  it("moves to next month once this month is confirmed, even before the due day", () => {
    expect(
      nextDueAt(r({ generatedMonth: "2026-11" }), at(2026, 11, 10)),
    ).toEqual(at(2026, 12, 15));
  });

  it("moves to next month once this month's due moment has passed", () => {
    expect(nextDueAt(r(), at(2026, 11, 15, 9, 1))).toEqual(at(2026, 12, 15));
  });

  it("clamps day 31 to the last day of a short month", () => {
    expect(nextDueAt(r({ dayOfMonth: 31 }), at(2027, 2, 1))).toEqual(
      at(2027, 2, 28),
    );
  });

  it("rolls over the year", () => {
    expect(nextDueAt(r(), at(2026, 12, 20))).toEqual(at(2027, 1, 15));
  });

  it("has no alert at all for a paused recurring item", () => {
    expect(nextDueAt(r({ active: false }), at(2026, 11, 1))).toBeNull();
  });
});

describe("isDueToday", () => {
  it("is true on the due day", () => {
    expect(isDueToday(r(), at(2026, 11, 15, 14))).toBe(true);
  });
  it("is false on a later day while it is still unpaid", () => {
    expect(isDueToday(r(), at(2026, 11, 17))).toBe(false);
  });
  it("uses the clamped day in a short month", () => {
    expect(isDueToday(r({ dayOfMonth: 31 }), at(2027, 2, 28))).toBe(true);
  });
});
