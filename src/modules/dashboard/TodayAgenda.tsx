import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import { Card } from "../../components/Card";

interface AgendaItem {
  key: string;
  time: string;
  label: string;
  icon: string;
  kind: string;
}

const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
};

export function TodayAgenda() {
  const alarms = useLiveQuery(() => db.alarms.toArray(), []) ?? [];
  const habits = useLiveQuery(() => db.habits.toArray(), []) ?? [];
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? [];
  const notes = useLiveQuery(() => db.notes.toArray(), []) ?? [];

  const weekday = new Date().getDay();
  const items: AgendaItem[] = [];

  for (const a of alarms) {
    if (!a.enabled) continue;
    if (a.days.length > 0 && !a.days.includes(weekday)) continue;
    items.push({
      key: `a${a.id}`,
      time: a.time,
      label: a.label || "Alarm",
      icon: "⏰",
      kind: "Alarm",
    });
  }
  for (const h of habits) {
    if (!h.reminderEnabled || !h.reminderTime || h.archived) continue;
    items.push({
      key: `h${h.id}`,
      time: h.reminderTime,
      label: h.name,
      icon: "✅",
      kind: "Habit",
    });
  }
  for (const t of tasks) {
    if (!t.reminderEnabled || !t.reminderTime || t.done) continue;
    items.push({
      key: `t${t.id}`,
      time: t.reminderTime,
      label: t.title,
      icon: "☑️",
      kind: "Task",
    });
  }
  for (const n of notes) {
    if (!n.reminderEnabled || !n.reminderTime) continue;
    items.push({
      key: `n${n.id}`,
      time: n.reminderTime,
      label: n.title,
      icon: "📝",
      kind: "Note",
    });
  }

  items.sort((a, b) => a.time.localeCompare(b.time));
  if (items.length === 0) return null;

  const now = nowHHMM();
  const upcoming = items.filter((i) => i.time >= now).length;

  return (
    <Card title="Today's Reminders" delay={0.12}>
      <div className="mb-2 text-xs text-slate-500 dark:text-slate-400">
        {upcoming} upcoming · {items.length} total today
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((item) => {
          const past = item.time < now;
          return (
            <li
              key={item.key}
              className={`flex items-center gap-3 rounded-xl px-2 py-1.5 ${
                past ? "opacity-45" : ""
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span className="w-12 flex-shrink-0 font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                {item.time}
              </span>
              <span className="flex-1 truncate text-sm text-slate-700 dark:text-slate-200">
                {item.label}
              </span>
              <span className="text-[10px] uppercase tracking-wide text-slate-400">
                {item.kind}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
