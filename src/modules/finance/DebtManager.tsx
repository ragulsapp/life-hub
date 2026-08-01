import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion } from "framer-motion";
import { db, type Debt, type DebtType } from "../../db/db";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { AnimatedNumber } from "../../components/AnimatedNumber";
import { inputClass } from "../../components/inputStyles";
import { localDateStr } from "../../lib/dates";
import { toast } from "../../lib/toast";
import {
  isSettled,
  overdueDebts,
  remainingAmount,
  totalLentOut,
  totalOwed,
} from "./debtSummary";
import { addDebt, deleteDebt, recordDebtPayment } from "./debtActions";

const TYPE_LABEL: Record<DebtType, string> = {
  loan: "Loan",
  emi: "EMI",
  borrowed: "Borrowed",
  lent: "Lent Out",
};

const TYPE_OPTIONS: DebtType[] = ["loan", "emi", "borrowed", "lent"];

function AddDebtForm() {
  const [type, setType] = useState<DebtType>("loan");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");

  const submit = async () => {
    const value = parseFloat(amount);
    if (!name.trim() || !Number.isFinite(value) || value <= 0) {
      toast("Enter a name and a valid amount.", "error");
      return;
    }
    await addDebt({
      type,
      name: name.trim(),
      amount: Math.round(value * 100) / 100,
      dueDate: dueDate || undefined,
      note: note.trim() || undefined,
    });
    setName("");
    setAmount("");
    setDueDate("");
    setNote("");
    toast("Added.");
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {TYPE_OPTIONS.map((t) => (
          <motion.button
            key={t}
            whileTap={{ scale: 0.94 }}
            onClick={() => setType(t)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              type === t
                ? "bg-cyan-500 text-white"
                : "bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300"
            }`}
          >
            {TYPE_LABEL[t]}
          </motion.button>
        ))}
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Who / what is this for?"
        className={inputClass}
      />
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        type="number"
        inputMode="decimal"
        placeholder="Amount (₹)"
        className={inputClass}
      />
      <input
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        type="date"
        placeholder="Due date (optional)"
        className={inputClass}
      />
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
        className={inputClass}
      />
      <Button onClick={submit} disabled={!name.trim() || !amount}>
        Add
      </Button>
    </div>
  );
}

function DebtRow({ debt }: { debt: Debt }) {
  const [paying, setPaying] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const remaining = remainingAmount(debt);
  const settled = isSettled(debt);
  const today = localDateStr();
  const overdue = !settled && debt.dueDate && debt.dueDate < today;

  const pay = async () => {
    const value = parseFloat(payAmount);
    if (!Number.isFinite(value) || value <= 0) {
      toast("Enter a valid payment amount.", "error");
      return;
    }
    await recordDebtPayment(debt.id, Math.round(value * 100) / 100);
    setPayAmount("");
    setPaying(false);
    toast("Payment recorded.");
  };

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`rounded-2xl p-3 ${
        settled
          ? "bg-slate-50/60 dark:bg-slate-700/20"
          : "bg-slate-50 dark:bg-slate-700/40"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-medium ${
                settled
                  ? "text-slate-400 line-through dark:text-slate-500"
                  : "text-slate-900 dark:text-white"
              }`}
            >
              {debt.name}
            </span>
            <span className="shrink-0 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-600/50 dark:text-slate-300">
              {TYPE_LABEL[debt.type]}
            </span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {settled
              ? `Settled · ₹${debt.amount.toLocaleString()}`
              : `₹${remaining.toLocaleString()} left of ₹${debt.amount.toLocaleString()}`}
            {debt.dueDate && (
              <span className={overdue ? "font-semibold text-red-500" : ""}>
                {" "}
                · {overdue ? "Overdue " : "Due "}
                {debt.dueDate}
              </span>
            )}
            {debt.note ? ` · ${debt.note}` : ""}
          </div>
        </div>
        <button
          onClick={() => deleteDebt(debt.id)}
          aria-label={`Delete ${debt.name}`}
          className="shrink-0 text-xs text-slate-400 hover:text-red-500"
        >
          ✕
        </button>
      </div>

      {!settled && (
        <div className="mt-2">
          {paying ? (
            <div className="flex gap-2">
              <input
                autoFocus
                type="number"
                inputMode="decimal"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && pay()}
                placeholder={`Up to ₹${remaining.toLocaleString()}`}
                className={`flex-1 !p-1.5 text-sm ${inputClass}`}
              />
              <button
                onClick={pay}
                className="rounded-lg bg-cyan-500 px-3 py-1 text-xs font-semibold text-white"
              >
                Save
              </button>
              <button
                onClick={() => setPaying(false)}
                className="rounded-lg px-2 py-1 text-xs font-medium text-slate-400"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setPaying(true);
                setPayAmount(String(remaining));
              }}
              className="text-xs font-semibold text-cyan-500 dark:text-cyan-300"
            >
              Record payment
            </button>
          )}
        </div>
      )}
    </motion.li>
  );
}

export function DebtManager() {
  const debts = useLiveQuery(() => db.debts.toArray(), []) ?? [];
  const active = debts
    .filter((d) => !isSettled(d))
    .sort((a, b) => (a.dueDate ?? "9999-99-99").localeCompare(b.dueDate ?? "9999-99-99"));
  const settled = debts.filter(isSettled);
  const overdue = overdueDebts(debts);

  return (
    <div className="flex flex-col gap-4">
      <Card title="Debts Overview">
        <div className="grid grid-cols-2 gap-2 text-center">
          <div>
            <div className="text-lg font-bold text-red-500">
              <AnimatedNumber value={totalOwed(debts)} prefix="₹" />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              You owe
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-emerald-500">
              <AnimatedNumber value={totalLentOut(debts)} prefix="₹" />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Owed to you
            </div>
          </div>
        </div>
        {overdue.length > 0 && (
          <div className="mt-3 rounded-xl bg-red-50 p-2 text-center text-xs font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400">
            {overdue.length} overdue — {overdue.map((d) => d.name).join(", ")}
          </div>
        )}
      </Card>

      <Card title="Add Debt" delay={0.05}>
        <AddDebtForm />
      </Card>

      <Card title="Active" delay={0.08}>
        <ul className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {active.map((d) => (
              <DebtRow key={d.id} debt={d} />
            ))}
          </AnimatePresence>
          {active.length === 0 && (
            <li className="text-sm text-slate-500 dark:text-slate-400">
              Nothing owed either way.
            </li>
          )}
        </ul>
      </Card>

      {settled.length > 0 && (
        <Card title="Settled" delay={0.1}>
          <ul className="flex flex-col gap-2">
            {settled.map((d) => (
              <DebtRow key={d.id} debt={d} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
