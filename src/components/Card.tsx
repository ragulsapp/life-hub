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
      className={`glass rounded-3xl border border-white/60 bg-white/80 p-5 shadow-e2 dark:border-white/5 dark:bg-slate-800/60 dark:shadow-e2-dark ${className}`}
    >
      {title && (
        <h2 className="mb-3.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
          {title}
        </h2>
      )}
      {children}
    </motion.div>
  );
}
