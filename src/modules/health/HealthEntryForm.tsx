import { localDateStr } from "../../lib/dates";
import { useState } from "react";
import { db, WEIGHT_BASELINE_KG } from "../../db/db";
import { Button } from "../../components/Button";
import { inputClass } from "../../components/inputStyles";

const todayStr = () => localDateStr();

export function HealthEntryForm() {
  const [weight, setWeight] = useState(String(WEIGHT_BASELINE_KG));
  const [energy, setEnergy] = useState("7");

  const logWeight = async () => {
    const value = parseFloat(weight);
    if (!value) return;
    await db.healthMetrics.add({
      date: todayStr(),
      metricType: "weight",
      value,
    } as never);
  };

  const logEnergy = async () => {
    const value = parseInt(energy, 10);
    if (!value) return;
    await db.healthMetrics.add({
      date: todayStr(),
      metricType: "energy-level",
      value,
    } as never);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="text-xs text-slate-500 dark:text-slate-400">
            Weight (kg)
          </label>
          <input
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            type="number"
            step="0.1"
            className={`w-full ${inputClass}`}
          />
        </div>
        <Button onClick={logWeight}>Log</Button>
      </div>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="text-xs text-slate-500 dark:text-slate-400">
            Energy Level (1-10)
          </label>
          <input
            value={energy}
            onChange={(e) => setEnergy(e.target.value)}
            type="number"
            min={1}
            max={10}
            className={`w-full ${inputClass}`}
          />
        </div>
        <Button onClick={logEnergy}>Log</Button>
      </div>
    </div>
  );
}
