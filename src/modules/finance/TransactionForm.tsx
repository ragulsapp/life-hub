import { localDateStr } from "../../lib/dates";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { motion } from "framer-motion";
import { db, type FinanceCategoryKind } from "../../db/db";
import { Button } from "../../components/Button";
import { inputClass } from "../../components/inputStyles";

const todayStr = () => localDateStr();

export function TransactionForm() {
  const categories = useLiveQuery(() => db.financeCategories.toArray(), []) ?? [];
  const [type, setType] = useState<FinanceCategoryKind>("income");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  const filtered = categories.filter((c) => c.kind === type);
  const activeCategory = category || filtered[0]?.name || "";

  const selectType = (t: FinanceCategoryKind) => {
    setType(t);
    setCategory("");
    setAddingCategory(false);
  };

  const addCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    const exists = categories.some(
      (c) => c.kind === type && c.name.toLowerCase() === name.toLowerCase(),
    );
    if (!exists) {
      await db.financeCategories.add({ name, kind: type } as never);
    }
    setCategory(name);
    setNewCategory("");
    setAddingCategory(false);
  };

  const submit = async () => {
    const value = parseFloat(amount);
    // Reject NaN, zero, and negatives — sign comes from the type toggle,
    // and negative amounts would silently corrupt totals and budgets (M1).
    if (!Number.isFinite(value) || value <= 0 || !activeCategory) return;
    await db.transactions.add({
      date: todayStr(),
      type,
      amount: Math.round(value * 100) / 100,
      category: activeCategory,
      note: note.trim() || undefined,
    } as never);
    setAmount("");
    setNote("");
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Button
          variant={type === "income" ? "primary" : "secondary"}
          onClick={() => selectType("income")}
          className="flex-1"
        >
          Income
        </Button>
        <Button
          variant={type === "expense" ? "primary" : "secondary"}
          onClick={() => selectType("expense")}
          className="flex-1"
        >
          Expense
        </Button>
      </div>

      <div>
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
          Category
        </div>
        <div className="flex flex-wrap gap-2">
          {filtered.map((c) => (
            <motion.button
              key={c.id}
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                setCategory(c.name);
                setAddingCategory(false);
              }}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                activeCategory === c.name
                  ? "bg-cyan-500 text-slate-900"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300"
              }`}
            >
              {c.name}
            </motion.button>
          ))}
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => setAddingCategory((v) => !v)}
            className="rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-500 hover:border-cyan-400 hover:text-cyan-500 dark:border-slate-600 dark:text-slate-400"
          >
            ＋ Add
          </motion.button>
        </div>

        {addingCategory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-2 flex gap-2 overflow-hidden"
          >
            <input
              autoFocus
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
              placeholder={`New ${type} category...`}
              className={`flex-1 ${inputClass}`}
            />
            <Button onClick={addCategory} disabled={!newCategory.trim()}>
              Save
            </Button>
          </motion.div>
        )}
      </div>

      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        type="number"
        inputMode="decimal"
        placeholder="Amount (₹)"
        className={inputClass}
      />
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
        className={inputClass}
      />
      <Button onClick={submit} disabled={!amount || !activeCategory}>
        Add Transaction
      </Button>
    </div>
  );
}
