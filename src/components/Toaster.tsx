import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { setToastListener, type ToastKind } from "../lib/toast";

interface ToastItem {
  id: number;
  msg: string;
  kind: ToastKind;
}

export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    setToastListener((msg, kind) => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t.slice(-2), { id, msg, kind }]);
      setTimeout(
        () => setToasts((t) => t.filter((x) => x.id !== id)),
        3500,
      );
    });
    return () => setToastListener(null);
  }, []);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-20 left-1/2 z-[60] flex w-full max-w-sm -translate-x-1/2 flex-col items-center gap-2 px-4"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            role="status"
            className={`rounded-2xl px-4 py-2.5 text-sm font-medium shadow-lg ${
              t.kind === "error"
                ? "bg-red-500 text-white"
                : "bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900"
            }`}
          >
            {t.msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
