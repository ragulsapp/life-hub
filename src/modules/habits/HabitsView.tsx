import { localDateStr } from "../../lib/dates";
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion } from "framer-motion";
import { db, type Habit } from "../../db/db";
import { Card } from "../../components/Card";
import { TimeField } from "../../components/DateTimeField";
import {
  BellIcon,
  CheckIcon,
  FlameIcon,
  PinIcon,
  TargetIcon,
  TrophyIcon,
} from "../../components/Icons";
import { DeleteButton } from "../../components/IconButton";
import { ProgressRing } from "../../components/ProgressRing";
import { HabitHistoryRow } from "./HabitHistoryRow";
import { HabitHeatmap } from "./HabitHeatmap";
import {
  cancelReminder,
  habitNotifId,
  requestNotificationPermission,
  scheduleDailyReminder,
} from "../../lib/notify";
import { reminderCreationGuard } from "../../lib/reminderLogic";
import { deleteHabit, setHabitDone, togglePinned } from "./habitActions";
import { EmptyState } from "../../components/EmptyState";
import {
  calcBestStreak,
  calcCompletionRate,
  calcHeatmap,
  calcRecentDays,
  calcStreak,
  calcWeekCompletions,
  isDueOn,
  scheduleLabel,
} from "./habitStreaks";

const todayStr = () => localDateStr();

function HabitCard({
  habit,
  allLogs,
  index,
}: {
  habit: Habit;
  allLogs: import("../../db/db").HabitLog[];
  index: number;
}) {
  const today = todayStr();
  const [showHeatmap, setShowHeatmap] = useState(false);

  const todayLog = allLogs.find(
    (l) => l.date === today && l.habitName === habit.name,
  );
  const dueToday = isDueOn(habit.schedule, new Date());
  const completed = !!todayLog?.completed;

  const streak = calcStreak(allLogs, habit.name);
  const best = calcBestStreak(allLogs, habit.name);
  const rate = calcCompletionRate(allLogs, habit.name, 30);
  const recentDays = calcRecentDays(allLogs, habit.name, 7);
  const heatmap = calcHeatmap(allLogs, habit.name, 12);

  const weeklyTarget =
    habit.schedule.type === "times-per-week" ? habit.schedule.target : 0;
  const weekDone = weeklyTarget ? calcWeekCompletions(allLogs, habit.name) : 0;

  const setDate = (date: string, isDone: boolean) =>
    setHabitDone(habit.name, date, !isDone);

  const toggleToday = () => setDate(today, completed);

  const removeHabit = async () => {
    if (!confirm(`Delete "${habit.name}" and all its history?`)) return;
    await deleteHabit(habit.name);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: index * 0.03 }}
    >
      <Card className={dueToday ? "" : "opacity-70"}>
        <div className="flex items-start justify-between">
          <button
            onClick={dueToday ? toggleToday : undefined}
            className="flex min-h-11 flex-1 items-start gap-3 text-left"
          >
            <span
              className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-lg"
              style={{ backgroundColor: habit.color + "22" }}
            >
              {habit.icon}
            </span>
            <div className="min-w-0">
              <div
                className={`font-semibold ${
                  completed
                    ? "text-slate-500 line-through dark:text-slate-400"
                    : "text-slate-900 dark:text-white"
                }`}
              >
                {habit.name}
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                <span>{scheduleLabel(habit.schedule)}</span>
                <span className="inline-flex items-center gap-1">
                  <FlameIcon size={12} />
                  {streak}
                </span>
                <span className="inline-flex items-center gap-1">
                  <TrophyIcon size={12} />
                  {best}
                </span>
                <span>{rate}%/30d</span>
              </div>
            </div>
          </button>

          <div className="ml-2 flex flex-col items-end gap-1">
            {dueToday ? (
              <motion.button
                onClick={toggleToday}
                aria-label={`Mark "${habit.name}" ${completed ? "not done" : "done"} today`}
                aria-pressed={completed}
                whileTap={{ scale: 0.85 }}
                animate={{ scale: completed ? 1.05 : 1 }}
                className="flex h-11 w-11 items-center justify-center"
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors"
                  style={{
                    borderColor: completed ? habit.color : undefined,
                    backgroundColor: completed ? habit.color : undefined,
                    color: completed ? "#0f172a" : undefined,
                  }}
                >
                  {completed && <CheckIcon size={15} />}
                </span>
              </motion.button>
            ) : (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-caption font-medium text-slate-500 dark:bg-slate-700/50 dark:text-slate-400">
                Rest day
              </span>
            )}
            <button
              onClick={() => togglePinned(habit)}
              className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors hover:bg-cyan-500/10 ${
                habit.pinned
                  ? "text-cyan-500 dark:text-cyan-300"
                  : "text-slate-300 hover:text-cyan-500 dark:text-slate-600"
              }`}
              title={
                habit.pinned
                  ? "Stop showing first in today's mission"
                  : "Show first in today's mission"
              }
              aria-label={`${
                habit.pinned ? "Stop showing" : "Show"
              } "${habit.name}" first in today's mission`}
              aria-pressed={!!habit.pinned}
            >
              <PinIcon size={15} on={!!habit.pinned} />
            </button>
            <DeleteButton
              onDelete={removeHabit}
              label={`Delete habit "${habit.name}"`}
            />
          </div>
        </div>

        {weeklyTarget > 0 && (
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>This week</span>
              <span className="font-semibold">
                {weekDone}/{weeklyTarget}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700/50">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: habit.color }}
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.min(100, (weekDone / weeklyTarget) * 100)}%`,
                }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        )}

        <div className="mt-3 border-t border-slate-200/70 pt-3 dark:border-slate-600/40">
          {showHeatmap ? (
            <HabitHeatmap
              columns={heatmap}
              color={habit.color}
              onToggle={setDate}
            />
          ) : (
            <HabitHistoryRow days={recentDays} onToggle={setDate} />
          )}
          <div className="mt-2 flex items-center justify-between">
            <button
              onClick={() => setShowHeatmap((v) => !v)}
              className="-ml-2 inline-flex h-11 items-center rounded-xl px-2 text-caption font-medium text-cyan-500 transition-colors hover:bg-cyan-500/10 dark:text-cyan-400"
            >
              {showHeatmap ? "Show week" : "Show 12-week heatmap"}
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  const time = habit.reminderTime ?? "09:00";
                  if (!habit.reminderEnabled) {
                    await requestNotificationPermission();
                    await scheduleDailyReminder(
                      habitNotifId(habit.id),
                      "Habit reminder",
                      `Time for: ${habit.name}`,
                      time,
                    );
                  } else {
                    await cancelReminder(habitNotifId(habit.id));
                  }
                  db.habits.update(habit.id, {
                    reminderEnabled: !habit.reminderEnabled,
                    reminderTime: time,
                    lastReminderDate: reminderCreationGuard(time),
                  });
                }}
                className={`flex h-11 items-center gap-1.5 rounded-full px-3 text-caption font-semibold transition-colors ${
                  habit.reminderEnabled
                    ? "bg-cyan-500/12 text-cyan-600 dark:text-cyan-300"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-500/10 hover:text-cyan-500 dark:hover:text-cyan-300"
                }`}
              >
                <BellIcon on={habit.reminderEnabled} />
                {habit.reminderEnabled
                  ? (habit.reminderTime ?? "09:00")
                  : "Remind me"}
              </button>
            </div>
          </div>

          {/* The time sits on its own row rather than crushed beside the
              toggle. It used to be a 22px-tall, 11px-type input wedged into
              that row — under half the minimum touch target, which is why it
              could not be changed. */}
          {habit.reminderEnabled && (
            <div className="mt-3 border-t border-slate-200/70 pt-3 dark:border-white/5">
              <TimeField
                label="Remind me at"
                value={habit.reminderTime ?? "09:00"}
                onCommit={async (time) => {
                  await scheduleDailyReminder(
                    habitNotifId(habit.id),
                    "Habit reminder",
                    `Time for: ${habit.name}`,
                    time,
                  );
                  db.habits.update(habit.id, {
                    reminderTime: time,
                    lastReminderDate: reminderCreationGuard(time),
                  });
                }}
              />
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

export function HabitsView() {
  const today = todayStr();
  const habits =
    useLiveQuery(
      () => db.habits.filter((h) => !h.archived).toArray(),
      [],
    ) ?? [];
  const allLogs = useLiveQuery(() => db.habitLogs.toArray(), []) ?? [];

  // Ensure every habit due today has a log row so completion state persists.
  useEffect(() => {
    if (habits.length === 0) return;
    (async () => {
      for (const habit of habits) {
        if (!isDueOn(habit.schedule, new Date())) continue;
        const existing = await db.habitLogs
          .where({ date: today, habitName: habit.name })
          .first();
        if (!existing) {
          await db.habitLogs.add({
            date: today,
            habitName: habit.name,
            completed: false,
          } as never);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habits.map((h) => h.name).join("|"), today]);

  const dueHabits = habits.filter((h) => isDueOn(h.schedule, new Date()));
  const doneCount = dueHabits.filter((h) =>
    allLogs.some(
      (l) => l.date === today && l.habitName === h.name && l.completed,
    ),
  ).length;
  const totalDue = dueHabits.length;
  const todayPercent = totalDue ? (doneCount / totalDue) * 100 : 0;

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <div className="flex items-center justify-between">
        <span className="text-caption font-semibold text-slate-500 dark:text-slate-400">
          {totalDue > 0 ? "Today" : ""}
        </span>
        {totalDue > 0 && (
          <ProgressRing percent={todayPercent} size={56} strokeWidth={5}>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {doneCount}/{totalDue}
            </span>
          </ProgressRing>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {habits.map((habit, i) => (
            <HabitCard
              key={habit.name}
              habit={habit}
              allLogs={allLogs}
              index={i}
            />
          ))}
        </AnimatePresence>
        {habits.length === 0 && (
          <EmptyState
            icon={<TargetIcon size={30} />}
            title="No habits yet"
            hint="Start with one you could do on your worst day. Tap + to add it."
          />
        )}
      </div>
    </div>
  );
}
