import { motion, type HTMLMotionProps } from "framer-motion";

type Variant = "primary" | "secondary" | "ghost" | "toggle-on" | "toggle-off";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-cyan-400 to-cyan-500 text-slate-900 shadow-[0_2px_0_0_rgba(8,145,178,0.6),0_4px_12px_-2px_rgba(34,211,238,0.5)] active:shadow-none active:translate-y-px",
  secondary:
    "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700/70 dark:text-slate-100 dark:hover:bg-slate-600/70",
  ghost:
    "bg-transparent text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700/60",
  "toggle-on":
    "bg-gradient-to-b from-emerald-400 to-emerald-500 text-slate-900 shadow-[0_2px_0_0_rgba(5,150,105,0.6),0_4px_12px_-2px_rgba(52,211,153,0.5)]",
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
