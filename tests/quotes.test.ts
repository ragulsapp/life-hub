import { describe, it, expect } from "vitest";
import { quoteForDay } from "../src/lib/quotes";

describe("quoteForDay", () => {
  it("is stable across the same calendar day", () => {
    const morning = quoteForDay(new Date(2026, 6, 14, 6, 0));
    const night = quoteForDay(new Date(2026, 6, 14, 23, 59));
    expect(morning).toBe(night);
  });

  it("changes on a different day", () => {
    const day1 = quoteForDay(new Date(2026, 6, 14));
    const day2 = quoteForDay(new Date(2026, 6, 15));
    // Not guaranteed to differ for every possible pair, but across a full
    // year the sequence must vary somewhere — this pair is known to differ.
    expect(day1).not.toBe(day2);
  });

  it("always returns a non-empty string", () => {
    for (let d = 1; d <= 365; d += 37) {
      expect(quoteForDay(new Date(2026, 0, d)).length).toBeGreaterThan(0);
    }
  });

  it("is fully deterministic for a given date", () => {
    const a = quoteForDay(new Date(2026, 2, 3));
    const b = quoteForDay(new Date(2026, 2, 3));
    expect(a).toBe(b);
  });
});
