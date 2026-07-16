import { motion } from "framer-motion";
import type { HeatCell } from "./habitStreaks";

export function HabitHeatmap({
  columns,
  color,
  onToggle,
}: {
  columns: HeatCell[][];
  color: string;
  onToggle: (date: string, completed: boolean) => void;
}) {
  return (
    <div className="flex gap-[3px] overflow-x-auto">
      {columns.map((col, ci) => (
        <div key={ci} className="flex flex-col gap-[3px]">
          {col.map((cell) => (
            <motion.button
              key={cell.date}
              disabled={cell.inFuture}
              onClick={(e) => {
                e.stopPropagation();
                onToggle(cell.date, cell.completed);
              }}
              whileTap={{ scale: 0.8 }}
              title={cell.date}
              aria-label={`${cell.date}${cell.completed ? ", completed" : ""}`}
              aria-pressed={cell.completed}
              className="h-[13px] w-[13px] rounded-[3px] disabled:opacity-30"
              style={{
                backgroundColor: cell.completed
                  ? color
                  : "rgba(148,163,184,0.18)",
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
