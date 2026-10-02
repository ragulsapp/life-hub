import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion } from "framer-motion";
import { db, PILLAR_META } from "../../db/db";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { AuraOrb } from "../../components/AuraOrb";
import { localDateStr } from "../../lib/dates";
import { calcLifeBalance, calcPillars } from "../../lib/lifePillars";
import { getRecommendation } from "../../lib/recommendations";
import { dailyCoachMessage, greeting } from "../../lib/coachMessages";
import { useSettingsUi } from "../../lib/settingsUi";
import { useDraft } from "../../lib/useDraft";
import { calcSafeToSpendToday, currentMonthKey } from "../finance/financeSummary";
import { isDueOn } from "../habits/habitStreaks";
import { setHabitDone } from "../habits/habitActions";
import { TodayAgenda } from "./TodayAgenda";
import { BackupNudge } from "./BackupNudge";
import { PillarBar } from "./PillarBar";
import { AchievementsCard } from "../achievements/AchievementsCard";
import { WeeklyReviewCard } from "./WeeklyReviewCard";
import {
  CheckIcon,
  CheckSquareIcon,
  SearchIcon,
  SettingsIcon,
  TargetIcon,
} from "../../components/Icons";

export function DashboardView() {
  // Persisted: switching tabs unmounts this view, which used to silently
  // destroy whatever had been typed here.
  const [brainDump, setBrainDump, clearBrainDump] = useDraft("brainDump", "");
  const [saved, setSaved] = useState(false);
  // Which pillar the orb is focused on, if any. Tapping the same one again
  // clears it and the orb returns to the blended overall balance.
  const [focusPillar, setFocusPillar] = useState<{
    pillar: string;
    colour: string;
  } | null>(null);
  const { open: openSettings, openSearch } = useSettingsUi();

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
    // Pinned first — that is what pinning means now that the duplicate tile
    // grid below is gone.
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned))
    .map((h) => ({
      key: `h${h.id}`,
      label: h.name,
      icon: <span className="text-base">{h.icon}</span>,
      done: doneToday.has(h.name),
      toggle: () => setHabitDone(h.name, today, !doneToday.has(h.name)),
    }));
  const missionTasks = tasks
    .filter((t) => !t.done)
    .slice(0, 5)
    .map((t) => ({
      key: `t${t.id}`,
      label: t.title,
      icon: <CheckSquareIcon size={16} />,
      done: false,
      toggle: () =>
        db.tasks.update(t.id, { done: true, completedAt: Date.now() }),
    }));
  const mission = [...missionHabits, ...missionTasks];
  const missionDone = mission.filter((m) => m.done).length;
  const missionComplete = mission.length > 0 && missionDone === mission.length;

  // The orb shows one pillar's score while that pillar is focused, otherwise
  // the blended balance. Derived rather than stored so it can never drift.
  const focused = focusPillar
    ? (pillars.find((p) => p.pillar === focusPillar.pillar) ?? null)
    : null;
  const orbScore = focused ? focused.score : balance;

  const todayGoal = goals.find((g) => g.term === "today" && g.status === "active");
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
    clearBrainDump("");
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
          <p className="mb-1 text-caption font-semibold text-slate-500 dark:text-slate-400">
            {now.toLocaleDateString(undefined, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          <h1 className="text-title text-slate-900 dark:text-white">
            {greeting(now)}
          </h1>
        </div>
        {/* Settings and Search live on the page body, not the header — the
            header sits under the status bar and its targets were
            untappable. Both 44x44. */}
        <div className="-mr-1 flex flex-shrink-0 items-center gap-1">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={openSearch}
            aria-label="Search"
            className="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-200/60 hover:text-slate-600 dark:hover:bg-slate-700/60 dark:hover:text-slate-200"
          >
            <SearchIcon size={19} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={openSettings}
            aria-label="Settings"
            className="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-200/60 hover:text-slate-600 dark:hover:bg-slate-700/60 dark:hover:text-slate-200"
          >
            <SettingsIcon size={19} />
          </motion.button>
        </div>
      </motion.div>

      {/* The orb is the hero, not a widget inside a card — it is the first
          thing the eye lands on and the surface the assistant will live on
          later. The coach line sits directly beneath it, which is what makes
          it read as the app speaking rather than a caption. */}
      <div className="-mt-2 flex flex-col items-center">
        <AuraOrb
          score={orbScore}
          focus={focusPillar?.colour}
          label={focused ? PILLAR_META[focused.pillar].label : "Balance"}
        />
        <p className="-mt-2 max-w-[272px] text-center text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {coachLine}
        </p>
      </div>

      {/* The one card that answers "what do I do now".
          It absorbed two neighbours that were doing the same job in their own
          boxes: "Today's goal" (the outcome you chose) and "Start here" (the
          outcome we suggest). Three cards saying three halves of one thought
          is why nothing on this screen used to look more important than
          anything else. */}
      <Card title="Today's mission" delay={0.02}>
        {todayGoal && (
          <p className="mb-3 flex items-start gap-1.5 border-b border-slate-200/70 pb-3 text-sm font-medium text-slate-800 dark:border-white/5 dark:text-slate-100">
            <TargetIcon
              size={15}
              className="mt-0.5 flex-shrink-0 text-cyan-500 dark:text-cyan-300"
            />
            {todayGoal.title}
          </p>
        )}
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
                <span className="inline-flex items-center gap-1 font-bold text-emerald-500">
                  <CheckIcon size={13} />
                  Mission Accomplished
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
                      {m.done && <CheckIcon size={13} />}
                    </span>
                    <span className="flex-shrink-0 text-slate-500 dark:text-slate-400">
                      {m.icon}
                    </span>
                    <span
                      className={
                        m.done
                          ? "text-slate-500 line-through dark:text-slate-400"
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
        {!missionComplete && recommendation.message && (
          <p className="mt-3 border-t border-slate-200/70 pt-3 text-sm text-slate-500 dark:border-white/5 dark:text-slate-400">
            {recommendation.message}
          </p>
        )}
      </Card>

      {safe && (
        <Card title="Safe to spend today" delay={0.04}>
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

      <TodayAgenda />

      {/* The overall number moved to the orb, so this card is now the
          breakdown behind it — tapping a pillar focuses the orb on it.
          It stays on Today rather than moving to You, which the plan
          suggested, because that orb coupling is the thing that makes it
          worth tapping; detached from the orb it is just four numbers. */}
      <Card title="Four pillars" delay={0.06}>
        <PillarBar
          scores={pillars}
          selected={focusPillar?.pillar ?? null}
          onSelect={(pillar, colour) =>
            setFocusPillar((cur) =>
              cur?.pillar === pillar ? null : { pillar, colour },
            )
          }
        />
      </Card>

      {/* The pinned-habit tiles used to sit here, and they showed the SAME
          habits already listed in Today's mission a few hundred pixels above
          — two controls for one action on one screen. Pinning now means
          "first in today's mission" instead, which keeps the feature useful
          and removes the duplicate. */}

      <Card title="Brain dump" delay={0.09}>
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
                className="inline-flex items-center gap-1 text-sm font-medium text-emerald-500"
              >
                <CheckIcon size={13} />
                Saved
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

      {/* Demoted from the top of the page. It is a real risk on an app with
          no cloud, but it was an amber alert banner — system-interrupt
          styling for a routine reminder — and it out-shouted the mission. */}
      <BackupNudge />

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
    </div>
  );
}
