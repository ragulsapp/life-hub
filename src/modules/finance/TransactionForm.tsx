import { localDateStr } from "../../lib/dates";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { motion } from "framer-motion";
import { db, type FinanceCategoryKind } from "../../db/db";
import { Button } from "../../components/Button";
import { inputClass } from "../../components/inputStyles";
import { AddChip, Chip } from "../../components/Chip";
import { PlusIcon } from "../../components/Icons";

const todayStr = () => localDateStr();

export function TransactionForm({ onSaved }: { onSaved?: () => void } = {}) {
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
    onSaved?.();
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
        <div className="mb-1.5 text-caption font-semibold text-slate-500 dark:text-slate-400">
          Category
        </div>
        <div className="flex flex-wrap gap-2">
          {filtered.map((c) => (
            <Chip
              key={c.id}
              selected={activeCategory === c.name}
              onClick={() => {
                setCategory(c.name);
                setAddingCategory(false);
              }}
            >
              {c.name}
            </Chip>
          ))}
          <AddChip onClick={() => setAddingCategory((v) => !v)}>
            <PlusIcon size={14} />
            Add
          </AddChip>
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
