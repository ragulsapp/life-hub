import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion } from "framer-motion";
import { db, type GoalStatus } from "../../db/db";
import { Card } from "../../components/Card";
import { GoalForm } from "./GoalForm";
import { localDateStr } from "../../lib/dates";

const statusOrder: GoalStatus[] = ["active", "completed", "abandoned"];
const statusColor: Record<GoalStatus, string> = {
  active: "bg-gradient-to-r from-cyan-400 to-sky-500 text-white",
  completed: "bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-900",
  abandoned:
    "bg-slate-200 text-slate-500 dark:bg-slate-600/60 dark:text-slate-300",
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

  const cycleStatus = async (id: number, status: GoalStatus) => {
    const next = statusOrder[(statusOrder.indexOf(status) + 1) % statusOrder.length];
    await db.goals.update(id, { status: next });
  };

  const remove = async (id: number) => {
    await db.goals.delete(id);
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        Goals
      </h1>

      <Card title="Add Goal">
        <GoalForm />
      </Card>

      <div className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {sorted.map((g) => (
            <motion.div
              key={g.id}
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
                      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize shadow-sm ${statusColor[g.status]}`}
                    >
                      {g.status}
                    </motion.button>
                    <button
                      onClick={() => remove(g.id)}
                      aria-label={`Delete goal "${g.title}"`}
                      className="text-xs text-slate-400 hover:text-red-500"
                    >
                      ✕
                    </button>
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
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              done
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300"
                            }`}
                          >
                            {done ? "✓" : "○"} {name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
        {sorted.length === 0 && (
          <div className="text-sm text-slate-500 dark:text-slate-400">
            No goals yet.
          </div>
        )}
      </div>
    </div>
  );
}
