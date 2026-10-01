import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion } from "framer-motion";
import { db, type Goal, type GoalStatus, type GoalTerm } from "../../db/db";
import { Card } from "../../components/Card";
import { localDateStr } from "../../lib/dates";
import { DeleteButton } from "../../components/IconButton";
import {
  CheckIcon,
  CircleIcon,
  TrophyIcon,
} from "../../components/Icons";
import { EmptyState } from "../../components/EmptyState";

const statusOrder: GoalStatus[] = ["active", "completed", "abandoned"];
const statusColor: Record<GoalStatus, string> = {
  active: "bg-gradient-to-r from-cyan-400 to-sky-500 text-white",
  completed: "bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-900",
  abandoned:
    "bg-slate-200 text-slate-500 dark:bg-slate-600/60 dark:text-slate-300",
};

/** "today" first — the most immediately actionable group. Undefined (goals
 *  that predate this field) sorts last as "Unclassified", never hidden. */
const TERM_ORDER: (GoalTerm | undefined)[] = ["today", "short", "long", undefined];
const TERM_GROUP_LABEL: Record<string, string> = {
  today: "Today",
  short: "Short-term",
  long: "Long-term",
  undefined: "Unclassified",
};

export function GoalsView() {
  const goals = useLiveQuery(() => db.goals.toArray(), []) ?? [];
  const today = localDateStr();
  const todayLogs =
    useLiveQuery(() => db.habitLogs.where("date").equals(today).toArray(), [
      today,
    ]) ?? [];
  const doneToday = new Set(
    todayLogs.filter((l) => l.completed).map((l) => l.habitName),
  );
  const sorted = [...goals].sort(
    (a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status),
  );

  /** Completed goals, most recently finished first. */
  const finished = goals
    .filter((g) => g.status === "completed")
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

  /** Grouped by term — "today" first, undefined ("Unclassified") last, so
   *  pre-existing goals stay visible rather than silently reassigned. */
  const groups = TERM_ORDER.map((term) => ({
    term,
    goals: sorted.filter((g) => g.term === term),
  })).filter((g) => g.goals.length > 0);

  const cycleStatus = async (id: number, status: GoalStatus) => {
    const next = statusOrder[(statusOrder.indexOf(status) + 1) % statusOrder.length];
    // Stamp on completion, clear when it moves back out — so "completed this
    // month" can never count a goal that was later reopened.
    await db.goals.update(id, {
      status: next,
      completedAt: next === "completed" ? Date.now() : undefined,
    });
  };

  const remove = async (id: number) => {
    await db.goals.delete(id);
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">

      {finished.length > 0 && (
        <Card title="Completed" delay={0.03}>
          <div className="flex flex-col gap-2">
            {finished.map((g) => {
              const took =
                g.completedAt && g.createdAt
                  ? Math.max(
                      1,
                      Math.round((g.completedAt - g.createdAt) / 86400000),
                    )
                  : null;
              return (
                <div key={g.id} className="flex items-center gap-2 text-sm">
                  <span className="flex-shrink-0 text-emerald-500">
                    <CheckIcon size={14} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200">
                    {g.title}
                  </span>
                  <span className="flex-shrink-0 text-[11px] tabular-nums text-slate-400">
                    {/* Goals from before timestamps existed show "—" rather
                        than an invented date. */}
                    {g.completedAt
                      ? new Date(g.completedAt).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                        })
                      : "—"}
                    {took !== null && ` · ${took}d`}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {groups.map(({ term, goals: groupGoals }) => (
        <div key={String(term)} className="flex flex-col gap-2">
          <div className="px-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            {TERM_GROUP_LABEL[String(term)]}
          </div>
          <AnimatePresence initial={false}>
            {groupGoals.map((g) => (
              <GoalCard
                key={g.id}
                g={g}
                doneToday={doneToday}
                cycleStatus={cycleStatus}
                remove={remove}
              />
            ))}
          </AnimatePresence>
        </div>
      ))}
      {sorted.length === 0 && (
        <EmptyState
          icon={<TrophyIcon size={30} />}
          title="No goals yet"
          hint="Name one thing you want to be true in a year. Tap + to add it."
        />
      )}
    </div>
  );
}

function GoalCard({
  g,
  doneToday,
  cycleStatus,
  remove,
}: {
  g: Goal;
  doneToday: Set<string>;
  cycleStatus: (id: number, status: GoalStatus) => void;
  remove: (id: number) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
    >
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">
              {g.title}
            </div>
            {g.targetDate && (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Target: {g.targetDate}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => cycleStatus(g.id, g.status)}
              className={`inline-flex h-11 items-center rounded-full px-4 text-xs font-semibold capitalize shadow-sm ${statusColor[g.status]}`}
            >
              {g.status}
            </motion.button>
            <DeleteButton onDelete={() => remove(g.id)} label={`Delete goal "${g.title}"`} />
          </div>
        </div>

        {g.status === "active" && (g.linkedHabits?.length ?? 0) > 0 && (
          <div className="mt-3 border-t border-slate-200/70 pt-2 dark:border-slate-600/40">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              Today's step
            </div>
            <div className="flex flex-wrap gap-1.5">
              {g.linkedHabits!.map((name) => {
                const done = doneToday.has(name);
                return (
                  <span
                    key={name}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                      done
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300"
                    }`}
                  >
                    {done ? <CheckIcon size={12} /> : <CircleIcon size={12} />}
                    {name}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
