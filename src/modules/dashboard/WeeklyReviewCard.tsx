import { motion } from "framer-motion";
import type {
  BodyProfile,
  Goal,
  Habit,
  HabitLog,
  HealthMetric,
  Task,
  Transaction,
} from "../../db/db";
import { Card } from "../../components/Card";
import { T } from "../../lib/motion";
import { findCorrelations, weeklyReview } from "../../lib/insights";
import {
  ageFromBirthYear,
  sleepTargetHours,
  waterTargetMl,
} from "../../lib/bodyMetrics";
import { latestValue } from "../../lib/healthMetrics";

/**
 * The weekly coach: one strength, one challenge, one action — plus any
 * pattern the app is confident enough to mention.
 *
 * All of it is arithmetic on this device. Nothing is uploaded, and nothing is
 * asserted from a handful of days (see MIN_SAMPLE_DAYS).
 */
export function WeeklyReviewCard({
  habits,
  logs,
  transactions,
  tasks,
  goals,
  healthMetrics,
  profile,
}: {
  habits: Habit[];
  logs: HabitLog[];
  transactions: Transaction[];
  tasks: Task[];
  goals: Goal[];
  healthMetrics: HealthMetric[];
  profile?: BodyProfile;
}) {
  const review = weeklyReview(habits, logs, transactions, tasks, goals);

  const weight = latestValue(healthMetrics, "weight");
  const age = profile?.birthYear
    ? ageFromBirthYear(profile.birthYear, profile.birthMonth)
    : null;
  const correlations = findCorrelations(habits, logs, healthMetrics, {
    sleepTargetHours:
      profile?.sleepTargetHoursOverride ??
      (age ? sleepTargetHours(age).min : null),
    waterTargetMl:
      profile?.waterTargetMlOverride ?? (weight ? waterTargetMl(weight) : null),
  });

  // Nothing measurable yet — better to stay quiet than pad with filler.
  if (review.habitRate === null && correlations.length === 0) return null;

  const rows = [
    { icon: "💪", label: "Went well", text: review.strength },
    { icon: "🎯", label: "Watch", text: review.challenge },
    { icon: "👉", label: "Next", text: review.suggestion },
  ];

  return (
    <Card title="Your Week" delay={0.11}>
      <div className="flex flex-col gap-3">
        {rows.map((r, i) => (
          <motion.div
            key={r.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...T.enter, delay: 0.05 + i * 0.05 }}
            className="flex gap-2.5"
          >
            <span className="w-5 flex-shrink-0 text-center text-sm">
              {r.icon}
            </span>
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                {r.label}
              </div>
              <div className="text-sm text-slate-700 dark:text-slate-200">
                {r.text}
              </div>
            </div>
          </motion.div>
        ))}

        {correlations.length > 0 && (
          <div className="border-t border-slate-200/70 pt-3 dark:border-slate-600/40">
            {correlations.map((c) => (
              <div key={c.text} className="flex gap-2.5">
                <span className="w-5 flex-shrink-0 text-center text-sm">💡</span>
                <div className="min-w-0">
                  <p className="text-sm text-slate-700 dark:text-slate-200">
                    {c.text}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Based on {c.sample} days of your own logs.
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
