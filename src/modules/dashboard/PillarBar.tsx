import { motion } from "framer-motion";
import { PILLAR_META } from "../../db/db";
import type { PillarScore } from "../../lib/lifePillars";

/** Four pillars side by side — one glance shows which area is slipping. */
export function PillarBar({ scores }: { scores: PillarScore[] }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {scores.map((s, i) => {
        const meta = PILLAR_META[s.pillar];
        const pct = s.score ?? 0;
        return (
          <div key={s.pillar} className="flex flex-col items-center gap-1">
            <div className="text-base">{meta.icon}</div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700/60">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: meta.color }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
              />
            </div>
            <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
              {s.score === null ? "—" : s.score}
              {s.trend !== null && s.trend !== 0 && (
                <span
                  className={
                    s.trend > 0 ? "text-emerald-500" : "text-amber-500"
                  }
                >
                  {s.trend > 0 ? " ↑" : " ↓"}
                </span>
              )}
            </div>
            <div className="text-[9px] uppercase tracking-wide text-slate-400">
              {meta.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
