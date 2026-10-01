import { motion } from "framer-motion";

/**
 * The two selection controls the app kept re-declaring.
 *
 * `Chip` existed as five hand-written copies of the same class string
 * (finance categories, debt types, goal steps, habit identities, fast
 * lengths) that differed only in a slate shade and whether the text was
 * xs or sm. Every copy sat between 24px and 36px tall — the goal and habit
 * ones at 24px were the worst targets in the app, and they appear in dense
 * wrapping rows where a mis-tap selects the neighbour.
 *
 * `Segmented` was two more copies. Both now carry a 44px target, which is
 * the whole reason they are shared rather than copied: a height fixed in
 * one place cannot drift back out of spec in five others.
 */

export function Chip({
  selected,
  onClick,
  children,
  label,
  className = "",
}: {
  selected?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  /** Only needed when the visible content is not readable text. */
  label?: string;
  className?: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      aria-pressed={selected}
      aria-label={label}
      className={`inline-flex h-11 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors ${
        selected
          ? "bg-cyan-500 text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700/50 dark:text-slate-300 dark:hover:bg-slate-700"
      } ${className}`}
    >
      {children}
    </motion.button>
  );
}

/** The "add another" affordance that sits at the end of a chip row. */
export function AddChip({
  onClick,
  children,
  className = "",
}: {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className={`inline-flex h-11 items-center gap-1.5 rounded-full border border-dashed border-slate-300 px-3.5 text-sm font-medium text-slate-500 transition-colors hover:border-cyan-400 hover:text-cyan-500 dark:border-slate-600 dark:text-slate-400 dark:hover:text-cyan-300 ${className}`}
    >
      {children}
    </motion.button>
  );
}

/**
 * A row of mutually exclusive options that divide the full width — the
 * shape used for sub-navigation, as opposed to `Chip`, which wraps.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={`flex gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800/60 ${className}`}
    >
      {options.map((o) => (
        <button
          key={o.id}
          role="tab"
          aria-selected={value === o.id}
          onClick={() => onChange(o.id)}
          className={`h-11 flex-1 rounded-xl text-sm font-semibold transition-colors ${
            value === o.id
              ? "bg-white text-cyan-500 shadow-e1 dark:bg-slate-800 dark:text-cyan-300"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
