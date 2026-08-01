/**
 * Body math — pure functions over primitives, no DB and no profile reads, so
 * every one is trivially unit-testable (same shape as habitStreaks.ts).
 *
 * These are general reference figures from published public-health guidance,
 * NOT medical advice and NOT a diagnosis. Two rules the callers must honour:
 *  - Show a healthy *range*, never a verdict label like "obese".
 *  - Under 18, adult BMI categories are invalid (they need percentile charts),
 *    so `bmiCategory` refuses to classify — see `canInterpretBmi`.
 */
import type { BodyProfile } from "../db/db";

export type BmiReference = NonNullable<BodyProfile["bmiReference"]>;
export type ActivityLevel = NonNullable<BodyProfile["activityLevel"]>;
export type Sex = NonNullable<BodyProfile["sex"]>;

/**
 * BMI bounds for the "healthy" band. The Asia-Pacific figures are the lower
 * WHO/ICMR cutoffs; offered as the user's own choice of reference range,
 * never inferred from who they are.
 */
const BMI_HEALTHY: Record<BmiReference, { min: number; max: number }> = {
  standard: { min: 18.5, max: 24.9 },
  "asia-pacific": { min: 18.5, max: 22.9 },
};

/**
 * Age in whole years, derived so it can never go stale.
 *
 * Without a birth month this is a plain calendar-year subtraction, which is
 * wrong for most of the year — it silently assumes the birthday already
 * happened, so it over-counts by one for everyone whose birthday is later
 * in the year than "now". With `birthMonth` (1-12, no day — still no full
 * birthdate collected) it's exact except within the birth month itself,
 * where day-of-month is genuinely unknown.
 */
export function ageFromBirthYear(
  birthYear: number,
  birthMonth?: number,
  now = new Date(),
): number {
  const years = now.getFullYear() - birthYear;
  if (!birthMonth) return years;
  const hasHadBirthdayThisYear = now.getMonth() + 1 >= birthMonth;
  return hasHadBirthdayThisYear ? years : years - 1;
}

/** Adult BMI categories don't apply to minors. */
export function canInterpretBmi(ageYears: number | null): boolean {
  return ageYears !== null && ageYears >= 18;
}

export function bmi(weightKg: number, heightCm: number): number | null {
  if (!(weightKg > 0) || !(heightCm > 0)) return null;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

/**
 * The weight band that lands inside the healthy BMI range for this height.
 * Phrased as a range on purpose — "your healthy range is 58–74 kg" is useful
 * and neutral where "you are overweight" is a verdict.
 */
export function healthyWeightRangeKg(
  heightCm: number,
  reference: BmiReference = "standard",
): { minKg: number; maxKg: number } | null {
  if (!(heightCm > 0)) return null;
  const m = heightCm / 100;
  const band = BMI_HEALTHY[reference];
  return {
    minKg: Math.round(band.min * m * m * 10) / 10,
    maxKg: Math.round(band.max * m * m * 10) / 10,
  };
}

/** Where a weight sits relative to the healthy band, without labelling it. */
export function weightPosition(
  weightKg: number,
  heightCm: number,
  reference: BmiReference = "standard",
): "below" | "within" | "above" | null {
  const range = healthyWeightRangeKg(heightCm, reference);
  if (!range || !(weightKg > 0)) return null;
  if (weightKg < range.minKg) return "below";
  if (weightKg > range.maxKg) return "above";
  return "within";
}

/**
 * Daily water target at ~35 ml per kg — a common clinical heuristic.
 * Clamped at both ends: the low bound keeps small body weights sensible, and
 * the high bound avoids ever suggesting a volume that approaches unsafe.
 */
export function waterTargetMl(weightKg: number): number | null {
  if (!(weightKg > 0)) return null;
  const raw = weightKg * 35;
  return Math.round(Math.min(4000, Math.max(1500, raw)) / 50) * 50;
}

/** Shown when no weight has been logged yet — a generic adult guideline. */
export const GENERIC_WATER_TARGET_ML = 2000;

/** National Sleep Foundation age bands. */
export function sleepTargetHours(ageYears: number): {
  min: number;
  max: number;
} {
  if (ageYears < 14) return { min: 9, max: 11 };
  if (ageYears < 18) return { min: 8, max: 10 };
  if (ageYears < 65) return { min: 7, max: 9 };
  return { min: 7, max: 8 };
}

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  "very-active": 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Mostly sitting",
  light: "Lightly active",
  moderate: "Moderately active",
  active: "Very active",
  "very-active": "Extremely active",
};

/**
 * Resting energy use (Mifflin-St Jeor), as a reference figure only — nothing
 * in the app prescribes calories.
 *
 * When sex is unspecified this returns a RANGE rather than a single number.
 * The male/female difference in this formula is a flat 166 kcal constant, so
 * "averaging" the two would just be `male - 83` dressed up as a formula; a
 * range is the honest representation of what we actually know.
 */
export function basalRateKcal(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  sex: Sex = "unspecified",
): { low: number; high: number } | null {
  if (!(weightKg > 0) || !(heightCm > 0) || !(ageYears > 0)) return null;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  const male = Math.round(base + 5);
  const female = Math.round(base - 161);
  if (sex === "male") return { low: male, high: male };
  if (sex === "female") return { low: female, high: female };
  return { low: female, high: male };
}

/** Total daily energy use — BMR scaled by how active the user says they are. */
export function totalEnergyKcal(
  basal: { low: number; high: number },
  activity: ActivityLevel = "sedentary",
): { low: number; high: number } {
  const f = ACTIVITY_FACTOR[activity];
  return { low: Math.round(basal.low * f), high: Math.round(basal.high * f) };
}

/** True once there's enough profile to compute anything personal. */
export function profileIsUsable(profile?: BodyProfile): boolean {
  return !!profile?.heightCm && !!profile?.birthYear;
}
