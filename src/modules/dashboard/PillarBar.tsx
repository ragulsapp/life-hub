import { motion } from "framer-motion";
import { PILLAR_META } from "../../db/db";
import type { PillarScore } from "../../lib/lifePillars";

/**
 * Four pillars side by side — one glance shows which area is slipping.
 *
 * This used to be four glow dots, and the dots were fixed at 9x9 whatever
 * the score was. A pillar at 95 and a pillar at 5 drew exactly the same
 * mark, so the visual carried no information at all and the number beside
 * it did every bit of the work. It looked like data and wasn't.
 *
 * The track is the score now: height is the value, so four pillars can be
 * compared without reading four numbers. An empty track also tells the
 * truth on a fresh install, where a glowing dot implied something existed.
 *
 * The per-pillar hues stay. This is the one place in the app where several
 * colours at once are earned — they are categories, not decoration, and
 * they match the light the orb blends above.
 */

const TRACK_H = 44;

export function PillarBar({
  scores,
  selected,
  onSelect,
}: {
  scores: PillarScore[];
  /** Pillar currently focused in the orb, if any. */
  selected?: string | null;
  onSelect?: (pillar: string, colour: string) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {scores.map((s) => {
        const meta = PILLAR_META[s.pillar];
        const isSel = selected === s.pillar;
        const pct = s.score === null ? 0 : Math.max(0, Math.min(100, s.score));
        return (
          <button
            key={s.pillar}
            type="button"
            onClick={() => onSelect?.(s.pillar, meta.color)}
            aria-pressed={isSel}
            aria-label={`${meta.label}: ${
              s.score === null ? "no data yet" : `${s.score} out of 100`
            }`}
            className={`flex flex-col items-center gap-2 rounded-2xl border px-1 pb-2 pt-3 transition-colors ${
              isSel
                ? "border-cyan-400/50 bg-cyan-400/10"
                : "border-transparent hover:border-slate-200 dark:hover:border-white/10"
            }`}
          >
            <span
              className="relative w-1.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10"
              style={{ height: TRACK_H }}
            >
              <motion.span
                className="absolute inset-x-0 bottom-0 rounded-full"
                style={{ backgroundColor: meta.color }}
                initial={{ height: 0 }}
                animate={{ height: `${pct}%` }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              />
              {/* The glow is the only thing kept from the old dot: it is what
                  ties a pillar to its light inside the orb. It sits on the
                  filled part, so an empty pillar stays dark. */}
              {pct > 0 && (
                <motion.span
                  aria-hidden
                  className="absolute inset-x-0 rounded-full"
                  style={{
                    backgroundColor: meta.color,
                    filter: "blur(4px)",
                    opacity: 0.7,
                    height: 8,
                  }}
                  initial={{ bottom: 0 }}
                  animate={{ bottom: `calc(${pct}% - 4px)` }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                />
              )}
            </span>

            <span className="flex items-baseline gap-0.5 text-base font-semibold tabular-nums text-slate-800 dark:text-white">
              {s.score === null ? (
                <span className="text-slate-500 dark:text-slate-400">—</span>
              ) : (
                s.score
              )}
              {s.trend !== null && s.trend !== 0 && (
                <span
                  aria-label={s.trend > 0 ? "rising" : "falling"}
                  className={`text-caption ${
                    s.trend > 0 ? "text-emerald-500" : "text-amber-500"
                  }`}
                >
                  {s.trend > 0 ? "↑" : "↓"}
                </span>
              )}
            </span>

            <span className="text-caption font-medium text-slate-500 dark:text-slate-400">
              {meta.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
