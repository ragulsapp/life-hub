import { useState } from "react";
import { motion } from "framer-motion";
import {
  db,
  HABIT_COLORS,
  HABIT_ICONS,
  type HabitSchedule,
} from "../../db/db";
import { Button } from "../../components/Button";
import { inputClass } from "../../components/inputStyles";

const todayStr = () => new Date().toISOString().slice(0, 10);
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"]; // index 0=Sun

type ScheduleType = "daily" | "weekdays" | "times-per-week";

export function HabitForm() {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(HABIT_ICONS[0]);
  const [color, setColor] = useState(HABIT_COLORS[0]);
  const [schedType, setSchedType] = useState<ScheduleType>("daily");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [perWeek, setPerWeek] = useState(3);
  const [expanded, setExpanded] = useState(false);

  const toggleDay = (d: number) =>
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );

  const reset = () => {
    setName("");
    setIcon(HABIT_ICONS[0]);
    setColor(HABIT_COLORS[0]);
    setSchedType("daily");
    setDays([1, 2, 3, 4, 5]);
    setPerWeek(3);
    setExpanded(false);
  };

  const addHabit = async () => {
    const habitName = name.trim();
    if (!habitName) return;
    const exists = await db.habits.where("name").equals(habitName).first();
    if (exists) {
      alert("A habit with that name already exists.");
      return;
    }

    let schedule: HabitSchedule;
    if (schedType === "daily") schedule = { type: "daily" };
    else if (schedType === "weekdays")
      schedule = { type: "weekdays", days: days.length ? days : [1] };
    else schedule = { type: "times-per-week", target: perWeek };

    await db.habits.add({
      name: habitName,
      color,
      icon,
      schedule,
      archived: false,
      createdAt: Date.now(),
    } as never);

    // Also create today's log row so it appears immediately.
    const today = todayStr();
    const existing = await db.habitLogs
      .where({ date: today, habitName })
      .first();
    if (!existing) {
      await db.habitLogs.add({
        date: today,
        habitName,
        completed: false,
      } as never);
    }
    reset();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-xl"
          style={{ backgroundColor: color + "22" }}
        >
          {icon}
        </button>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onFocus={() => setExpanded(true)}
          onKeyDown={(e) => e.key === "Enter" && addHabit()}
          placeholder="New habit name..."
          className={`flex-1 ${inputClass}`}
        />
        <Button onClick={addHabit} disabled={!name.trim()}>
          Add
        </Button>
      </div>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="flex flex-col gap-3 overflow-hidden"
        >
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              Icon
            </div>
            <div className="flex flex-wrap gap-1.5">
              {HABIT_ICONS.map((ic) => (
                <button
                  key={ic}
                  onClick={() => setIcon(ic)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-transform ${
                    icon === ic
                      ? "scale-110 bg-slate-200 dark:bg-slate-600"
                      : "bg-slate-100 dark:bg-slate-700/50"
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              Color
            </div>
            <div className="flex flex-wrap gap-2">
              {HABIT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full transition-transform ${
                    color === c ? "scale-110 ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-800" : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              Schedule
            </div>
            <div className="mb-2 flex gap-2">
              {(
                [
                  ["daily", "Daily"],
                  ["weekdays", "Days"],
                  ["times-per-week", "Weekly"],
                ] as [ScheduleType, string][]
              ).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setSchedType(val)}
                  className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors ${
                    schedType === val
                      ? "bg-cyan-500 text-slate-900"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {schedType === "weekdays" && (
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
            )}

            {schedType === "times-per-week" && (
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input
                  type="range"
                  min={1}
                  max={7}
                  value={perWeek}
                  onChange={(e) => setPerWeek(Number(e.target.value))}
                  className="flex-1 accent-cyan-500"
                />
                <span className="w-20 font-semibold">{perWeek}× / week</span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
