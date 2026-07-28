import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { db } from "../../db/db";
import { localDateStr } from "../../lib/dates";
import { toast } from "../../lib/toast";
import { inputClass } from "../../components/inputStyles";
import { Button } from "../../components/Button";

type CaptureKind = "expense" | "note" | "goal" | "weight" | "task";

const KINDS: { kind: CaptureKind; icon: string; label: string }[] = [
  { kind: "expense", icon: "💸", label: "Expense" },
  { kind: "task", icon: "☑️", label: "Task" },
  { kind: "note", icon: "📝", label: "Note" },
  { kind: "goal", icon: "🎯", label: "Goal" },
  { kind: "weight", icon: "⚖️", label: "Weight" },
];

/**
 * One-tap capture: the fastest possible path from "I should log this" to
 * it being logged. Deliberately minimal fields — deeper editing lives in
 * each module.
 */
export function QuickCapture() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<CaptureKind | null>(null);
  const [value, setValue] = useState("");
  const [category, setCategory] = useState("");

  const expenseCategories =
    useLiveExpenseCategories();

  const close = () => {
    setOpen(false);
    setKind(null);
    setValue("");
    setCategory("");
  };

  const submit = async () => {
    const text = value.trim();
    if (!text) return;

    try {
      if (kind === "expense") {
        const amount = parseFloat(text);
        if (!Number.isFinite(amount) || amount <= 0) {
          toast("Enter an amount greater than zero.", "error");
          return;
        }
        const cat = category || expenseCategories[0];
        if (!cat) {
          toast("Add an expense category in Finance first.", "error");
          return;
        }
        await db.transactions.add({
          date: localDateStr(),
          type: "expense",
          amount: Math.round(amount * 100) / 100,
          category: cat,
        } as never);
        toast(`₹${amount.toLocaleString()} logged to ${cat}.`);
      } else if (kind === "task") {
        await db.tasks.add({
          title: text,
          done: false,
          createdAt: Date.now(),
        } as never);
        toast("Task added.");
      } else if (kind === "note") {
        await db.notes.add({
          title: `Quick note — ${new Date().toLocaleString()}`,
          body: text,
          tags: [],
          pinned: false,
          sensitive: false,
          createdAt: Date.now(),
        } as never);
        toast("Note saved.");
      } else if (kind === "goal") {
        await db.goals.add({ title: text, status: "active" } as never);
        toast("Goal added.");
      } else if (kind === "weight") {
        const w = parseFloat(text);
        if (!Number.isFinite(w) || w <= 0) {
          toast("Enter a valid weight.", "error");
          return;
        }
        await db.healthMetrics.add({
          date: localDateStr(),
          metricType: "weight",
          value: w,
        } as never);
        toast("Weight logged.");
      }
      close();
    } catch (err) {
      console.error(err);
      toast("Couldn't save that.", "error");
    }
  };

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen((v) => !v)}
        aria-label="Quick capture"
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 text-2xl text-slate-900 shadow-lg"
      >
        {open ? "✕" : "+"}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-20 flex items-end justify-center bg-slate-900/40 p-4 pb-40"
            onClick={close}
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl bg-white p-4 shadow-xl dark:bg-slate-800"
            >
              <div className="mb-3 flex flex-wrap gap-2">
                {KINDS.map((k) => (
                  <button
                    key={k.kind}
                    onClick={() => {
                      setKind(k.kind);
                      setValue("");
                    }}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                      kind === k.kind
                        ? "bg-cyan-500 text-slate-900"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300"
                    }`}
                  >
                    {k.icon} {k.label}
                  </button>
                ))}
              </div>

              {kind && (
                <div className="flex flex-col gap-2">
                  {kind === "expense" && expenseCategories.length > 0 && (
                    <select
                      value={category || expenseCategories[0]}
                      onChange={(e) => setCategory(e.target.value)}
                      className={inputClass}
                    >
                      {expenseCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  )}
                  <input
                    autoFocus
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submit()}
                    type={
                      kind === "expense" || kind === "weight"
                        ? "number"
                        : "text"
                    }
                    inputMode={
                      kind === "expense" || kind === "weight"
                        ? "decimal"
                        : "text"
                    }
                    placeholder={
                      kind === "expense"
                        ? "Amount (₹)"
                        : kind === "weight"
                          ? "Weight (kg)"
                          : kind === "task"
                            ? "What needs doing?"
                            : kind === "goal"
                              ? "What do you want to achieve?"
                              : "What's on your mind?"
                    }
                    className={inputClass}
                  />
                  <Button onClick={submit} disabled={!value.trim()}>
                    Save
                  </Button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Small local hook keeps the import list in this file tidy.
import { useLiveQuery } from "dexie-react-hooks";
function useLiveExpenseCategories(): string[] {
  const cats =
    useLiveQuery(
      () => db.financeCategories.where("kind").equals("expense").toArray(),
      [],
    ) ?? [];
  return cats.map((c) => c.name);
}
