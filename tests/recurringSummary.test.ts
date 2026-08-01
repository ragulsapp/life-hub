import { describe, it, expect } from "vitest";
import type { RecurringTransaction } from "../src/db/db";
import { isPending, pendingRecurring } from "../src/modules/finance/recurringSummary";

const rt = (extra: Partial<RecurringTransaction> = {}): RecurringTransaction =>
  ({
    id: 1,
    type: "expense",
    category: "Rent",
    amount: 1000,
    dayOfMonth: 5,
    active: true,
    ...extra,
  }) as RecurringTransaction;

describe("isPending", () => {
  it("is not pending before its day arrives", () => {
    expect(isPending(rt({ dayOfMonth: 15 }), new Date(2026, 6, 10))).toBe(false);
  });

  it("is pending once the day arrives", () => {
    expect(isPending(rt({ dayOfMonth: 15 }), new Date(2026, 6, 15))).toBe(true);
  });

  it("stays pending after its day, not just on it", () => {
    expect(isPending(rt({ dayOfMonth: 5 }), new Date(2026, 6, 20))).toBe(true);
  });

  it("is not pending once generated this month", () => {
    expect(
      isPending(
        rt({ dayOfMonth: 5, generatedMonth: "2026-07" }),
        new Date(2026, 6, 20),
      ),
    ).toBe(false);
  });

  it("becomes pending again the following month even if generated last month", () => {
    expect(
      isPending(
        rt({ dayOfMonth: 5, generatedMonth: "2026-06" }),
        new Date(2026, 6, 20),
      ),
    ).toBe(true);
  });

  it("is never pending while inactive", () => {
    expect(isPending(rt({ active: false, dayOfMonth: 1 }), new Date(2026, 6, 20))).toBe(
      false,
    );
  });

  it("clamps day 31 to the month's actual last day, so it still fires in a shorter month", () => {
    // February 2026 has 28 days — day 31 must not simply never fire.
    expect(isPending(rt({ dayOfMonth: 31 }), new Date(2026, 1, 28))).toBe(true);
    expect(isPending(rt({ dayOfMonth: 31 }), new Date(2026, 1, 27))).toBe(false);
  });
});

describe("pendingRecurring", () => {
  it("returns only the pending ones", () => {
    const now = new Date(2026, 6, 20);
    const all = [
      rt({ id: 1, dayOfMonth: 5 }), // pending
      rt({ id: 2, dayOfMonth: 25 }), // not yet
      rt({ id: 3, dayOfMonth: 5, generatedMonth: "2026-07" }), // done
    ];
    expect(pendingRecurring(all, now).map((r) => r.id)).toEqual([1]);
  });
});
