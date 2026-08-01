import { describe, it, expect } from "vitest";
import {
  missionState,
  smartTriggersDue,
  type SmartCheckInput,
  type SmartNotifiedState,
} from "../src/lib/smartNotifications";

describe("missionState", () => {
  it("is not complete while a due habit is unchecked, even with no open tasks", () => {
    const s = missionState(2, 1, 0); // 2 due habits, 1 remaining, no tasks
    expect(s.size).toBe(2);
    expect(s.remaining).toBe(1);
  });

  it("is complete once every due habit is checked and no open tasks remain", () => {
    const s = missionState(3, 0, 0);
    expect(s.size).toBe(3);
    expect(s.remaining).toBe(0);
  });

  it("stays incomplete while any open task remains, regardless of habits", () => {
    // Every open task contributes a done:false entry that can never flip —
    // this is the subtle DashboardView-mirroring behavior.
    const s = missionState(0, 0, 2); // no habits at all, 2 open tasks
    expect(s.size).toBe(2);
    expect(s.remaining).toBe(2);
  });

  it("caps the task contribution at 5, matching the Dashboard's slice(0, 5)", () => {
    const s = missionState(0, 0, 12);
    expect(s.size).toBe(5);
    expect(s.remaining).toBe(5);
  });

  it("is empty (size 0) with nothing due and nothing open", () => {
    const s = missionState(0, 0, 0);
    expect(s.size).toBe(0);
    expect(s.remaining).toBe(0);
  });

  it("reports exactly one remaining when one habit is left and no tasks are open", () => {
    const s = missionState(4, 1, 0);
    expect(s.remaining).toBe(1);
  });
});

describe("smartTriggersDue", () => {
  const notNotified: SmartNotifiedState = { date: "2026-07-14" };

  const base: SmartCheckInput = {
    now: new Date(2026, 6, 14, 19, 0), // 7pm — past the evening gate
    habitsRemaining: 0,
    missionSize: 0,
    missionRemaining: 0,
    todaySpend: 0,
    safePerDay: null,
  };

  it("returns nothing when no condition is met", () => {
    expect(smartTriggersDue(base, notNotified)).toEqual([]);
  });

  describe("habitsLeft", () => {
    it("fires after 6pm with habits remaining", () => {
      const out = smartTriggersDue({ ...base, habitsRemaining: 2 }, notNotified);
      expect(out).toContainEqual({ kind: "habitsLeft", count: 2 });
    });

    it("does not fire before 6pm — not a morning nag", () => {
      const morning = { ...base, habitsRemaining: 2, now: new Date(2026, 6, 14, 9, 0) };
      expect(smartTriggersDue(morning, notNotified)).toEqual([]);
    });

    it("does not fire twice the same day — gated by notified.habitsLeft", () => {
      const input = { ...base, habitsRemaining: 2 };
      const out = smartTriggersDue(input, { ...notNotified, habitsLeft: true });
      expect(out).toEqual([]);
    });

    it("does not fire with zero habits remaining", () => {
      const out = smartTriggersDue({ ...base, habitsRemaining: 0 }, notNotified);
      expect(out).toEqual([]);
    });
  });

  describe("budgetClose", () => {
    it("fires once today's spend crosses 80% of the safe daily pace", () => {
      const input = { ...base, safePerDay: 500, todaySpend: 400 }; // exactly 80%
      expect(smartTriggersDue(input, notNotified)).toContainEqual({ kind: "budgetClose" });
    });

    it("does not fire below the 80% threshold", () => {
      const input = { ...base, safePerDay: 500, todaySpend: 399 };
      expect(smartTriggersDue(input, notNotified)).toEqual([]);
    });

    it("does not fire when no budgets are set (safePerDay is null)", () => {
      const input = { ...base, safePerDay: null, todaySpend: 10000 };
      expect(smartTriggersDue(input, notNotified)).toEqual([]);
    });

    it("does not fire once already notified today", () => {
      const input = { ...base, safePerDay: 500, todaySpend: 600 };
      expect(smartTriggersDue(input, { ...notNotified, budgetClose: true })).toEqual([]);
    });
  });

  describe("missionOneLeft", () => {
    it("fires when exactly one item remains", () => {
      const input = { ...base, missionSize: 3, missionRemaining: 1 };
      expect(smartTriggersDue(input, notNotified)).toContainEqual({ kind: "missionOneLeft" });
    });

    it("does not fire with two or more remaining", () => {
      const input = { ...base, missionSize: 3, missionRemaining: 2 };
      expect(smartTriggersDue(input, notNotified)).toEqual([]);
    });

    it("does not fire once the mission is already fully complete", () => {
      const input = { ...base, missionSize: 3, missionRemaining: 0 };
      const out = smartTriggersDue(input, notNotified);
      expect(out.find((t) => t.kind === "missionOneLeft")).toBeUndefined();
    });
  });

  describe("missionComplete", () => {
    it("fires once the mission is fully complete", () => {
      const input = { ...base, missionSize: 3, missionRemaining: 0 };
      expect(smartTriggersDue(input, notNotified)).toContainEqual({ kind: "missionComplete" });
    });

    it("does not fire for an empty mission (nothing was ever due)", () => {
      const input = { ...base, missionSize: 0, missionRemaining: 0 };
      expect(smartTriggersDue(input, notNotified)).toEqual([]);
    });

    it("does not re-fire once already notified today — the false→true transition guard", () => {
      const input = { ...base, missionSize: 3, missionRemaining: 0 };
      expect(smartTriggersDue(input, { ...notNotified, missionComplete: true })).toEqual([]);
    });
  });

  it("can fire more than one trigger in the same tick", () => {
    const input: SmartCheckInput = {
      now: new Date(2026, 6, 14, 19, 0),
      habitsRemaining: 1,
      missionSize: 1,
      missionRemaining: 0,
      todaySpend: 600,
      safePerDay: 500,
    };
    const out = smartTriggersDue(input, notNotified);
    expect(out).toContainEqual({ kind: "habitsLeft", count: 1 });
    expect(out).toContainEqual({ kind: "budgetClose" });
    expect(out).toContainEqual({ kind: "missionComplete" });
  });
});
