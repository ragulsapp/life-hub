import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion } from "framer-motion";
import { db } from "../../db/db";
import { monthLabel } from "../../lib/dates";
import { Card } from "../../components/Card";
import { AnimatedNumber } from "../../components/AnimatedNumber";
import { DonutChart, DONUT_PALETTE } from "../../components/DonutChart";
import { TransactionForm } from "./TransactionForm";
import { BudgetManager } from "./BudgetManager";
import { SpendingHistory } from "./SpendingHistory";
import { DebtManager } from "./DebtManager";
import { RecurringManager } from "./RecurringManager";
import { ReportsView } from "./ReportsView";
import {
  calcMonthTotals,
  calcMRR,
  calcSafeToSpendToday,
  currentMonthKey,
  expenseByCategory,
} from "./financeSummary";
import { DeleteButton } from "../../components/IconButton";
import { Segmented } from "../../components/Chip";

type SubTab = "overview" | "reports" | "debts";

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "reports", label: "Reports" },
  { id: "debts", label: "Debts" },
];

export function FinanceView() {
  const [subTab, setSubTab] = useState<SubTab>("overview");
  const transactions = useLiveQuery(() => db.transactions.toArray(), []) ?? [];
  const categories = useLiveQuery(() => db.financeCategories.toArray(), []) ?? [];
  const budgets = useLiveQuery(() => db.budgets.toArray(), []) ?? [];
  // The month being viewed. Every summary below is month-scoped, so this is
  // what makes past months openable rather than just drawable.
  const thisMonth = currentMonthKey();
  const [monthKey, setMonthKey] = useState(thisMonth);
  const viewingPast = monthKey !== thisMonth;

  // The list showed every transaction ever, ignoring the month entirely — so
  // even the current-month view was lying about what it was showing.
  const sorted = [...transactions]
    .filter((t) => t.date.startsWith(monthKey))
    .sort((a, b) => b.date.localeCompare(a.date));
  const { totalIncome, totalExpense, net } = calcMonthTotals(
    transactions,
    monthKey,
  );
  const mrr = calcMRR(transactions, monthKey, categories);
  // "Safe to spend today" divides what is left by the days remaining in the
  // month — a projection that means nothing for a month already over.
  const safe = viewingPast
    ? null
    : calcSafeToSpendToday(transactions, budgets, monthKey);

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
        Money
      </h1>

      <Segmented options={SUB_TABS} value={subTab} onChange={setSubTab} />

      {subTab === "debts" ? (
        <div className="flex flex-col gap-4">
          <DebtManager />
          <RecurringManager />
        </div>
      ) : subTab === "reports" ? (
        <ReportsView />
      ) : (
        <>
        {safe && (
          <Card title="Safe to Spend">
            <div className="flex items-baseline justify-between">
              <div>
                <div
                  className={`text-3xl font-extrabold tracking-tight ${
                    safe.remaining >= 0 ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  ₹{safe.perDay.toLocaleString()}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  per day for the rest of the month
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  ₹{safe.remaining.toLocaleString()}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {safe.remaining >= 0 ? "left" : "over"} of ₹
                  {safe.budgetTotal.toLocaleString()}
                </div>
              </div>
            </div>
          </Card>
        )}
  
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
            <div className="text-lg font-bold text-cyan-500 dark:text-cyan-300">
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
  
        <Card title="Spending History" delay={0.06}>
          <SpendingHistory
            transactions={transactions}
            monthKey={thisMonth}
            selectedKey={monthKey}
            onSelectMonth={setMonthKey}
          />
        </Card>
  
        <Card title="Budgets" delay={0.08}>
          <BudgetManager transactions={transactions} />
        </Card>
  
        <Card title="Add Transaction" delay={0.1}>
          <TransactionForm />
        </Card>
  
        <Card title={viewingPast ? `Transactions · ${monthLabel(monthKey)}` : "Transactions"} delay={0.1}>
          {viewingPast && (
            <button
              type="button"
              onClick={() => setMonthKey(thisMonth)}
              className="mb-3 rounded-full bg-cyan-500/12 px-3 py-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-300"
            >
              ← Back to this month
            </button>
          )}
          {sorted.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Nothing logged in {monthLabel(monthKey)}.
            </p>
          )}
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
                    <DeleteButton onDelete={() => remove(t.id)} label={`Delete ${t.category} transaction of ₹${t.amount}`} />
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
        </>
      )}
    </div>
  );
}
