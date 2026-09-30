import { useState } from "react";
import { motion } from "framer-motion";
import {
  db,
  DEFAULT_REMINDER_SOUND,
  type AlarmMission,
} from "../../db/db";
import { Button } from "../../components/Button";
import { inputClass } from "../../components/inputStyles";
import { requestNotificationPermission } from "../../lib/notify";
import { reminderCreationGuard } from "../../lib/reminderLogic";
import { SoundPicker, type SoundSelection } from "./SoundPicker";
import { TimeField } from "../../components/DateTimeField";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** One definition, so every section heading in this form matches. */
const sectionLabel =
  "mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500";

export function AlarmForm() {
  const [time, setTime] = useState("07:00");
  const [label, setLabel] = useState("");
  const [days, setDays] = useState<number[]>([]);
  const [mission, setMission] = useState<AlarmMission>("math");
  const [difficulty, setDifficulty] = useState(2);
  const [sound, setSound] = useState<SoundSelection>({
    builtInSound: DEFAULT_REMINDER_SOUND,
  });

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
      soundId: sound.soundId,
      builtInSound: sound.builtInSound,
      enabled: true,
      // If the time already passed today, arm for the next occurrence
      // instead of ringing the moment it's created.
      lastFiredDate: reminderCreationGuard(time),
      createdAt: Date.now(),
    } as never);
    setLabel("");
    setTime("07:00");
    setDays([]);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* The time is the subject of an alarm, so it is the headline rather
          than one of two equal boxes sharing a row. */}
      <TimeField label="Ring at" size="lg" value={time} onCommit={setTime} />

      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Label (optional)"
        className={`h-12 ${inputClass}`}
      />

      <div>
        <div className={sectionLabel}>Repeat</div>
        {/* Was h-8 w-8 — 32px, under the 44px minimum, on the control people
            tap most in this form. */}
        <div className="flex justify-between gap-1">
          {WEEKDAYS.map((w, i) => (
            <button
              key={i}
              onClick={() => toggleDay(i)}
              aria-pressed={days.includes(i)}
              aria-label={DAY_NAMES[i]}
              className={`h-11 w-11 rounded-full text-[13px] font-semibold transition-colors ${
                days.includes(i)
                  ? "bg-cyan-500 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10"
              }`}
            >
              {w}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
          {days.length === 0
            ? "One-off — rings once, today."
            : `Every ${days.map((d) => DAY_NAMES[d]).join(", ")}.`}
        </p>
      </div>

      <div>
        <div className={sectionLabel}>To dismiss</div>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["math", "Math", "Solve a sum"],
              ["memory", "Memory", "Repeat a pattern"],
            ] as [AlarmMission, string, string][]
          ).map(([val, lbl, desc]) => (
            <button
              key={val}
              onClick={() => setMission(val)}
              aria-pressed={mission === val}
              className={`rounded-2xl border p-3 text-left transition-colors ${
                mission === val
                  ? "border-cyan-400/50 bg-cyan-500/10"
                  : "border-slate-200 hover:border-slate-300 dark:border-white/10 dark:hover:border-white/20"
              }`}
            >
              <div
                className={`text-sm font-semibold ${
                  mission === val
                    ? "text-cyan-600 dark:text-cyan-300"
                    : "text-slate-700 dark:text-slate-200"
                }`}
              >
                {lbl}
              </div>
              <div className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                {desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className={`${sectionLabel} flex justify-between`}>
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
          className="h-11 w-full accent-cyan-500"
        />
      </div>

      <div>
        <div className={sectionLabel}>Alarm sound</div>
        <SoundPicker value={sound} onChange={setSound} />
      </div>

      <motion.div whileTap={{ scale: 0.98 }}>
        <Button onClick={add} className="w-full">
          Add Alarm
        </Button>
      </motion.div>
    </div>
  );
}
