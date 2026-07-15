import { motion } from "framer-motion";

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export const DONUT_PALETTE = [
  "#f43f5e",
  "#f59e0b",
  "#22d3ee",
  "#a78bfa",
  "#34d399",
  "#60a5fa",
  "#f472b6",
  "#94a3b8",
];

export function DonutChart({
  slices,
  size = 150,
  thickness = 22,
  centerLabel,
  centerValue,
}: {
  slices: DonutSlice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = slices.reduce((s, d) => s + d.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const arcs =
    total > 0
      ? slices
          .filter((s) => s.value > 0)
          .map((slice) => {
            const frac = slice.value / total;
            const dash = frac * circumference;
            const arc = {
              ...slice,
              dash,
              gap: circumference - dash,
              rotation: (offset / total) * 360,
            };
            offset += slice.value;
            return arc;
          })
      : [];

  return (
    <div className="flex items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.1}
            strokeWidth={thickness}
          />
          {arcs.map((arc, i) => (
            <motion.circle
              key={arc.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth={thickness}
              strokeLinecap="butt"
              strokeDasharray={`${arc.dash} ${arc.gap}`}
              transform={`rotate(${arc.rotation} ${size / 2} ${size / 2})`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 + i * 0.08 }}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerValue && (
            <span className="text-lg font-extrabold text-slate-800 dark:text-white">
              {centerValue}
            </span>
          )}
          {centerLabel && (
            <span className="text-[10px] uppercase tracking-wide text-slate-400">
              {centerLabel}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5">
        {slices
          .filter((s) => s.value > 0)
          .map((s) => (
            <div key={s.label} className="flex items-center gap-2 text-sm">
              <span
                className="h-3 w-3 flex-shrink-0 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span className="flex-1 truncate text-slate-600 dark:text-slate-300">
                {s.label}
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-100">
                {total > 0 ? Math.round((s.value / total) * 100) : 0}%
              </span>
            </div>
          ))}
        {total === 0 && (
          <span className="text-sm text-slate-400">No spending yet.</span>
        )}
      </div>
    </div>
  );
}
