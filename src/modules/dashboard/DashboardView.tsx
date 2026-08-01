import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion } from "framer-motion";
import { db } from "../../db/db";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { ProgressRing } from "../../components/ProgressRing";
import { localDateStr } from "../../lib/dates";
import { calcLifeBalance, calcPillars } from "../../lib/lifePillars";
import { getRecommendation } from "../../lib/recommendations";
import { dailyCoachMessage, greeting } from "../../lib/coachMessages";
import { useSettingsUi } from "../../lib/settingsUi";
import { quoteForDay } from "../../lib/quotes";
import { calcSafeToSpendToday, currentMonthKey } from "../finance/financeSummary";
import { isDueOn } from "../habits/habitStreaks";
import { setHabitDone } from "../habits/habitActions";
import { TodayAgenda } from "./TodayAgenda";
import { BackupNudge } from "./BackupNudge";
import { PillarBar } from "./PillarBar";
import { QuickCapture } from "./QuickCapture";
import { AchievementsCard } from "../achievements/AchievementsCard";
import { WeeklyReviewCard } from "./WeeklyReviewCard";

export function DashboardView() {
  const [brainDump, setBrainDump] = useState("");
  const [saved, setSaved] = useState(false);
  const { open: openSettings } = useSettingsUi();

  const habits = useLiveQuery(() => db.habits.toArray(), []) ?? [];
  const logs = useLiveQuery(() => db.habitLogs.toArray(), []) ?? [];
  const transactions = useLiveQuery(() => db.transactions.toArray(), []) ?? [];
  const budgets = useLiveQuery(() => db.budgets.toArray(), []) ?? [];
  const goals = useLiveQuery(() => db.goals.toArray(), []) ?? [];
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? [];
  const healthMetrics = useLiveQuery(() => db.healthMetrics.toArray(), []) ?? [];
  const settings = useLiveQuery(() => db.appSettings.get(1), []);

  const now = new Date();
  const today = localDateStr(now);
  const monthKey = currentMonthKey(now);

  const pillars = calcPillars(
    habits,
    logs,
    transactions,
    budgets,
    monthKey,
    now,
    healthMetrics,
    settings?.bodyProfile,
  );
  const balance = calcLifeBalance(pillars);
  const coachLine = dailyCoachMessage(
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

  // Today's Mission: every due habit + every open task, as one list.
  const doneToday = new Set(
    logs.filter((l) => l.completed && l.date === today).map((l) => l.habitName),
  );
  const missionHabits = habits
    .filter((h) => !h.archived && isDueOn(h.schedule, now))
    .map((h) => ({
      key: `h${h.id}`,
      label: h.name,
      icon: h.icon,
      done: doneToday.has(h.name),
      toggle: () => setHabitDone(h.name, today, !doneToday.has(h.name)),
    }));
  const missionTasks = tasks
    .filter((t) => !t.done)
    .slice(0, 5)
    .map((t) => ({
      key: `t${t.id}`,
      label: t.title,
      icon: "☑️",
      done: false,
      toggle: () =>
        db.tasks.update(t.id, { done: true, completedAt: Date.now() }),
    }));
  const mission = [...missionHabits, ...missionTasks];
  const missionDone = mission.filter((m) => m.done).length;
  const missionComplete = mission.length > 0 && missionDone === mission.length;

  const pinned = habits.filter((h) => h.pinned && !h.archived).slice(0, 2);
  const todayGoal = goals.find((g) => g.term === "today" && g.status === "active");
  const quote = quoteForDay(now);
  const safe = calcSafeToSpendToday(transactions, budgets, monthKey, now);

  const saveBrainDump = async () => {
    const text = brainDump.trim();
    if (!text) return;
    await db.notes.add({
      title: `Brain Dump — ${new Date().toLocaleString()}`,
      body: text,
      tags: [],
      pinned: false,
      sensitive: false,
      createdAt: Date.now(),
    } as never);
    setBrainDump("");
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-start justify-between gap-3"
      >
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {greeting(now)}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {coachLine}
          </p>
        </div>
        {/* Settings lives on the page body, not the header — the header sits
            under the status bar and its targets were untappable. 44x44. */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={openSettings}
          aria-label="Settings"
          className="-mr-1 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-lg text-slate-400 transition-colors hover:bg-slate-200/60 hover:text-slate-600 dark:hover:bg-slate-700/60 dark:hover:text-slate-200"
        >
          ⚙️
        </motion.button>
      </motion.div>

      <BackupNudge />

      <p className="px-1 text-sm italic text-slate-500 dark:text-slate-400">
        “{quote}”
      </p>

      <Card title="Today's Mission" delay={0.02}>
        {mission.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nothing scheduled today. Add a habit to build momentum.
          </p>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>
                {missionDone} of {mission.length} done
              </span>
              {missionComplete && (
                <span className="font-bold text-emerald-500">
                  Mission Accomplished ✅
                </span>
              )}
            </div>
            <ul className="flex flex-col gap-2">
              {mission.map((m) => (
                <li key={m.key}>
                  <button
                    onClick={m.toggle}
                    aria-pressed={m.done}
                    className={`flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-colors ${
                      m.done
                        ? "bg-emerald-50 dark:bg-emerald-500/10"
                        : "bg-slate-50 dark:bg-slate-700/40"
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 text-xs ${
                        m.done
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-slate-300 dark:border-slate-500"
                      }`}
                    >
                      {m.done && "✓"}
                    </span>
                    <span className="text-base">{m.icon}</span>
                    <span
                      className={
                        m.done
                          ? "text-slate-400 line-through dark:text-slate-500"
                          : "text-slate-900 dark:text-white"
                      }
                    >
                      {m.label}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <Card title="Today's Goal" delay={0.03}>
        {todayGoal ? (
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
            🎯 {todayGoal.title}
          </p>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Set today's goal.
          </p>
        )}
      </Card>

      {safe && (
        <Card title="Safe Spending Today" delay={0.04}>
          <div className="flex items-baseline justify-between">
            <div
              className={`text-2xl font-extrabold tracking-tight ${
                safe.remaining >= 0 ? "text-emerald-500" : "text-red-500"
              }`}
            >
              ₹{safe.perDay.toLocaleString()}
            </div>
            <div className="text-right text-xs text-slate-500 dark:text-slate-400">
              ₹{safe.remaining.toLocaleString()} {safe.remaining >= 0 ? "left" : "over"} this month
            </div>
          </div>
        </Card>
      )}

      <Card title="One Priority Recommendation" delay={0.05}>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
          {recommendation.message}
        </p>
      </Card>

      <Card title="Life Balance" delay={0.06}>
        <div className="flex items-center gap-4">
          <ProgressRing percent={balance ?? 0} size={72} strokeWidth={7}>
            <span className="text-sm font-extrabold text-slate-700 dark:text-slate-100">
              {balance === null ? "—" : balance}
            </span>
          </ProgressRing>
          <div className="flex-1">
            <PillarBar scores={pillars} />
          </div>
        </div>
      </Card>

      {pinned.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {pinned.map((h) => {
            const done = doneToday.has(h.name);
            return (
              <motion.button
                key={h.id}
                onClick={() => setHabitDone(h.name, today, !done)}
                aria-pressed={done}
                whileTap={{ scale: 0.94 }}
                className={`relative overflow-hidden rounded-3xl p-5 text-center transition-colors ${
                  done
                    ? "text-slate-900 shadow-lg"
                    : "glass border border-white/60 bg-white/70 text-slate-400 dark:border-white/5 dark:bg-slate-800/60 dark:text-slate-500"
                }`}
                style={done ? { backgroundColor: h.color } : undefined}
              >
                <div className="text-2xl">{h.icon}</div>
                <div className="mt-1 text-base font-bold">{h.name}</div>
                <div className="text-xs font-medium opacity-80">
                  {done ? "Done today ✓" : "Tap to log"}
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      <Card title="Quick Brain Dump" delay={0.09}>
        <textarea
          value={brainDump}
          onChange={(e) => setBrainDump(e.target.value)}
          placeholder="Type anything — saves straight to Notes..."
          rows={3}
          className="w-full resize-none rounded-xl border border-slate-200 bg-white/50 p-2.5 text-slate-900 outline-none transition-colors focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 dark:border-slate-600 dark:bg-slate-900/30 dark:text-white"
        />
        <div className="mt-2 flex items-center justify-between">
          <AnimatePresence>
            {saved && (
              <motion.span
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-sm font-medium text-emerald-500"
              >
                Saved ✓
              </motion.span>
            )}
          </AnimatePresence>
          <Button
            onClick={saveBrainDump}
            disabled={!brainDump.trim()}
            className="ml-auto"
          >
            Save
          </Button>
        </div>
      </Card>

      <TodayAgenda />
      <WeeklyReviewCard
        habits={habits}
        logs={logs}
        transactions={transactions}
        tasks={tasks}
        goals={goals}
        healthMetrics={healthMetrics}
        profile={settings?.bodyProfile}
      />
      <AchievementsCard />
      <QuickCapture />
    </div>
  );
}
