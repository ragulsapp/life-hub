// min-w-0 overrides the flex default (min-width: auto), which otherwise
// stops a flex-1 input from shrinking below its content width and pushes
// sibling buttons off narrow screens (e.g. the Habit "Add" button bug).
export const inputClass =
  "min-w-0 rounded-xl border border-slate-200 bg-white/50 p-2.5 text-slate-900 outline-none transition-colors focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 dark:border-slate-600 dark:bg-slate-900/30 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500";
