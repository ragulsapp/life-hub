import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion } from "framer-motion";
import { db } from "../../db/db";
import { Card } from "../../components/Card";
import { AnimatedNumber } from "../../components/AnimatedNumber";
import { DonutChart, DONUT_PALETTE } from "../../components/DonutChart";
import { TransactionForm } from "./TransactionForm";
import { BudgetManager } from "./BudgetManager";
import {
  calcMonthTotals,
  calcMRR,
  currentMonthKey,
  expenseByCategory,
} from "./financeSummary";

export function FinanceView() {
  const transactions = useLiveQuery(() => db.transactions.toArray(), []) ?? [];
  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date));
  const monthKey = currentMonthKey();
  const { totalIncome, totalExpense, net } = calcMonthTotals(
    transactions,
    monthKey,
  );
  const mrr = calcMRR(transactions, monthKey);

  const byCategory = expenseByCategory(transactions, monthKey);
  const donutSlices = byCategory.map((c, i) => ({
    label: c.category,
    value: c.total,
    color: DONUT_PALETTE[i % DONUT_PALETTE.length],
  }));

  const remove = async (id: number) => {
    await db.transactions.delete(id);
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        Finance
      </h1>

      <Card title="This Month">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-lg font-bold text-emerald-500">
              <AnimatedNumber value={totalIncome} prefix="₹" />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Income
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-red-500">
              <AnimatedNumber value={totalExpense} prefix="₹" />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Expense
            </div>
          </div>
          <div>
            <div
              className={`text-lg font-bold ${
                net >= 0 ? "text-emerald-500" : "text-red-500"
              }`}
            >
              <AnimatedNumber value={net} prefix="₹" />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Net
            </div>
          </div>
        </div>
        <div className="mt-3 border-t border-slate-200/70 pt-3 text-center dark:border-slate-600/50">
          <div className="text-lg font-bold text-cyan-500">
            <AnimatedNumber value={mrr} prefix="₹" />
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            MRR (recurring income)
          </div>
        </div>
      </Card>

      <Card title="Spending Breakdown" delay={0.05}>
        <DonutChart
          slices={donutSlices}
          centerValue={`₹${totalExpense.toLocaleString()}`}
          centerLabel="spent"
        />
      </Card>

      <Card title="Budgets" delay={0.08}>
        <BudgetManager transactions={transactions} />
      </Card>

      <Card title="Add Transaction" delay={0.1}>
        <TransactionForm />
      </Card>

      <Card title="Transactions" delay={0.1}>
        <ul className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {sorted.map((t, i) => (
              <motion.li
                key={t.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.02 }}
                className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 dark:bg-slate-700/40"
              >
                <div>
                  <div className="font-medium text-slate-900 dark:text-white">
                    {t.category}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {t.date}
                    {t.note ? ` · ${t.note}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`font-bold ${
                      t.type === "income" ? "text-emerald-500" : "text-red-500"
                    }`}
                  >
                    {t.type === "income" ? "+" : "-"}₹
                    {t.amount.toLocaleString()}
                  </span>
                  <button
                    onClick={() => remove(t.id)}
                    aria-label={`Delete ${t.category} transaction of ₹${t.amount}`}
                    className="text-xs text-slate-400 hover:text-red-500"
                  >
                    ✕
                  </button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
          {sorted.length === 0 && (
            <li className="text-sm text-slate-500 dark:text-slate-400">
              No transactions yet.
            </li>
          )}
        </ul>
      </Card>
    </div>
  );
}
