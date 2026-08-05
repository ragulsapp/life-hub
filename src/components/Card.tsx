import type { ReactNode } from "react";
import { motion } from "framer-motion";

export function Card({
  title,
  children,
  className = "",
  delay = 0,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`glass relative overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-5 shadow-e2 dark:border-white/5 dark:bg-slate-800/60 dark:shadow-e2-dark ${className}`}
    >
      {/* A 1px light edge along the top only — it reads as a sheet of glass
          catching the light from above rather than a filled rectangle. This
          is the single detail that separates the surface from flat, and it
          fades at both ends so it never looks like a border. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent dark:via-white/20"
      />
      {title && (
        <h2 className="mb-3.5 text-[10px] font-semibold uppercase tracking-[0.19em] text-slate-400 dark:text-slate-500">
          {title}
        </h2>
      )}
      {children}
    </motion.div>
  );
}
