import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion } from "framer-motion";
import { db, type Alarm } from "../../db/db";
import { Card } from "../../components/Card";
import { BellIcon, CalendarIcon } from "../../components/Icons";
import { AlarmForm } from "./AlarmForm";
import { TaskList } from "./TaskList";
import { WakeHistory } from "./WakeHistory";
import { PlanTomorrowPanel } from "./PlanTomorrowPanel";
import { useScheduler } from "../../lib/scheduler";
import { reminderCreationGuard } from "../../lib/reminderLogic";
import {
  notificationPermission,
  requestNotificationPermission,
} from "../../lib/notify";
import {
  calcBestWakeStreak,
  calcWakeStreak,
  onTimeRate,
} from "../../lib/wakeStreak";

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
  const wakeLogs = useLiveQuery(() => db.wakeLogs.toArray(), []) ?? [];
  const { ringNow } = useScheduler();
  const sorted = [...alarms].sort((a, b) => a.time.localeCompare(b.time));

  const streak = calcWakeStreak(wakeLogs);
  const best = calcBestWakeStreak(wakeLogs);
  const punctual = onTimeRate(wakeLogs);

  const [perm, setPerm] = useState<"granted" | "denied" | "default">(
    "default",
  );
  const [planTomorrowOpen, setPlanTomorrowOpen] = useState(false);
  useEffect(() => {
    notificationPermission().then(setPerm);
  }, []);
  const enableNotifications = async () => {
    setPerm(await requestNotificationPermission());
  };

  const toggle = (a: Alarm) =>
    db.alarms.update(a.id, {
      enabled: !a.enabled,
      // Re-enabling an alarm whose time passed today arms it for the next
      // occurrence rather than ringing immediately.
      lastFiredDate: a.enabled ? a.lastFiredDate : reminderCreationGuard(a.time),
    });
  const remove = (id: number) => db.alarms.delete(id);

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        Alarms &amp; Tasks
      </h1>

      <div className="rounded-2xl bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
        Habit, task, and note reminders now fire from the system even with
        the app fully closed. The wake-up <em>mission</em> itself still needs
        Life Mentor open (or freshly backgrounded) — solving a puzzle to
        dismiss it means the app has to actually be running.
        {perm !== "granted" && (
          <button
            onClick={enableNotifications}
            className="ml-1 font-semibold underline"
          >
            Enable notifications
          </button>
        )}
      </div>

      {wakeLogs.length > 0 && (
        <Card title="Wake-Up Streak">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-500/20">
              <span className="text-xl font-extrabold text-amber-500">
                {streak}
              </span>
              <span className="text-[9px] font-medium text-amber-600/70 dark:text-amber-400/70">
                {streak === 1 ? "DAY" : "DAYS"}
              </span>
            </div>
            <div className="min-w-0 flex-1 text-sm">
              <div className="font-semibold text-slate-900 dark:text-white">
                {streak > 0
                  ? "Mornings you beat the mission"
                  : "Streak broken — the next one starts tomorrow"}
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-500 dark:text-slate-400">
                <span>🏆 Best {best}</span>
                {punctual !== null && <span>⏱️ {punctual}% on time</span>}
              </div>
            </div>
          </div>
          <div className="mt-4 border-t border-slate-200/70 pt-4 dark:border-slate-600/40">
            <WakeHistory logs={wakeLogs} />
          </div>
        </Card>
      )}

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
              <Card className={a.enabled ? "" : "opacity-60"}>
                {/* Time leads, everything else is secondary to it. A disabled
                    alarm dims as a whole rather than only greying its digits,
                    so its state reads without comparing two shades. */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div
                      className={`text-[34px] font-semibold leading-none tracking-tight tabular-nums ${
                        a.enabled
                          ? "text-slate-900 dark:text-white"
                          : "text-slate-400 dark:text-slate-500"
                      }`}
                    >
                      {a.time}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                      {a.label && (
                        <span className="font-medium text-slate-700 dark:text-slate-200">
                          {a.label}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <CalendarIcon size={12} />
                        {repeatLabel(a.days)}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium dark:bg-white/5">
                        {a.mission === "math" ? "Math" : "Memory"} ·{" "}
                        {["Easy", "Medium", "Hard"][a.difficulty - 1]}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => toggle(a)}
                    aria-label={`${a.enabled ? "Disable" : "Enable"} ${a.time} alarm`}
                    aria-pressed={a.enabled}
                    // A switch looks 28px tall but must still be a 44px target, so the
                    // visible track is drawn inside a larger transparent button.
                    className="relative flex h-11 w-12 flex-shrink-0 items-center justify-center"
                  >
                    <span
                      className={`block h-7 w-12 rounded-full transition-colors ${
                        a.enabled ? "bg-cyan-500" : "bg-slate-300 dark:bg-slate-600"
                      }`}
                    />
                    <motion.span
                      layout
                      className="absolute h-6 w-6 rounded-full bg-white shadow"
                      animate={{ left: a.enabled ? 22 : 2 }}
                    />
                  </button>
                </div>

                {/* Actions on their own row: both were well under the minimum
                    touch target while crowded against the toggle, and the
                    delete was a bare ✕ at 12px. */}
                <div className="mt-3 flex gap-2 border-t border-slate-200/70 pt-3 dark:border-white/5">
                  <button
                    onClick={() => ringNow(a)}
                    className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-100 text-[12px] font-semibold text-slate-600 transition-colors hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                  >
                    <BellIcon size={13} on />
                    Preview
                  </button>
                  <button
                    onClick={() => remove(a.id)}
                    aria-label={`Delete ${a.time} alarm`}
                    className="h-11 rounded-xl px-4 text-[12px] font-semibold text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-500"
                  >
                    Delete
                  </button>
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

      <Card title="Plan Tomorrow" delay={0.04}>
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
          Lay out tomorrow's tasks tonight — also opens automatically from the
          Night Reminder notification.
        </p>
        <button
          onClick={() => setPlanTomorrowOpen(true)}
          className="w-full rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:bg-slate-700/60 dark:text-slate-100"
        >
          Plan tomorrow
        </button>
      </Card>

      <Card title="Tasks" delay={0.05}>
        <TaskList />
      </Card>

      {planTomorrowOpen && (
        <PlanTomorrowPanel onClose={() => setPlanTomorrowOpen(false)} />
      )}
    </div>
  );
}
