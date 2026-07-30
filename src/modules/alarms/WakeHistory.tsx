import { motion } from "framer-motion";
import { WAKE_ON_TIME_GRACE_MIN, type WakeLog } from "../../db/db";
import { localDateStr } from "../../lib/dates";

/** The last `days` dates, oldest first. */
function lastDays(days: number, now = new Date()): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    out.push(localDateStr(d));
  }
  return out;
}

/**
 * Every morning already records how many minutes after the alarm the mission
 * was solved — it just was never drawn. This is that number as a 30-day strip:
 * bar height is how late, so a shrinking skyline means you're getting up
 * closer to your alarm.
 */
export function WakeHistory({ logs }: { logs: WakeLog[] }) {
  if (logs.length === 0) return null;

  const byDate = new Map(logs.map((l) => [l.date, l]));
  const days = lastDays(30);
  const late = days.map((d) => byDate.get(d)?.minutesLate ?? null);
  const worst = Math.max(...late.map((m) => (m == null ? 0 : Math.max(m, 0))), 15);

  const logged = late.filter((m) => m != null).length;
  const avgLate = logged
    ? Math.round(
        late.reduce<number>((s, m) => s + Math.max(m ?? 0, 0), 0) / logged,
      )
    : 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-16 items-end gap-[3px]">
        {days.map((d, i) => {
          const m = late[i];
          if (m == null) {
            return (
              <div
                key={d}
                title={`${d}: no wake logged`}
                className="h-1 flex-1 rounded-sm bg-slate-200/70 dark:bg-slate-700/50"
              />
            );
          }
          const onTime = m <= WAKE_ON_TIME_GRACE_MIN;
          const pct = Math.max(6, (Math.max(m, 0) / worst) * 100);
          return (
            <motion.div
              key={d}
              initial={{ height: 0 }}
              animate={{ height: `${pct}%` }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: i * 0.008 }}
              title={`${d}: up ${m <= 0 ? "before" : `${m} min after`} the alarm`}
              className={`min-h-[3px] flex-1 rounded-sm ${
                onTime ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[11px] text-slate-400">
        <span>30 days ago</span>
        <span>
          {logged} logged · avg {avgLate} min after
        </span>
        <span>today</span>
      </div>
    </div>
  );
}
