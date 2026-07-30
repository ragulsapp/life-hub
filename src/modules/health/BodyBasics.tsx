import type { BodyProfile, HealthMetric } from "../../db/db";
import {
  ageFromBirthYear,
  basalRateKcal,
  bmi,
  canInterpretBmi,
  healthyWeightRangeKg,
  totalEnergyKcal,
  weightPosition,
} from "../../lib/bodyMetrics";
import { latestValue } from "../../lib/healthMetrics";

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
        {label}
      </div>
      <div className="text-lg font-bold text-slate-900 dark:text-white">
        {value}
      </div>
      {hint && (
        <div className="text-xs text-slate-500 dark:text-slate-400">{hint}</div>
      )}
    </div>
  );
}

/**
 * "Am I okay?" — the first question anyone opens a health screen to answer.
 *
 * Deliberately shows a healthy *range* and where the user sits relative to it,
 * never a verdict label. Under 18 the adult BMI bands don't apply at all
 * (minors need percentile charts), so interpretation is withheld entirely.
 */
export function BodyBasics({
  profile,
  metrics,
}: {
  profile: BodyProfile;
  metrics: HealthMetric[];
}) {
  const weight = latestValue(metrics, "weight");
  const height = profile.heightCm ?? null;
  const age = profile.birthYear ? ageFromBirthYear(profile.birthYear) : null;
  const reference = profile.bmiReference ?? "standard";

  const bmiValue = weight && height ? bmi(weight, height) : null;
  const range = height ? healthyWeightRangeKg(height, reference) : null;
  const position =
    weight && height ? weightPosition(weight, height, reference) : null;
  const interpretable = canInterpretBmi(age);

  const basal =
    weight && height && age
      ? basalRateKcal(weight, height, age, profile.sex ?? "unspecified")
      : null;
  const total = basal
    ? totalEnergyKcal(basal, profile.activityLevel ?? "sedentary")
    : null;

  const positionText =
    position === "within"
      ? "Inside your healthy range"
      : position === "below"
        ? "Below your healthy range"
        : position === "above"
          ? "Above your healthy range"
          : null;

  return (
    <div className="flex flex-col gap-4">
      {!weight && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Log your weight below to see your numbers.
        </p>
      )}

      {weight && (
        <div className="grid grid-cols-2 gap-4">
          <Stat label="Weight" value={`${weight} kg`} />
          {bmiValue !== null && (
            <Stat
              label="BMI"
              value={String(bmiValue)}
              hint={interpretable ? undefined : "Reference only under 18"}
            />
          )}
        </div>
      )}

      {range && interpretable && (
        <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-700/40">
          <div className="text-sm text-slate-600 dark:text-slate-300">
            Your healthy range is{" "}
            <span className="font-bold text-slate-900 dark:text-white">
              {range.minKg}–{range.maxKg} kg
            </span>{" "}
            for your height.
          </div>
          {positionText && (
            <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {positionText}
            </div>
          )}
        </div>
      )}

      {range && !interpretable && age !== null && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Under 18, healthy weight is assessed with growth percentile charts
          rather than adult ranges — so the app shows your number and trend
          without interpreting it. A doctor can read it properly.
        </p>
      )}

      {total && (
        <div>
          <Stat
            label="Energy use (reference)"
            value={
              total.low === total.high
                ? `~${total.low.toLocaleString()} kcal/day`
                : `~${total.low.toLocaleString()}–${total.high.toLocaleString()} kcal/day`
            }
            hint={
              (profile.sex ?? "unspecified") === "unspecified"
                ? "A range, because sex isn't set — it changes this estimate"
                : "Includes your typical activity"
            }
          />
        </div>
      )}

      <p className="text-xs text-slate-400">
        General reference figures, not medical advice.
      </p>
    </div>
  );
}
