import { useState } from "react";
import type { HealthMetric } from "../../db/db";
import { Button } from "../../components/Button";
import { inputClass } from "../../components/inputStyles";
import { localDateStr } from "../../lib/dates";
import { toast } from "../../lib/toast";
import { latestValue, valueOn } from "../../lib/healthMetrics";
import { logMetric } from "./healthActions";

/**
 * Readings, not quantities — logging twice corrects the day rather than
 * adding to it (see logMetric's upsert path).
 */
export function HealthEntryForm({ metrics }: { metrics: HealthMetric[] }) {
  const today = localDateStr();
  // Prefill from what the user last recorded, not an invented baseline.
  const [weight, setWeight] = useState(
    () => latestValue(metrics, "weight")?.toString() ?? "",
  );
  const [sleep, setSleep] = useState(
    () => valueOn(metrics, "sleep-hours", today)?.toString() ?? "",
  );
  const [energy, setEnergy] = useState(
    () => valueOn(metrics, "energy-level", today)?.toString() ?? "",
  );

  const log = async (
    type: "weight" | "sleep-hours" | "energy-level",
    raw: string,
    max: number,
    label: string,
  ) => {
    const value = parseFloat(raw);
    if (!Number.isFinite(value) || value <= 0 || value > max) {
      toast(`Enter a valid ${label}.`, "error");
      return;
    }
    await logMetric(type, value, today);
    toast(`${label} saved.`);
  };

  const row = (
    label: string,
    hint: string,
    value: string,
    setValue: (v: string) => void,
    onLog: () => void,
    step: string,
  ) => (
    <div className="flex items-end gap-2">
      <div className="min-w-0 flex-1">
        <label className="text-xs text-slate-500 dark:text-slate-400">
          {label}
        </label>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onLog()}
          type="number"
          step={step}
          placeholder={hint}
          className={`w-full ${inputClass}`}
        />
      </div>
      <Button onClick={onLog} disabled={!value}>
        Save
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {row(
        "Weight (kg)",
        "70",
        weight,
        setWeight,
        () => log("weight", weight, 500, "weight"),
        "0.1",
      )}
      {row(
        "Sleep last night (hours)",
        "7.5",
        sleep,
        setSleep,
        () => log("sleep-hours", sleep, 24, "sleep"),
        "0.5",
      )}
      {row(
        "Energy today (1-10)",
        "7",
        energy,
        setEnergy,
        () => log("energy-level", energy, 10, "energy"),
        "1",
      )}
      <p className="text-xs text-slate-400">
        Sleep counts toward the day you woke up. Saving again replaces today's
        entry rather than adding another.
      </p>
    </div>
  );
}
