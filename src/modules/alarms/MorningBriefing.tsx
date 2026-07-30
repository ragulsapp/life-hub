import { useLiveQuery } from "dexie-react-hooks";
import { motion } from "framer-motion";
import { db } from "../../db/db";
import { localDateStr } from "../../lib/dates";
import { currentMonthKey } from "../finance/financeSummary";
import { dailyCoachMessage } from "../../lib/coachMessages";
import { getRecommendation } from "../../lib/recommendations";
import { calcWakeStreak, wakeLine } from "../../lib/wakeStreak";
import { isDueOn } from "../habits/habitStreaks";

/**
 * Shown the moment the wake-up mission is beaten, before handing the user back
 * to the app. The reward for getting up isn't just silence — it's knowing what
 * today looks like while you're still standing next to the bed.
 *
 * Everything here is already-computed local data: same coach line and single
 * recommendation the Dashboard uses, so there's one voice and one call to action.
 */
export function MorningBriefing({
  minutesLate,
  onDone,
}: {
  minutesLate: number;
  onDone: () => void;
}) {
  const habits = useLiveQuery(() => db.habits.toArray(), []) ?? [];
  const logs = useLiveQuery(() => db.habitLogs.toArray(), []) ?? [];
  const transactions = useLiveQuery(() => db.transactions.toArray(), []) ?? [];
  const budgets = useLiveQuery(() => db.budgets.toArray(), []) ?? [];
  const goals = useLiveQuery(() => db.goals.toArray(), []) ?? [];
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? [];
  const wakeLogs = useLiveQuery(() => db.wakeLogs.toArray(), []) ?? [];

  const now = new Date();
  const today = localDateStr(now);
  const monthKey = currentMonthKey(now);

  const streak = calcWakeStreak(wakeLogs, now);
  const coach = dailyCoachMessage(
    habits,
    logs,
    transactions,
    budgets,
    monthKey,
    now,
  );
  const recommendation = getRecommendation({
    habits,
    logs,
    transactions,
    budgets,
    goals,
    monthKey,
    now,
  });

  const doneToday = new Set(
    logs.filter((l) => l.completed && l.date === today).map((l) => l.habitName),
  );
  const dueToday = habits.filter(
    (h) => !h.archived && isDueOn(h.schedule, now),
  );
  const left = dueToday.filter((h) => !doneToday.has(h.name)).length;
  const openTasks = tasks.filter((t) => !t.done).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex w-full max-w-sm flex-col gap-5"
    >
      <div className="text-center">
        <div className="text-5xl">🌅</div>
        <div className="mt-3 text-3xl font-extrabold text-white">
          {streak > 0 ? `${streak}-morning streak` : "You're up"}
        </div>
        <p className="mt-1.5 text-sm text-white/60">
          {wakeLine(streak, minutesLate)}
        </p>
      </div>

      <div className="rounded-3xl bg-white/5 p-5 backdrop-blur">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-cyan-300/70">
          Your morning
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-white/85">{coach}</p>

        <div className="mt-4 flex gap-6 border-t border-white/10 pt-4">
          <div>
            <div className="text-2xl font-bold text-white">{left}</div>
            <div className="text-[11px] text-white/50">
              {left === 1 ? "habit left" : "habits left"}
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{openTasks}</div>
            <div className="text-[11px] text-white/50">
              {openTasks === 1 ? "open task" : "open tasks"}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-5">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-cyan-300/70">
          Start with this
        </div>
        <p className="mt-1.5 text-sm font-medium leading-relaxed text-white">
          {recommendation.message}
        </p>
      </div>

      <button
        onClick={onDone}
        className="w-full rounded-2xl bg-cyan-500 py-3.5 text-base font-bold text-slate-900"
      >
        Start my day
      </button>
    </motion.div>
  );
}
