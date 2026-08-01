import { useLiveQuery } from "dexie-react-hooks";
import { motion } from "framer-motion";
import { db } from "../../db/db";
import { Button } from "../../components/Button";
import { localDateStr } from "../../lib/dates";
import { quoteForDay } from "../../lib/quotes";
import { getRecommendation } from "../../lib/recommendations";
import { greeting } from "../../lib/coachMessages";
import { calcSafeToSpendToday, currentMonthKey } from "../finance/financeSummary";
import { isDueOn } from "../habits/habitStreaks";

/**
 * Shown once when the calendar date changes (gated by
 * appSettings.morningBriefShownDate in App.tsx). A ritual moment, not a
 * second interactive todo list — everything here is also visible
 * permanently on the Dashboard, assembled in one place for the first look
 * of the day.
 */
export function MorningBrief({ onDismiss }: { onDismiss: () => void }) {
  const now = new Date();
  const today = localDateStr(now);
  const monthKey = currentMonthKey(now);

  const habits = useLiveQuery(() => db.habits.toArray(), []) ?? [];
  const logs = useLiveQuery(() => db.habitLogs.toArray(), []) ?? [];
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? [];
  const goals = useLiveQuery(() => db.goals.toArray(), []) ?? [];
  const transactions = useLiveQuery(() => db.transactions.toArray(), []) ?? [];
  const budgets = useLiveQuery(() => db.budgets.toArray(), []) ?? [];

  const doneToday = new Set(
    logs.filter((l) => l.completed && l.date === today).map((l) => l.habitName),
  );
  const dueHabits = habits.filter((h) => !h.archived && isDueOn(h.schedule, now));
  const missionTotal = dueHabits.length + tasks.filter((t) => !t.done).length;
  const missionDone =
    dueHabits.filter((h) => doneToday.has(h.name)).length +
    tasks.filter((t) => t.done).length;

  const todayGoal = goals.find((g) => g.term === "today" && g.status === "active");
  const recommendation = getRecommendation({
    habits,
    logs,
    transactions,
    budgets,
    goals,
    monthKey,
    now,
  });
  const safe = calcSafeToSpendToday(transactions, budgets, monthKey, now);

  const startDay = async () => {
    await db.appSettings.update(1, { morningBriefShownDate: today });
    onDismiss();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-40 overflow-y-auto bg-slate-50 dark:bg-slate-900"
    >
      <div
        className="mx-auto flex min-h-full max-w-md flex-col justify-between p-6"
        style={{
          paddingTop: "calc(var(--sat) + 2rem)",
          paddingBottom: "calc(var(--sab) + 1.5rem)",
        }}
      >
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {greeting(now)}
            </h1>
            <p className="mt-2 text-sm italic text-slate-500 dark:text-slate-400">
              “{quoteForDay(now)}”
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-2xl bg-white/70 p-4 dark:bg-slate-800/60">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                Today's Mission
              </div>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                {missionTotal === 0
                  ? "Nothing scheduled — add a habit to build momentum."
                  : `${missionDone} of ${missionTotal} done so far`}
              </p>
            </div>

            <div className="rounded-2xl bg-white/70 p-4 dark:bg-slate-800/60">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                Today's Goal
              </div>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                {todayGoal ? `🎯 ${todayGoal.title}` : "Set today's goal."}
              </p>
            </div>

            {safe && (
              <div className="rounded-2xl bg-white/70 p-4 dark:bg-slate-800/60">
                <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                  Safe Spending Today
                </div>
                <p
                  className={`mt-1 text-sm font-semibold ${
                    safe.remaining >= 0 ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  ₹{safe.perDay.toLocaleString()} per day
                </p>
              </div>
            )}

            <div className="rounded-2xl bg-white/70 p-4 dark:bg-slate-800/60">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                One Priority
              </div>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                {recommendation.message}
              </p>
            </div>
          </div>
        </div>

        <Button onClick={startDay} className="mt-6 w-full">
          Start my day
        </Button>
      </div>
    </motion.div>
  );
}
