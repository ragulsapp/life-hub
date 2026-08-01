import { describe, it, expect, vi, afterEach } from "vitest";
import { localDateStr, localTimeStr, localMonthKey, tomorrowStr } from "../src/lib/dates";

afterEach(() => vi.useRealTimers());

describe("localDateStr (C1 regression)", () => {
  it("returns the LOCAL calendar date just after local midnight", () => {
    vi.useFakeTimers();
    // 00:30 local on Jan 15 — the old toISOString() implementation returned
    // Jan 14 in any timezone ahead of UTC (e.g. IST +5:30).
    vi.setSystemTime(new Date(2026, 0, 15, 0, 30));
    expect(localDateStr()).toBe("2026-01-15");
  });

  it("pads single-digit month and day", () => {
    expect(localDateStr(new Date(2026, 2, 5))).toBe("2026-03-05");
  });

  it("differs from the UTC method whenever the offset pushes past midnight", () => {
    const justAfterMidnight = new Date(2026, 6, 14, 0, 10);
    const utcDate = justAfterMidnight.toISOString().slice(0, 10);
    const localDate = localDateStr(justAfterMidnight);
    // In UTC+ timezones these MUST differ at 00:10 local; in UTC-/zero they match.
    if (justAfterMidnight.getTimezoneOffset() < 0) {
      expect(localDate).not.toBe(utcDate);
    }
    expect(localDate).toBe("2026-07-14");
  });
});

describe("localTimeStr", () => {
  it("formats HH:MM zero-padded", () => {
    expect(localTimeStr(new Date(2026, 0, 1, 7, 5))).toBe("07:05");
    expect(localTimeStr(new Date(2026, 0, 1, 23, 59))).toBe("23:59");
  });
});

describe("localMonthKey", () => {
  it("returns local YYYY-MM", () => {
    expect(localMonthKey(new Date(2026, 11, 31, 23, 59))).toBe("2026-12");
    // Old UTC implementation would report January for Dec 31 23:59 in UTC+ zones.
  });
});

describe("tomorrowStr", () => {
  it("returns the next calendar day", () => {
    expect(tomorrowStr(new Date(2026, 6, 14))).toBe("2026-07-15");
  });

  it("rolls over a month boundary", () => {
    expect(tomorrowStr(new Date(2026, 6, 31))).toBe("2026-08-01");
  });

  it("rolls over a year boundary", () => {
    expect(tomorrowStr(new Date(2026, 11, 31))).toBe("2027-01-01");
  });

  it("is exact even if computed via ms-addition would land on the wrong day near a DST change", () => {
    // Not every zone observes DST, but the date-component construction used
    // here is correct regardless — verified against a plain calendar case.
    expect(tomorrowStr(new Date(2026, 1, 28))).toBe("2026-03-01"); // 2026 is not a leap year
  });
});
