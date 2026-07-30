import { motion, type HTMLMotionProps } from "framer-motion";

type Variant = "primary" | "secondary" | "ghost" | "toggle-on" | "toggle-off";

/**
 * Flat fills with a real elevation shadow, not gradients with a coloured
 * glow — the glow is the single most "cheap app" signal in the old palette.
 *
 * text-white on primary/toggle-on is REQUIRED, not cosmetic: the retuned cyan
 * (#2b8f9c) and emerald are dark enough that the previous text-slate-900
 * inverts to near-unreadable contrast.
 */
const variantClasses: Record<Variant, string> = {
  primary:
    "bg-cyan-500 text-white shadow-e1 hover:bg-cyan-600 active:translate-y-px",
  secondary:
    "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700/70 dark:text-slate-100 dark:hover:bg-slate-600/70",
  ghost:
    "bg-transparent text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700/60",
  "toggle-on":
    "bg-emerald-500 text-white shadow-e1 hover:bg-emerald-600 active:translate-y-px",
  "toggle-off":
    "bg-slate-100 text-slate-400 dark:bg-slate-700/60 dark:text-slate-500",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: HTMLMotionProps<"button"> & { variant?: Variant }) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={`rounded-2xl px-4 py-2.5 font-semibold transition-colors disabled:opacity-40 ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
