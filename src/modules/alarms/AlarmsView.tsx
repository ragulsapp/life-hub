import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion } from "framer-motion";
import { db, type Alarm } from "../../db/db";
import { Card } from "../../components/Card";
import { AlarmForm } from "./AlarmForm";
import { TaskList } from "./TaskList";
import { useScheduler } from "../../lib/scheduler";
import {
  notificationPermission,
  requestNotificationPermission,
} from "../../lib/notify";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function repeatLabel(days: number[]): string {
  if (days.length === 0) return "One-off";
  if (days.length === 7) return "Every day";
  if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d)))
    return "Weekdays";
  return days
    .slice()
    .sort()
    .map((d) => DAY_NAMES[d])
    .join(", ");
}

export function AlarmsView() {
  const alarms = useLiveQuery(() => db.alarms.toArray(), []) ?? [];
  const { ringNow } = useScheduler();
  const sorted = [...alarms].sort((a, b) => a.time.localeCompare(b.time));

  const perm = notificationPermission();

  const toggle = (a: Alarm) =>
    db.alarms.update(a.id, {
      enabled: !a.enabled,
      lastFiredDate: undefined,
    });
  const remove = (id: number) => db.alarms.delete(id);

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        Alarms &amp; Tasks
      </h1>

      <div className="rounded-2xl bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
        Alarms &amp; reminders fire while the app is open (or just backgrounded).
        A web app can't wake a locked phone like a native alarm — keep Life Hub
        open overnight for the wake-up mission to ring.
        {perm !== "granted" && (
          <button
            onClick={requestNotificationPermission}
            className="ml-1 font-semibold underline"
          >
            Enable notifications
          </button>
        )}
      </div>

      <Card title="New Alarm">
        <AlarmForm />
      </Card>

      <div className="flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {sorted.map((a) => (
            <motion.div
              key={a.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
            >
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span
                        className={`text-3xl font-extrabold tabular-nums ${
                          a.enabled
                            ? "text-slate-900 dark:text-white"
                            : "text-slate-400 dark:text-slate-500"
                        }`}
                      >
                        {a.time}
                      </span>
                      <span className="text-xs text-slate-400">
                        {a.mission === "math" ? "🧮" : "🧠"}{" "}
                        {["Easy", "Medium", "Hard"][a.difficulty - 1]}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {a.label ? `${a.label} · ` : ""}
                      {repeatLabel(a.days)}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => ringNow(a)}
                      className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-700/50 dark:text-slate-300"
                      title="Preview this alarm now"
                    >
                      Ring now
                    </button>
                    <button
                      onClick={() => toggle(a)}
                      className={`relative h-6 w-11 rounded-full transition-colors ${
                        a.enabled
                          ? "bg-emerald-500"
                          : "bg-slate-300 dark:bg-slate-600"
                      }`}
                    >
                      <motion.span
                        layout
                        className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow"
                        animate={{ left: a.enabled ? 22 : 2 }}
                      />
                    </button>
                    <button
                      onClick={() => remove(a.id)}
                      className="text-xs text-slate-300 hover:text-red-500 dark:text-slate-600"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
        {sorted.length === 0 && (
          <div className="text-sm text-slate-500 dark:text-slate-400">
            No alarms yet — add one above and hit “Ring now” to try the mission.
          </div>
        )}
      </div>

      <Card title="Tasks" delay={0.05}>
        <TaskList />
      </Card>
    </div>
  );
}
