import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { motion } from "framer-motion";
import { db, type HealthMetric, type TrajectoryMetricType } from "../../db/db";
import { inputClass } from "../../components/inputStyles";
import { dailyValues, type DailyValue } from "../../lib/healthMetrics";

/**
 * Trajectory metrics only — a start→target journey you make once.
 * Water and sleep are recurring daily targets derived from the body profile
 * (see bodyMetrics.ts) and deliberately don't belong here: two sources of
 * truth for the same number would drift.
 */
const GOAL_METRICS: {
  type: TrajectoryMetricType;
  label: string;
  unit: string;
  defaultDir: "decrease" | "increase";
}[] = [
  { type: "weight", label: "Weight", unit: "kg", defaultDir: "decrease" },
  { type: "energy-level", label: "Energy", unit: "/10", defaultDir: "increase" },
];

function progressToGoal(
  series: DailyValue[],
  target: number,
  direction: "decrease" | "increase",
): { current: number | null; start: number | null; pct: number } {
  if (series.length === 0) return { current: null, start: null, pct: 0 };
  const start = series[0].value;
  const current = series[series.length - 1].value;
  const totalGap = Math.abs(start - target) || 1;
  const covered =
    direction === "decrease" ? start - current : current - start;
  const pct = Math.max(0, Math.min(100, (covered / totalGap) * 100));
  return { current, start, pct };
}

export function MetricGoals({ metrics }: { metrics: HealthMetric[] }) {
  const goals = useLiveQuery(() => db.metricGoals.toArray(), []) ?? [];
  const [editing, setEditing] = useState<TrajectoryMetricType | null>(null);
  const [draft, setDraft] = useState("");

  const goalFor = (t: TrajectoryMetricType) =>
    goals.find((g) => g.metricType === t);

  const save = async (
    t: TrajectoryMetricType,
    dir: "decrease" | "increase",
  ) => {
    const target = parseFloat(draft);
    const existing = goalFor(t);
    if (!target) {
      if (existing) await db.metricGoals.delete(existing.id);
    } else if (existing) {
      await db.metricGoals.update(existing.id, { target, direction: dir });
    } else {
      await db.metricGoals.add({
        metricType: t,
        target,
        direction: dir,
      } as never);
    }
    setEditing(null);
    setDraft("");
  };

  return (
    <div className="flex flex-col gap-3">
      {GOAL_METRICS.map((m) => {
        const goal = goalFor(m.type);
        const series = dailyValues(metrics, m.type);
        const isEditing = editing === m.type;
        const prog = goal
          ? progressToGoal(series, goal.target, goal.direction)
          : null;

        return (
          <div key={m.type}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {m.label}
              </span>
              {isEditing ? (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    type="number"
                    step="0.1"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && save(m.type, m.defaultDir)
                    }
                    placeholder={`Target ${m.unit}`}
                    className={`w-24 !p-1.5 text-sm ${inputClass}`}
                  />
                  <button
                    onClick={() => save(m.type, m.defaultDir)}
                    className="rounded-lg bg-cyan-500 px-2 py-1 text-xs font-semibold text-white"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEditing(m.type);
                    setDraft(goal ? String(goal.target) : "");
                  }}
                  className="text-xs font-semibold text-slate-500 dark:text-slate-400"
                >
                  {goal
                    ? `${prog?.current ?? "—"} → ${goal.target} ${m.unit}`
                    : "Set goal"}
                </button>
              )}
            </div>
            {goal && prog && (
              <>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700/50">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${prog.pct}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <div className="mt-0.5 text-xs text-slate-400">
                  {Math.round(prog.pct)}% to goal
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
