import { useState } from "react";
import { motion } from "framer-motion";
import { db, type AlarmMission } from "../../db/db";
import { Button } from "../../components/Button";
import { inputClass } from "../../components/inputStyles";
import { requestNotificationPermission } from "../../lib/notify";
import { SoundPicker } from "./SoundPicker";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export function AlarmForm() {
  const [time, setTime] = useState("07:00");
  const [label, setLabel] = useState("");
  const [days, setDays] = useState<number[]>([]);
  const [mission, setMission] = useState<AlarmMission>("math");
  const [difficulty, setDifficulty] = useState(2);
  const [soundId, setSoundId] = useState<number | undefined>(undefined);

  const toggleDay = (d: number) =>
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );

  const add = async () => {
    if (!time) return;
    await requestNotificationPermission();
    await db.alarms.add({
      label: label.trim(),
      time,
      days,
      mission,
      difficulty,
      soundId,
      enabled: true,
      createdAt: Date.now(),
    } as never);
    setLabel("");
    setTime("07:00");
    setDays([]);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className={`${inputClass} text-lg font-semibold`}
        />
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (optional)"
          className={`flex-1 ${inputClass}`}
        />
      </div>

      <div>
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
          Repeat (none = one-off today)
        </div>
        <div className="flex gap-1.5">
          {WEEKDAYS.map((w, i) => (
            <button
              key={i}
              onClick={() => toggleDay(i)}
              className={`h-8 w-8 rounded-full text-xs font-bold transition-colors ${
                days.includes(i)
                  ? "bg-cyan-500 text-slate-900"
                  : "bg-slate-100 text-slate-400 dark:bg-slate-700/50"
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
          Dismiss mission
        </div>
        <div className="flex gap-2">
          {(
            [
              ["math", "🧮 Math"],
              ["memory", "🧠 Memory"],
            ] as [AlarmMission, string][]
          ).map(([val, lbl]) => (
            <button
              key={val}
              onClick={() => setMission(val)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                mission === val
                  ? "bg-cyan-500 text-slate-900"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400"
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1 flex justify-between text-[11px] font-semibold uppercase tracking-widest text-slate-400">
          <span>Difficulty</span>
          <span className="text-slate-600 dark:text-slate-300">
            {["Easy", "Medium", "Hard"][difficulty - 1]}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={3}
          value={difficulty}
          onChange={(e) => setDifficulty(Number(e.target.value))}
          className="w-full accent-cyan-500"
        />
      </div>

      <div>
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
          Alarm sound
        </div>
        <SoundPicker value={soundId} onChange={setSoundId} />
      </div>

      <motion.div whileTap={{ scale: 0.98 }}>
        <Button onClick={add} className="w-full">
          Add Alarm
        </Button>
      </motion.div>
    </div>
  );
}
