import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type FinanceCategoryKind } from "../../db/db";
import { Button } from "../../components/Button";
import { inputClass } from "../../components/inputStyles";

const todayStr = () => new Date().toISOString().slice(0, 10);

export function TransactionForm() {
  const categories = useLiveQuery(() => db.financeCategories.toArray(), []) ?? [];
  const [type, setType] = useState<FinanceCategoryKind>("income");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");

  const filtered = categories.filter((c) => c.kind === type);
  const activeCategory = category || filtered[0]?.name || "";

  const submit = async () => {
    const value = parseFloat(amount);
    if (!value || !activeCategory) return;
    await db.transactions.add({
      date: todayStr(),
      type,
      amount: value,
      category: activeCategory,
      note: note.trim() || undefined,
    } as never);
    setAmount("");
    setNote("");
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Button
          variant={type === "income" ? "primary" : "secondary"}
          onClick={() => {
            setType("income");
            setCategory("");
          }}
          className="flex-1"
        >
          Income
        </Button>
        <Button
          variant={type === "expense" ? "primary" : "secondary"}
          onClick={() => {
            setType("expense");
            setCategory("");
          }}
          className="flex-1"
        >
          Expense
        </Button>
      </div>
      <select
        value={activeCategory}
        onChange={(e) => setCategory(e.target.value)}
        className={inputClass}
      >
        {filtered.map((c) => (
          <option key={c.id} value={c.name}>
            {c.name}
          </option>
        ))}
      </select>
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
