import { useEffect, useRef, useState } from "react";
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

  // The lazy useState above only runs once, on mount — so if this form stays
  // mounted (e.g. the Health tab is open) and a value is logged from
  // somewhere else (Dashboard's QuickCapture), the chart updates correctly
  // but this field silently keeps showing whatever it had at mount, until a
  // refresh. Re-sync on every metrics change, but only for fields the user
  // hasn't started typing into — otherwise an unrelated write elsewhere
  // would wipe an in-progress edit out from under them.
  const dirty = useRef({ weight: false, sleep: false, energy: false });
  useEffect(() => {
    if (!dirty.current.weight) {
      setWeight(latestValue(metrics, "weight")?.toString() ?? "");
    }
    if (!dirty.current.sleep) {
      setSleep(valueOn(metrics, "sleep-hours", today)?.toString() ?? "");
    }
    if (!dirty.current.energy) {
      setEnergy(valueOn(metrics, "energy-level", today)?.toString() ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metrics]);

  const edit = (field: keyof typeof dirty.current, setValue: (v: string) => void) =>
    (v: string) => {
      dirty.current[field] = true;
      setValue(v);
    };

  const log = async (
    type: "weight" | "sleep-hours" | "energy-level",
    field: keyof typeof dirty.current,
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
    // The value just saved IS the canonical one now — safe to resync again.
    dirty.current[field] = false;
    toast(`${label} saved.`);
  };

  const row = (
    label: string,
    hint: string,
    value: string,
    onChange: (v: string) => void,
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
          onChange={(e) => onChange(e.target.value)}
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
        edit("weight", setWeight),
        () => log("weight", "weight", weight, 500, "weight"),
        "0.1",
      )}
      {row(
        "Sleep last night (hours)",
        "7.5",
        sleep,
        edit("sleep", setSleep),
        () => log("sleep-hours", "sleep", sleep, 24, "sleep"),
        "0.5",
      )}
      {row(
        "Energy today (1-10)",
        "7",
        energy,
        edit("energy", setEnergy),
        () => log("energy-level", "energy", energy, 10, "energy"),
        "1",
      )}
      <p className="text-xs text-slate-400">
        Sleep counts toward the day you woke up. Saving again replaces today's
        entry rather than adding another.
      </p>
    </div>
  );
}
