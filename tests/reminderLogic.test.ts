import { describe, it, expect } from "vitest";
import {
  ALARM_GRACE_MINUTES,
  alarmDueState,
  matchesDays,
  minutesLate,
  reminderCreationGuard,
  reminderDue,
} from "../src/lib/reminderLogic";
import { localDateStr } from "../src/lib/dates";

const at = (h: number, m: number) => new Date(2026, 6, 14, h, m); // a Tuesday

describe("reminderDue (H4: fire late rather than never)", () => {
  it("is not due before the time", () => {
    expect(reminderDue("09:00", at(8, 59))).toBe(false);
  });
  it("is due exactly at the time", () => {
    expect(reminderDue("09:00", at(9, 0))).toBe(true);
  });
  it("is STILL due hours later — throttled timers must not skip it", () => {
    expect(reminderDue("09:00", at(14, 30))).toBe(true);
  });
});

describe("matchesDays", () => {
  it("empty days matches every day", () => {
    expect(matchesDays([], at(9, 0))).toBe(true);
  });
  it("respects selected weekdays (Tuesday = 2)", () => {
    expect(matchesDays([2], at(9, 0))).toBe(true);
    expect(matchesDays([0, 6], at(9, 0))).toBe(false);
  });
});

describe("minutesLate", () => {
  it("computes lateness in minutes", () => {
    expect(minutesLate("07:00", at(7, 45))).toBe(45);
    expect(minutesLate("07:00", at(6, 30))).toBe(-30);
  });
});

describe("alarmDueState", () => {
  it("not-due before the alarm time", () => {
    expect(alarmDueState("07:00", [], at(6, 59))).toBe("not-due");
  });
  it("rings within the grace window", () => {
    expect(alarmDueState("07:00", [], at(7, 0))).toBe("ring");
    expect(alarmDueState("07:00", [], at(7, ALARM_GRACE_MINUTES))).toBe("ring");
  });
  it("reports missed beyond the grace window", () => {
    expect(alarmDueState("07:00", [], at(7, ALARM_GRACE_MINUTES + 1))).toBe(
      "missed",
    );
  });
  it("not-due on non-matching weekdays", () => {
    expect(alarmDueState("07:00", [0, 6], at(7, 0))).toBe("not-due");
  });
});

describe("reminderCreationGuard (no instant fire on creation)", () => {
  it("anchors to today when the time already passed", () => {
    const now = at(14, 0);
    expect(reminderCreationGuard("09:00", now)).toBe(localDateStr(now));
  });
  it("leaves future times unanchored", () => {
    expect(reminderCreationGuard("21:00", at(14, 0))).toBeUndefined();
  });
});
