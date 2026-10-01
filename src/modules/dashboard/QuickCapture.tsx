import { useState } from "react";
import { db } from "../../db/db";
import { localDateStr } from "../../lib/dates";
import { toast } from "../../lib/toast";
import { inputClass } from "../../components/inputStyles";
import { Button } from "../../components/Button";
import { logMetric } from "../health/healthActions";
import {
  CheckSquareIcon,
  NoteIcon,
  ScaleIcon,
  TargetIcon,
  WalletIcon,
} from "../../components/Icons";

type CaptureKind = "expense" | "note" | "goal" | "weight" | "task";

const KINDS: {
  kind: CaptureKind;
  Icon: (p: { size?: number }) => React.ReactElement;
  label: string;
}[] = [
  { kind: "expense", Icon: WalletIcon, label: "Expense" },
  { kind: "task", Icon: CheckSquareIcon, label: "Task" },
  { kind: "note", Icon: NoteIcon, label: "Note" },
  { kind: "goal", Icon: TargetIcon, label: "Goal" },
  { kind: "weight", Icon: ScaleIcon, label: "Weight" },
];

/**
 * One-tap capture: the fastest possible path from "I should log this" to
 * it being logged. Deliberately minimal fields — deeper editing lives in
 * each module.
 */
export function QuickCaptureBody({ onDone }: { onDone: () => void }) {
  const [kind, setKind] = useState<CaptureKind | null>(null);
  const [value, setValue] = useState("");
  const [category, setCategory] = useState("");

  const expenseCategories =
    useLiveExpenseCategories();

  const close = () => {
    setKind(null);
    setValue("");
    setCategory("");
    onDone();
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
        await db.goals.add({
          title: text,
          status: "active",
          createdAt: Date.now(),
        } as never);
        toast("Goal added.");
      } else if (kind === "weight") {
        const w = parseFloat(text);
        if (!Number.isFinite(w) || w <= 0) {
          toast("Enter a valid weight.", "error");
          return;
        }
        // Via logMetric so a second weigh-in corrects today rather than
        // adding a duplicate row (which used to plot as an extra chart point).
        await logMetric("weight", w);
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
      <div className="mb-3 flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button
            key={k.kind}
            onClick={() => {
              setKind(k.kind);
              setValue("");
            }}
            aria-pressed={kind === k.kind}
            className={`inline-flex h-11 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors ${
              kind === k.kind
                ? "bg-cyan-500 text-white"
                : "bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300"
            }`}
          >
            <k.Icon size={15} />
            {k.label}
          </button>
        ))}
      </div>

      {kind ? (
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
            type={kind === "expense" || kind === "weight" ? "number" : "text"}
            inputMode={
              kind === "expense" || kind === "weight" ? "decimal" : "text"
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
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Pick what you’re capturing.
        </p>
      )}
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
