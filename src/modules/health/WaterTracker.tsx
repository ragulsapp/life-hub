import { useState } from "react";
import { motion } from "framer-motion";
import { GLASS_ML, type HealthMetric } from "../../db/db";
import { ProgressRing } from "../../components/ProgressRing";
import { inputClass } from "../../components/inputStyles";
import { localDateStr } from "../../lib/dates";
import { valueOn } from "../../lib/healthMetrics";
import { addGlass, logMetric, removeLastGlass } from "./healthActions";

/**
 * Water as a quantity, not a checkbox — "did you drink water today" is
 * meaningless, "1.4 of 2.4 L" is not.
 */
export function WaterTracker({
  metrics,
  targetMl,
  targetIsGeneric,
}: {
  metrics: HealthMetric[];
  targetMl: number;
  targetIsGeneric: boolean;
}) {
  const today = localDateStr();
  const drunk = valueOn(metrics, "water-ml", today) ?? 0;
  const pct = targetMl > 0 ? Math.min(100, (drunk / targetMl) * 100) : 0;
  const glasses = Math.round(drunk / GLASS_ML);
  const [custom, setCustom] = useState("");

  const addCustom = async () => {
    const ml = parseFloat(custom);
    if (!Number.isFinite(ml) || ml <= 0) return;
    await logMetric("water-ml", ml, today);
    setCustom("");
  };

  const litres = (ml: number) => (ml / 1000).toFixed(1);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <ProgressRing percent={pct} size={72} strokeWidth={7}>
          <span className="text-xs font-extrabold text-slate-700 dark:text-slate-100">
            {Math.round(pct)}%
          </span>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <div className="text-lg font-bold text-slate-900 dark:text-white">
            {litres(drunk)} of {litres(targetMl)} L
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {glasses} {glasses === 1 ? "glass" : "glasses"} today
            {drunk >= targetMl && targetMl > 0 && " · target reached"}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => addGlass(today)}
          className="flex-1 rounded-xl bg-cyan-500 px-3 py-2.5 text-sm font-semibold text-slate-900"
        >
          + 1 glass ({GLASS_ML} ml)
        </motion.button>
        <button
          onClick={() => removeLastGlass(today)}
          disabled={drunk <= 0}
          className="rounded-xl bg-slate-100 px-3 py-2.5 text-sm font-medium text-slate-500 disabled:opacity-40 dark:bg-slate-700/60 dark:text-slate-300"
        >
          Undo
        </button>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addCustom()}
          placeholder="Other amount (ml)"
          className={`flex-1 !p-2 text-sm ${inputClass}`}
        />
        <button
          onClick={addCustom}
          disabled={!custom}
          className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 disabled:opacity-40 dark:bg-slate-700/60 dark:text-slate-300"
        >
          Add
        </button>
      </div>

      {targetIsGeneric && (
        <p className="text-xs text-slate-400">
          Using a general adult guideline. Log your weight to get a target
          based on your body.
        </p>
      )}
    </div>
  );
}
