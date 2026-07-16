import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { motion } from "framer-motion";
import { db } from "../../db/db";
import { currentMonthKey, sumByCategory } from "./financeSummary";
import { inputClass } from "../../components/inputStyles";

export function BudgetManager({
  transactions,
}: {
  transactions: import("../../db/db").Transaction[];
}) {
  const expenseCategories =
    useLiveQuery(
      () => db.financeCategories.where("kind").equals("expense").toArray(),
      [],
    ) ?? [];
  const budgets = useLiveQuery(() => db.budgets.toArray(), []) ?? [];
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const monthKey = currentMonthKey();

  const budgetFor = (category: string) =>
    budgets.find((b) => b.category === category);

  const saveBudget = async (category: string) => {
    const amount = Math.round(parseFloat(draft) * 100) / 100;
    const existing = budgetFor(category);
    if (!Number.isFinite(amount) || amount <= 0) {
      if (existing) await db.budgets.delete(existing.id);
    } else if (existing) {
      await db.budgets.update(existing.id, { amount });
    } else {
      await db.budgets.add({ category, amount } as never);
    }
    setEditing(null);
    setDraft("");
  };

  return (
    <div className="flex flex-col gap-3">
      {expenseCategories.map((cat) => {
        const budget = budgetFor(cat.name);
        const spent = sumByCategory(transactions, cat.name, monthKey);
        const limit = budget?.amount ?? 0;
        const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
        const over = limit > 0 && spent > limit;
        const isEditing = editing === cat.name;

        return (
          <div key={cat.id}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {cat.name}
              </span>
              {isEditing ? (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    type="number"
                    inputMode="decimal"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveBudget(cat.name)}
                    placeholder="Limit ₹"
                    className={`w-24 !p-1.5 text-sm ${inputClass}`}
                  />
                  <button
                    onClick={() => saveBudget(cat.name)}
                    className="rounded-lg bg-cyan-500 px-2 py-1 text-xs font-semibold text-slate-900"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEditing(cat.name);
                    setDraft(limit ? String(limit) : "");
                  }}
                  className={`text-xs font-semibold ${
                    over ? "text-red-500" : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  ₹{spent.toLocaleString()}
                  {limit > 0 ? ` / ₹${limit.toLocaleString()}` : " · Set budget"}
                </button>
              )}
            </div>
            {limit > 0 && (
              <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700/50">
                <motion.div
                  className={`h-full rounded-full ${
                    over
                      ? "bg-red-500"
                      : pct > 80
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            )}
            {over && (
              <div className="mt-0.5 text-xs font-medium text-red-500">
                Over by ₹{(spent - limit).toLocaleString()}
              </div>
            )}
          </div>
        );
      })}
      {expenseCategories.length === 0 && (
        <span className="text-sm text-slate-400">
          Add expense categories to set budgets.
        </span>
      )}
    </div>
  );
}
