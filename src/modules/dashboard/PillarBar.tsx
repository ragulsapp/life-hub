import { PILLAR_META } from "../../db/db";
import type { PillarScore } from "../../lib/lifePillars";

/**
 * Four pillars side by side — one glance shows which area is slipping.
 *
 * A glow dot in the pillar's own colour rather than a bar: the orb above
 * already blends these same four hues, so the dot is what connects a number
 * to the light inside the sphere.
 */
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
        return (
          <button
            key={s.pillar}
            type="button"
            onClick={() => onSelect?.(s.pillar, meta.color)}
            aria-pressed={isSel}
            className={`flex flex-col items-center gap-2 rounded-2xl border px-1 py-2.5 transition-colors ${
              isSel
                ? "border-cyan-400/50 bg-cyan-400/10"
                : "border-transparent hover:border-slate-200 dark:hover:border-white/10"
            }`}
          >
            <span className="relative flex h-[9px] w-[9px]">
              <span
                className="absolute inset-0 rounded-full"
                style={{ backgroundColor: meta.color }}
              />
              <span
                aria-hidden
                className="absolute rounded-full"
                style={{
                  inset: -5,
                  backgroundColor: meta.color,
                  filter: "blur(5px)",
                  opacity: 0.55,
                }}
              />
            </span>
            <span className="text-base font-semibold tabular-nums text-slate-800 dark:text-white">
              {s.score === null ? "—" : s.score}
              {s.trend !== null && s.trend !== 0 && (
                <span
                  className={s.trend > 0 ? "text-emerald-400" : "text-amber-400"}
                >
                  {s.trend > 0 ? " ↑" : " ↓"}
                </span>
              )}
            </span>
            <span className="text-[8.5px] font-bold uppercase tracking-[0.11em] text-slate-400 dark:text-slate-500">
              {meta.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
