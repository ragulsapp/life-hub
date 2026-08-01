import { useLiveQuery } from "dexie-react-hooks";
import { motion } from "framer-motion";
import { db } from "../../db/db";
import { Button } from "../../components/Button";
import { toast } from "../../lib/toast";
import { localMonthKey } from "../../lib/dates";
import { confirmRecurringTransaction } from "./recurringActions";

/**
 * Opened by tapping a "recurring payment due" notification. Confirming
 * routes through the same confirmRecurringTransaction used by the manual
 * button on the pending list — one code path, idempotent either way.
 */
export function ConfirmRecurringSheet({
  recurringId,
  onClose,
}: {
  recurringId: number;
  onClose: () => void;
}) {
  const r = useLiveQuery(() => db.recurringTransactions.get(recurringId), [recurringId]);

  if (r === undefined) return null; // still loading
  if (!r) {
    onClose(); // deleted since the notification fired
    return null;
  }

  const alreadyDone = r.generatedMonth === localMonthKey();

  const confirm = async () => {
    await confirmRecurringTransaction(recurringId);
    toast(`${r.category} recorded.`);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl bg-white p-5 dark:bg-slate-800 sm:rounded-3xl"
        style={{ paddingBottom: "calc(var(--sab) + 1.25rem)" }}
      >
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          {r.category}
        </h2>
        <p
          className={`mt-1 text-3xl font-extrabold tracking-tight ${
            r.type === "income" ? "text-emerald-500" : "text-red-500"
          }`}
        >
          {r.type === "income" ? "+" : "-"}₹{r.amount.toLocaleString()}
        </p>
        {r.note && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {r.note}
          </p>
        )}

        {alreadyDone ? (
          <p className="mt-4 text-sm text-emerald-500">
            Already recorded this month.
          </p>
        ) : (
          <Button onClick={confirm} className="mt-4 w-full">
            Confirm
          </Button>
        )}
        <button
          onClick={onClose}
          className="mt-2 w-full py-2 text-sm font-medium text-slate-400"
        >
          Not now
        </button>
      </motion.div>
    </motion.div>
  );
}
