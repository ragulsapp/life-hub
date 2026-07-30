import { useLiveQuery } from "dexie-react-hooks";
import { motion } from "framer-motion";
import { db } from "../../db/db";

interface Row {
  id: number;
  date: string;
  hours: number;
  target: number;
  label?: string;
}

function fmtHours(h: number): string {
  const whole = Math.floor(h);
  const mins = Math.round((h - whole) * 60);
  return mins ? `${whole}h ${mins}m` : `${whole}h`;
}

export function FastingHistory() {
  const sessions = useLiveQuery(
    () =>
      db.fastingSessions
        .filter((f) => f.endedAt !== undefined)
        .toArray(),
    [],
  );

  if (sessions === undefined) return null;

  const rows: Row[] = sessions
    .map((s) => {
      const hours = (s.endedAt! - s.startedAt) / 3600000;
      return {
        id: s.id,
        date: new Date(s.startedAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        hours,
        target: s.targetHours,
        label: s.label,
      };
    })
    .sort((a, b) => b.id - a.id);

  if (rows.length === 0) {
    return (
      <div className="text-sm text-slate-500 dark:text-slate-400">
        No completed fasts yet — your history and trend will show up here.
      </div>
    );
  }

  const avg = rows.reduce((sum, r) => sum + r.hours, 0) / rows.length;
  const longest = Math.max(...rows.map((r) => r.hours));
  const recent = rows.slice(0, 14).slice().reverse(); // oldest-first for the chart
  const maxHours = Math.max(...recent.map((r) => Math.max(r.hours, r.target)), 1);

  const remove = (id: number) => db.fastingSessions.delete(id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-around text-center">
        <div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            {rows.length}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Fasts kept
          </div>
        </div>
        <div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            {fmtHours(avg)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Average
          </div>
        </div>
        <div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            {fmtHours(longest)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Longest
          </div>
        </div>
      </div>

      <div className="flex h-24 items-end gap-1.5">
        {recent.map((r) => (
          <div key={r.id} className="flex flex-1 flex-col items-center gap-1">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(r.hours / maxHours) * 100}%` }}
              transition={{ duration: 0.4 }}
              className="w-full min-h-[3px] rounded-t-md bg-cyan-400"
              title={`${r.date}: ${fmtHours(r.hours)} of ${r.target}h`}
            />
            <span className="text-[9px] text-slate-400">{r.date}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 border-t border-slate-200/70 pt-3 dark:border-slate-600/40">
        {rows.slice(0, 8).map((r) => (
          <div key={r.id} className="flex items-center gap-2 text-sm">
            <span className="w-16 flex-shrink-0 text-slate-500 dark:text-slate-400">
              {r.date}
            </span>
            <span className="min-w-0 flex-1 truncate font-medium text-slate-800 dark:text-slate-100">
              {fmtHours(r.hours)}
              {r.label && (
                <span className="ml-1.5 text-xs font-normal text-slate-400">
                  {r.label}
                </span>
              )}
            </span>
            <button
              onClick={() => remove(r.id)}
              aria-label={`Delete ${r.date} fast record`}
              className="text-xs text-slate-300 hover:text-red-500 dark:text-slate-600"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
