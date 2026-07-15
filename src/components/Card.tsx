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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`glass rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.12)] dark:border-white/5 dark:bg-slate-800/60 dark:shadow-[0_1px_2px_rgba(0,0,0,0.2),0_12px_28px_-10px_rgba(0,0,0,0.5)] ${className}`}
    >
      {title && (
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          {title}
        </h2>
      )}
      {children}
    </motion.div>
  );
}
