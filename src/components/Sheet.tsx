import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CloseButton } from "./IconButton";

/**
 * A bottom sheet, and the app's single answer to "where does creating
 * something happen".
 *
 * Every tab used to open with a form card — Add Habit, Add Goal, New Note,
 * Add Transaction — so the first thing you saw was an empty input rather
 * than your own data. Creation is an occasional act and belongs behind a
 * deliberate gesture; the page is for looking at what you already have.
 *
 * Rises from the bottom because that is where the thumb and the button
 * that opened it are, and caps at 85vh so a long form scrolls inside the
 * sheet rather than pushing the handle off-screen.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);

  // Escape closes, and the page behind must not scroll under the sheet —
  // on iOS a scrollable body behind a sheet steals the drag and feels broken.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  // Focus moves into the sheet so the keyboard and screen reader follow it.
  useEffect(() => {
    if (open) panel.current?.focus();
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/50 backdrop-blur-[2px]"
        >
          <motion.div
            ref={panel}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85vh] w-full max-w-md flex-col rounded-t-3xl bg-white outline-none dark:bg-slate-800"
            style={{ paddingBottom: "var(--sab)" }}
          >
            {/* A grab handle reads as "this came from the bottom and goes
                back there", which a plain panel does not. */}
            <div className="flex justify-center pt-2.5">
              <span className="h-1 w-9 rounded-full bg-slate-300 dark:bg-slate-600" />
            </div>

            <div className="flex items-center justify-between gap-2 px-4 pb-1 pt-2">
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                {title}
              </h2>
              <CloseButton onClose={onClose} label={`Close ${title}`} />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * The one creation button. It is per-tab rather than global because what
 * "add" means depends on where you are — a habit on Your plan, a
 * transaction on Money — and a menu asking which would just be the old
 * seven-tab problem in a smaller box.
 */
export function CreateFab({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      aria-label={label}
      className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500 text-white shadow-e3 transition-colors hover:bg-cyan-600"
      style={{ marginBottom: "var(--sab)" }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        aria-hidden
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
    </motion.button>
  );
}
