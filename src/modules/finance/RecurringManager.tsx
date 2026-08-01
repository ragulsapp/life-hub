import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion } from "framer-motion";
import { db, type FinanceCategoryKind, type RecurringTransaction } from "../../db/db";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { inputClass } from "../../components/inputStyles";
import { toast } from "../../lib/toast";
import { localMonthKey } from "../../lib/dates";
import { isPending, pendingRecurring } from "./recurringSummary";
import {
  addRecurringTransaction,
  confirmRecurringTransaction,
  deleteRecurringTransaction,
  updateRecurringTransaction,
} from "./recurringActions";

function AddRecurringForm() {
  const [type, setType] = useState<FinanceCategoryKind>("expense");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [note, setNote] = useState("");

  const submit = async () => {
    const amt = parseFloat(amount);
    const day = parseInt(dayOfMonth, 10);
    if (!category.trim() || !Number.isFinite(amt) || amt <= 0) {
      toast("Enter a category and a valid amount.", "error");
      return;
    }
    if (!Number.isFinite(day) || day < 1 || day > 31) {
      toast("Day of month must be between 1 and 31.", "error");
      return;
    }
    await addRecurringTransaction({
      type,
      category: category.trim(),
      amount: Math.round(amt * 100) / 100,
      dayOfMonth: day,
      note: note.trim() || undefined,
    });
    setCategory("");
    setAmount("");
    setNote("");
    toast("Added.");
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Button
          variant={type === "income" ? "primary" : "secondary"}
          onClick={() => setType("income")}
          className="flex-1"
        >
          Income
        </Button>
        <Button
          variant={type === "expense" ? "primary" : "secondary"}
          onClick={() => setType("expense")}
          className="flex-1"
        >
          Expense
        </Button>
      </div>
      <input
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        placeholder="Category (e.g. Rent, Salary, Netflix)"
        className={inputClass}
      />
      <div className="flex gap-2">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          type="number"
          inputMode="decimal"
          placeholder="Amount (₹)"
          className={`flex-1 ${inputClass}`}
        />
        <input
          value={dayOfMonth}
          onChange={(e) => setDayOfMonth(e.target.value)}
          type="number"
          inputMode="numeric"
          min={1}
          max={31}
          placeholder="Day"
          className={`w-20 ${inputClass}`}
        />
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
        className={inputClass}
      />
      <Button onClick={submit} disabled={!category.trim() || !amount}>
        Add Recurring
      </Button>
    </div>
  );
}

function RecurringRow({ r }: { r: RecurringTransaction }) {
  const pending = isPending(r);
  const doneThisMonth = r.generatedMonth === localMonthKey();

  const confirm = async () => {
    await confirmRecurringTransaction(r.id);
    toast(`${r.category} recorded.`);
  };

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`rounded-2xl p-3 ${
        r.active ? "bg-slate-50 dark:bg-slate-700/40" : "bg-slate-50/50 opacity-60 dark:bg-slate-700/20"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium text-slate-900 dark:text-white">
            {r.category}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {r.type === "income" ? "+" : "-"}₹{r.amount.toLocaleString()} · Day{" "}
            {r.dayOfMonth}
            {doneThisMonth ? " · Done this month" : ""}
            {r.note ? ` · ${r.note}` : ""}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() =>
              updateRecurringTransaction(r.id, { active: !r.active })
            }
            aria-label={`${r.active ? "Pause" : "Resume"} ${r.category}`}
            className="text-xs font-semibold text-slate-400 hover:text-cyan-500"
          >
            {r.active ? "Pause" : "Resume"}
          </button>
          <button
            onClick={() => deleteRecurringTransaction(r.id)}
            aria-label={`Delete ${r.category}`}
            className="text-xs text-slate-300 hover:text-red-500 dark:text-slate-600"
          >
            ✕
          </button>
        </div>
      </div>
      {pending && (
        <button
          onClick={confirm}
          className="mt-2 text-xs font-semibold text-cyan-500 dark:text-cyan-300"
        >
          Confirm this month's {r.category}
        </button>
      )}
    </motion.li>
  );
}

export function RecurringManager() {
  const all = useLiveQuery(() => db.recurringTransactions.toArray(), []) ?? [];
  const pending = pendingRecurring(all);

  return (
    <div className="flex flex-col gap-4">
      {pending.length > 0 && (
        <Card title="Pending This Month">
          <ul className="flex flex-col gap-2">
            {pending.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-2xl bg-amber-50 p-3 text-sm dark:bg-amber-500/10"
              >
                <div>
                  <div className="font-medium text-slate-900 dark:text-white">
                    {r.category}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {r.type === "income" ? "+" : "-"}₹{r.amount.toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => confirmRecurringTransaction(r.id)}
                  className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Confirm
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Add Recurring" delay={0.05}>
        <AddRecurringForm />
      </Card>

      <Card title="Recurring Transactions" delay={0.08}>
        <ul className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {all.map((r) => (
              <RecurringRow key={r.id} r={r} />
            ))}
          </AnimatePresence>
          {all.length === 0 && (
            <li className="text-sm text-slate-500 dark:text-slate-400">
              No recurring transactions yet — rent, salary, EMIs and
              subscriptions all fit here.
            </li>
          )}
        </ul>
      </Card>
    </div>
  );
}
