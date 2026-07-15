import { useId, useMemo } from "react";
import { motion } from "framer-motion";

function smoothPath(points: [number, number][]): string {
  if (points.length < 2) return "";
  let d = `M ${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const mx = (x0 + x1) / 2;
    d += ` C ${mx},${y0} ${mx},${y1} ${x1},${y1}`;
  }
  return d;
}

export function AreaChart({
  values,
  labels,
  color = "#22d3ee",
  unit = "",
}: {
  values: number[];
  labels?: string[];
  color?: string;
  unit?: string;
}) {
  const gradientId = useId();
  const width = 300;
  const height = 110;
  const padY = 14;

  const { linePath, areaPath, points, min, max } = useMemo(() => {
    if (values.length < 2) {
      return { linePath: "", areaPath: "", points: [] as [number, number][], min: 0, max: 0 };
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const pts: [number, number][] = values.map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - padY - ((v - min) / range) * (height - padY * 2);
      return [x, y];
    });
    const line = smoothPath(pts);
    const area = `${line} L ${pts[pts.length - 1][0]},${height} L ${pts[0][0]},${height} Z`;
    return { linePath: line, areaPath: area, points: pts, min, max };
  }, [values]);

  if (values.length < 2) {
    return (
      <div className="flex h-[110px] items-center justify-center text-sm text-slate-400 dark:text-slate-500">
        Log a few more entries to see a trend.
      </div>
    );
  }

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        <motion.path
          d={areaPath}
          fill={`url(#${gradientId})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        />

        <motion.path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, ease: "easeInOut" }}
        />

        {points.map(([x, y], i) => (
          <motion.circle
            key={i}
            cx={x}
            cy={y}
            r={i === points.length - 1 ? 4.5 : 3}
            fill={i === points.length - 1 ? color : "var(--dot-fill, white)"}
            stroke={color}
            strokeWidth={2}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, delay: 0.5 + i * 0.04 }}
          />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-slate-400 dark:text-slate-500">
        <span>
          min {min.toLocaleString()}
          {unit}
        </span>
        {labels && <span>{labels[labels.length - 1]}</span>}
        <span>
          max {max.toLocaleString()}
          {unit}
        </span>
      </div>
    </div>
  );
}
