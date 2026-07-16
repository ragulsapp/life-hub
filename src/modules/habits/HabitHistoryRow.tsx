import { motion } from "framer-motion";
import type { DayCell } from "./habitStreaks";

export function HabitHistoryRow({
  days,
  onToggle,
}: {
  days: DayCell[];
  onToggle: (date: string, completed: boolean) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {days.map((cell) => (
        <button
          key={cell.date}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(cell.date, cell.completed);
          }}
          aria-label={`${cell.date}${cell.completed ? ", completed" : ""}`}
          aria-pressed={cell.completed}
          className="flex flex-col items-center gap-1"
        >
          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
            {cell.weekday}
          </span>
          <motion.span
            whileTap={{ scale: 0.8 }}
            animate={{ scale: cell.completed ? 1 : 0.92 }}
            className={`flex h-6 w-6 items-center justify-center rounded-lg text-[11px] font-bold transition-colors ${
              cell.completed
                ? "bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-sm"
                : "bg-slate-100 text-transparent dark:bg-slate-700/60"
            } ${cell.isToday ? "ring-2 ring-cyan-400 ring-offset-1 ring-offset-white dark:ring-offset-slate-800" : ""}`}
          >
            {cell.completed ? "✓" : ""}
          </motion.span>
        </button>
      ))}
    </div>
  );
}
