import { describe, it, expect } from "vitest";
import {
  ageFromBirthYear,
  basalRateKcal,
  bmi,
  canInterpretBmi,
  healthyWeightRangeKg,
  profileIsUsable,
  sleepTargetHours,
  totalEnergyKcal,
  waterTargetMl,
  weightPosition,
} from "../src/lib/bodyMetrics";

describe("ageFromBirthYear", () => {
  it("derives age from the current year", () => {
    expect(ageFromBirthYear(1998, new Date(2026, 6, 30))).toBe(28);
  });

  it("stays correct across a year boundary — the reason age isn't stored", () => {
    expect(ageFromBirthYear(1998, new Date(2026, 11, 31))).toBe(28);
    expect(ageFromBirthYear(1998, new Date(2027, 0, 1))).toBe(29);
  });
});

describe("bmi", () => {
  it("computes weight over height squared, to one decimal", () => {
    expect(bmi(70, 170)).toBe(24.2);
  });

  it("returns null on missing or nonsense input rather than NaN", () => {
    expect(bmi(0, 170)).toBeNull();
    expect(bmi(70, 0)).toBeNull();
  });
});

describe("healthyWeightRangeKg", () => {
  it("uses the standard WHO band by default", () => {
    const r = healthyWeightRangeKg(170, "standard")!;
    expect(r.minKg).toBeCloseTo(53.5, 1);
    expect(r.maxKg).toBeCloseTo(72, 1);
  });

  it("uses the lower Asia-Pacific ceiling when chosen", () => {
    const std = healthyWeightRangeKg(170, "standard")!;
    const ap = healthyWeightRangeKg(170, "asia-pacific")!;
    expect(ap.maxKg).toBeLessThan(std.maxKg);
    // Lower bound is the same in both references.
    expect(ap.minKg).toBe(std.minKg);
  });

  it("returns null without a height", () => {
    expect(healthyWeightRangeKg(0, "standard")).toBeNull();
  });
});

describe("weightPosition", () => {
  it("reports where a weight sits without labelling the person", () => {
    expect(weightPosition(60, 170, "standard")).toBe("within");
    expect(weightPosition(45, 170, "standard")).toBe("below");
    expect(weightPosition(95, 170, "standard")).toBe("above");
  });

  it("can differ between references at the same weight", () => {
    // 70kg @170cm is inside the standard band but above Asia-Pacific's.
    expect(weightPosition(70, 170, "standard")).toBe("within");
    expect(weightPosition(70, 170, "asia-pacific")).toBe("above");
  });
});

describe("canInterpretBmi", () => {
  it("refuses to classify minors — adult BMI bands don't apply", () => {
    expect(canInterpretBmi(17)).toBe(false);
    expect(canInterpretBmi(18)).toBe(true);
    expect(canInterpretBmi(null)).toBe(false);
  });
});

describe("waterTargetMl", () => {
  it("scales at roughly 35 ml per kg", () => {
    expect(waterTargetMl(60)).toBe(2100);
  });

  it("clamps both ends so it never suggests an unsafe volume", () => {
    expect(waterTargetMl(20)).toBe(1500);
    expect(waterTargetMl(200)).toBe(4000);
  });

  it("returns null without a weight", () => {
    expect(waterTargetMl(0)).toBeNull();
  });
});

describe("sleepTargetHours", () => {
  it("uses age bands", () => {
    expect(sleepTargetHours(10)).toEqual({ min: 9, max: 11 });
    expect(sleepTargetHours(16)).toEqual({ min: 8, max: 10 });
    expect(sleepTargetHours(30)).toEqual({ min: 7, max: 9 });
    expect(sleepTargetHours(70)).toEqual({ min: 7, max: 8 });
  });
});

describe("basalRateKcal", () => {
  it("matches Mifflin-St Jeor for a known male case", () => {
    // 10*70 + 6.25*170 - 5*30 + 5 = 1617.5 → 1618
    const r = basalRateKcal(70, 170, 30, "male")!;
    expect(r.low).toBe(1618);
    expect(r.high).toBe(1618);
  });

  it("matches Mifflin-St Jeor for a known female case", () => {
    // 10*70 + 6.25*170 - 5*30 - 161 = 1451.5 → 1452
    const r = basalRateKcal(70, 170, 30, "female")!;
    expect(r.low).toBe(1452);
    expect(r.high).toBe(1452);
  });

  it("returns an honest range when sex is unspecified, not a fake average", () => {
    const r = basalRateKcal(70, 170, 30, "unspecified")!;
    expect(r.low).toBe(1452); // female estimate
    expect(r.high).toBe(1618); // male estimate
    expect(r.low).toBeLessThan(r.high);
  });

  it("returns null when anything needed is missing", () => {
    expect(basalRateKcal(0, 170, 30, "male")).toBeNull();
    expect(basalRateKcal(70, 170, 0, "male")).toBeNull();
  });
});

describe("totalEnergyKcal", () => {
  it("scales the basal figure by activity", () => {
    const sedentary = totalEnergyKcal({ low: 1000, high: 1000 }, "sedentary");
    const active = totalEnergyKcal({ low: 1000, high: 1000 }, "very-active");
    expect(sedentary.low).toBe(1200);
    expect(active.low).toBe(1900);
  });

  it("preserves a range through the scaling", () => {
    const r = totalEnergyKcal({ low: 1452, high: 1618 }, "sedentary");
    expect(r.low).toBeLessThan(r.high);
  });
});

describe("profileIsUsable", () => {
  it("needs both height and birth year before anything is personal", () => {
    expect(profileIsUsable(undefined)).toBe(false);
    expect(profileIsUsable({ heightCm: 170 })).toBe(false);
    expect(profileIsUsable({ birthYear: 1998 })).toBe(false);
    expect(profileIsUsable({ heightCm: 170, birthYear: 1998 })).toBe(true);
  });
});
