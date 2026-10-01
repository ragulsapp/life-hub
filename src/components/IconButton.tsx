import { motion } from "framer-motion";
import { XIcon, TrashIcon } from "./Icons";

/**
 * The two icon-only buttons the app kept re-declaring.
 *
 * Both existed in a dozen places as a bare ✕ glyph. The panel-header copies
 * had drifted into three identical class strings; the row-delete copies were
 * worse — `text-xs` with no padding gives a target about 9x16px, under a
 * fifth of the minimum, and they were a common mis-tap next to an edit or
 * pin control. The glyph also rendered at whatever weight the host emoji
 * font chose, which is why they never matched the text beside them.
 */

/** Dismisses a panel or sheet. Sits in the header, aligned with the title. */
export function CloseButton({
  onClose,
  label = "Close",
  className = "",
}: {
  onClose: () => void;
  label?: string;
  className?: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClose}
      aria-label={label}
      className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-200/70 dark:text-slate-400 dark:hover:bg-slate-700/60 ${className}`}
    >
      <XIcon size={16} />
    </motion.button>
  );
}

/**
 * Removes one row from a list.
 *
 * A trash can rather than an ✕: next to a row, ✕ reads as "dismiss this"
 * when it actually deletes. The hover tint is the only colour it carries —
 * a permanently red control in every row makes a list look like an error.
 */
export function DeleteButton({
  onDelete,
  label,
  className = "",
}: {
  onDelete: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      onClick={onDelete}
      aria-label={label}
      className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-500 ${className}`}
    >
      <TrashIcon size={15} />
    </button>
  );
}
