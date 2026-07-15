import { motion, AnimatePresence } from "framer-motion";
import { useDarkMode } from "../lib/theme";

export function DarkModeToggle() {
  const [darkMode, toggle] = useDarkMode();
  return (
    <motion.button
      onClick={toggle}
      whileTap={{ scale: 0.85, rotate: 20 }}
      aria-label="Toggle dark mode"
      className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full text-lg hover:bg-slate-100 dark:hover:bg-slate-700/60"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={darkMode ? "sun" : "moon"}
          initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
          transition={{ duration: 0.2 }}
        >
          {darkMode ? "☀️" : "🌙"}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
