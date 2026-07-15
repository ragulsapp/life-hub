import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion } from "framer-motion";
import { db } from "../../db/db";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { AnimatedNumber } from "../../components/AnimatedNumber";
import { calcProfitMargin, currentMonthKey } from "../finance/financeSummary";
import { TodayAgenda } from "./TodayAgenda";

const todayStr = () => new Date().toISOString().slice(0, 10);

function useTodayMetric(metricType: "15.5h-fast" | "titan-powder") {
  const today = todayStr();
  const record = useLiveQuery(
    () =>
      db.healthMetrics
        .where({ date: today, metricType })
        .first(),
    [today, metricType],
  );

  const toggle = async () => {
    const existing = await db.healthMetrics
      .where({ date: today, metricType })
      .first();
    if (existing) {
      await db.healthMetrics.update(existing.id, {
        value: existing.value ? 0 : 1,
      });
    } else {
      await db.healthMetrics.add({
        date: today,
        metricType,
        value: 1,
      } as never);
    }
  };

  return { done: !!record?.value, toggle };
}

function ToggleTile({
  label,
  done,
  onToggle,
  gradient,
  glow,
  icon,
}: {
  label: string;
  done: boolean;
  onToggle: () => void;
  gradient: string;
  glow: string;
  icon: string;
}) {
  return (
    <motion.button
      onClick={onToggle}
      whileTap={{ scale: 0.94 }}
      animate={done ? { scale: [1, 1.04, 1] } : { scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`relative overflow-hidden rounded-3xl p-5 text-center transition-colors ${
        done
          ? `bg-gradient-to-br ${gradient} text-slate-900 shadow-lg ${glow}`
          : "glass border border-white/60 bg-white/70 text-slate-400 dark:border-white/5 dark:bg-slate-800/60 dark:text-slate-500"
      }`}
    >
      <div className="text-2xl">{icon}</div>
      <div className="mt-1 text-base font-bold">{label}</div>
      <div className="text-xs font-medium opacity-80">
        {done ? "Done today ✓" : "Tap to log"}
      </div>
      <AnimatePresence>
        {done && (
          <motion.div
            initial={{ scale: 0, opacity: 0.6 }}
            animate={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="pointer-events-none absolute inset-0 rounded-3xl bg-white"
          />
        )}
      </AnimatePresence>
    </motion.button>
  );
}

export function DashboardView() {
  const fast = useTodayMetric("15.5h-fast");
  const titan = useTodayMetric("titan-powder");
  const [brainDump, setBrainDump] = useState("");
  const [saved, setSaved] = useState(false);

  const monthKey = currentMonthKey();
  const transactions = useLiveQuery(() => db.transactions.toArray(), []) ?? [];
  const { income, expense, profit } = calcProfitMargin(transactions, monthKey);

  const saveBrainDump = async () => {
    const text = brainDump.trim();
    if (!text) return;
    await db.notes.add({
      title: `Brain Dump — ${new Date().toLocaleString()}`,
      body: text,
      tags: [],
      pinned: false,
      createdAt: Date.now(),
    } as never);
    setBrainDump("");
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <motion.h1
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white"
      >
        Command Center
      </motion.h1>

      <div className="grid grid-cols-2 gap-3">
        <ToggleTile
          label="15.5h Fast"
          icon="⏱️"
          done={fast.done}
          onToggle={fast.toggle}
          gradient="from-emerald-300 to-teal-400"
          glow="shadow-emerald-400/30"
        />
        <ToggleTile
          label="Titan Powder"
          icon="⚡"
          done={titan.done}
          onToggle={titan.toggle}
          gradient="from-amber-300 to-orange-400"
          glow="shadow-amber-400/30"
        />
      </div>

      <Card title="Profit Margin (This Month)" delay={0.05}>
        <div className="flex items-baseline justify-between">
          <span
            className={`text-4xl font-extrabold tracking-tight ${
              profit >= 0 ? "text-emerald-500" : "text-red-500"
            }`}
          >
            <AnimatedNumber value={profit} prefix="₹" />
          </span>
        </div>
        <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Retainers {income.toLocaleString()} − Meta Ad Spend{" "}
          {expense.toLocaleString()}
        </div>
      </Card>

      <Card title="Quick Brain Dump" delay={0.1}>
        <textarea
          value={brainDump}
          onChange={(e) => setBrainDump(e.target.value)}
          placeholder="Type anything — saves straight to Notes..."
          rows={3}
          className="w-full resize-none rounded-xl border border-slate-200 bg-white/50 p-2.5 text-slate-900 outline-none transition-colors focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 dark:border-slate-600 dark:bg-slate-900/30 dark:text-white"
        />
        <div className="mt-2 flex items-center justify-between">
          <AnimatePresence>
            {saved && (
              <motion.span
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-sm font-medium text-emerald-500"
              >
                Saved ✓
              </motion.span>
            )}
          </AnimatePresence>
          <Button
            onClick={saveBrainDump}
            disabled={!brainDump.trim()}
            className="ml-auto"
          >
            Save
          </Button>
        </div>
      </Card>

      <TodayAgenda />
    </div>
  );
}
