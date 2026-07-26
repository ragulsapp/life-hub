import { useLiveQuery } from "dexie-react-hooks";
import { motion } from "framer-motion";
import { db } from "../../db/db";
import { Card } from "../../components/Card";
import { AreaChart } from "../../components/AreaChart";
import { HealthEntryForm } from "./HealthEntryForm";
import { FastingTimer } from "./FastingTimer";
import { FastingHistory } from "./FastingHistory";
import { MetricGoals } from "./MetricGoals";

export function HealthView() {
  const metrics = useLiveQuery(() => db.healthMetrics.toArray(), []) ?? [];

  const weightSeries = metrics
    .filter((m) => m.metricType === "weight")
    .sort((a, b) => a.date.localeCompare(b.date));
  const energySeries = metrics
    .filter((m) => m.metricType === "energy-level")
    .sort((a, b) => a.date.localeCompare(b.date));

  const fastCount = metrics.filter(
    (m) => m.metricType === "15.5h-fast" && m.value,
  ).length;
  const titanCount = metrics.filter(
    (m) => m.metricType === "titan-powder" && m.value,
  ).length;

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        Health
      </h1>

      <Card title="Fasting Timer">
        <FastingTimer />
      </Card>

      <Card title="Fasting History" delay={0.02}>
        <FastingHistory />
      </Card>

      <Card title="Goals" delay={0.03}>
        <MetricGoals />
      </Card>

      <Card title="Log Entry" delay={0.05}>
        <HealthEntryForm />
      </Card>

      <Card title="Weight Trend" delay={0.07}>
        <AreaChart
          values={weightSeries.map((m) => m.value)}
          color="#38bdf8"
          unit="kg"
        />
        <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Latest:{" "}
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {weightSeries.at(-1)?.value ?? "—"} kg
          </span>
        </div>
      </Card>

      <Card title="Energy Level Trend" delay={0.1}>
        <AreaChart
          values={energySeries.map((m) => m.value)}
          color="#a78bfa"
        />
        <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Latest:{" "}
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {energySeries.at(-1)?.value ?? "—"} / 10
          </span>
        </div>
      </Card>

      <Card title="Consistency Totals" delay={0.15}>
        <div className="flex justify-around text-center">
          <motion.div whileTap={{ scale: 0.95 }}>
            <div className="bg-gradient-to-br from-emerald-400 to-teal-500 bg-clip-text text-3xl font-extrabold text-transparent">
              {fastCount}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              15.5h Fast days
            </div>
          </motion.div>
          <motion.div whileTap={{ scale: 0.95 }}>
            <div className="bg-gradient-to-br from-amber-400 to-orange-500 bg-clip-text text-3xl font-extrabold text-transparent">
              {titanCount}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Titan Powder days
            </div>
          </motion.div>
        </div>
      </Card>
    </div>
  );
}
