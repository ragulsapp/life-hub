import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { motion } from "framer-motion";
import { db } from "../../db/db";
import { Card } from "../../components/Card";
import { toast } from "../../lib/toast";
import { evaluateAchievements, isUnlocked } from "./achievementRules";

export function AchievementsCard() {
  const logs = useLiveQuery(() => db.habitLogs.toArray(), []) ?? [];
  const goals = useLiveQuery(() => db.goals.toArray(), []) ?? [];
  const transactions = useLiveQuery(() => db.transactions.toArray(), []) ?? [];
  const wakeLogs = useLiveQuery(() => db.wakeLogs.toArray(), []) ?? [];
  const habits = useLiveQuery(() => db.habits.toArray(), []) ?? [];
  const settings = useLiveQuery(() => db.appSettings.get(1), []);
  const unlockedRows = useLiveQuery(() => db.achievements.toArray(), []);

  const all = evaluateAchievements(
    logs,
    goals,
    transactions,
    wakeLogs,
    habits,
    settings?.onboardingCompletedAt,
  );
  const unlockedKeys = new Set((unlockedRows ?? []).map((a) => a.key));

  // Persist newly-earned badges so the celebration fires exactly once, even
  // across reloads. Waits for the unlocked rows to actually load first —
  // otherwise every badge would look "new" on first render.
  useEffect(() => {
    if (unlockedRows === undefined) return;
    const newly = all.filter(
      (a) => isUnlocked(a) && !unlockedKeys.has(a.key),
    );
    if (newly.length === 0) return;
    (async () => {
      for (const a of newly) {
        try {
          await db.achievements.add({
            key: a.key,
            unlockedAt: Date.now(),
          } as never);
          toast(`${a.icon} Achievement unlocked — ${a.title}`);
        } catch {
          // &key unique index rejects duplicates; a race is harmless.
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlockedRows, all.map((a) => `${a.key}:${isUnlocked(a)}`).join()]);

  if (unlockedRows === undefined) return null;

  // unlockedAt has been written since this feature shipped but was never
  // shown — so a badge could say what you achieved, not when.
  const unlockedAt = new Map(
    (unlockedRows ?? []).map((a) => [a.key, a.unlockedAt]),
  );
  const earnedOn = (key: string) => {
    const at = unlockedAt.get(key);
    return at
      ? new Date(at).toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : null;
  };

  const earned = all
    .filter((a) => isUnlocked(a))
    // Most recently earned first — the timeline reads newest-at-the-top.
    .sort((a, b) => (unlockedAt.get(b.key) ?? 0) - (unlockedAt.get(a.key) ?? 0));
  // Show the closest few still in progress — motivating, not overwhelming.
  const next = all
    .filter((a) => !isUnlocked(a))
    .sort((a, b) => b.progress / b.target - a.progress / a.target)
    .slice(0, 3);

  return (
    <Card title="Achievements" delay={0.12}>
      {earned.length === 0 && next.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Start logging to earn your first milestone.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {earned.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {earned.map((a, i) => (
                <motion.div
                  key={a.key}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                  title={a.requirement}
                  className="flex items-center gap-2.5"
                >
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-sm">
                    {a.icon}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {a.title}
                  </span>
                  <span className="flex-shrink-0 text-[11px] tabular-nums text-slate-400">
                    {earnedOn(a.key) ?? "—"}
                  </span>
                </motion.div>
              ))}
            </div>
          )}

          {next.map((a) => (
            <div key={a.key}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-300">
                  {a.icon} {a.title}
                </span>
                <span className="text-slate-400">
                  {Math.floor(a.progress).toLocaleString()} /{" "}
                  {a.target.toLocaleString()}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700/50">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-amber-300 to-orange-400"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min(100, (a.progress / a.target) * 100)}%`,
                  }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
