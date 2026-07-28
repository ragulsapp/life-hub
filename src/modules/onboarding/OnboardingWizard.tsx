import { useState } from "react";
import { motion } from "framer-motion";
import { applyOnboardingSelections, db, STARTER_TEMPLATES } from "../../db/db";
import { Button } from "../../components/Button";
import { toast } from "../../lib/toast";

type Step = 0 | 1 | 2 | 3;

function Chips({
  options,
  selected,
  onToggle,
  renderLabel,
}: {
  options: readonly string[];
  selected: string[];
  onToggle: (v: string) => void;
  renderLabel?: (v: string) => string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <motion.button
          key={o}
          whileTap={{ scale: 0.94 }}
          onClick={() => onToggle(o)}
          aria-pressed={selected.includes(o)}
          className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${
            selected.includes(o)
              ? "bg-cyan-500 text-slate-900"
              : "bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300"
          }`}
        >
          {renderLabel ? renderLabel(o) : o}
        </motion.button>
      ))}
    </div>
  );
}

export function OnboardingWizard() {
  const [step, setStep] = useState<Step>(0);
  const [habits, setHabits] = useState<string[]>([]);
  const [income, setIncome] = useState<string[]>([]);
  const [expense, setExpense] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggle =
    (setter: React.Dispatch<React.SetStateAction<string[]>>) => (v: string) =>
      setter((prev) =>
        prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v],
      );

  const finish = async (skip = false) => {
    setSaving(true);
    try {
      if (skip) {
        await db.appSettings.update(1, { onboardingComplete: true });
      } else {
        await applyOnboardingSelections({
          habits,
          incomeCategories: income,
          expenseCategories: expense,
          goals,
        });
      }
    } catch (err) {
      console.error(err);
      toast("Couldn't save your setup — please try again.", "error");
      setSaving(false);
    }
  };

  const habitIcon = (name: string) =>
    STARTER_TEMPLATES.habits.find((h) => h.name === name)?.icon ?? "🎯";

  const steps = [
    {
      title: "Welcome to LifeOS",
      subtitle:
        "One place that tells you what to do next — habits, money, goals, all in one view.",
      body: (
        <div className="flex flex-col gap-3 text-sm text-slate-600 dark:text-slate-300">
          <p>
            Everything stays on this device. Nothing is uploaded, nothing is
            shared.
          </p>
          <p>
            Next, pick a few starting points. You can change all of it later —
            or skip and start completely blank.
          </p>
        </div>
      ),
    },
    {
      title: "Pick a few habits",
      subtitle: "Choose what you want to build. Two get pinned to your Dashboard.",
      body: (
        <Chips
          options={STARTER_TEMPLATES.habits.map((h) => h.name)}
          selected={habits}
          onToggle={toggle(setHabits)}
          renderLabel={(n) => `${habitIcon(n)} ${n}`}
        />
      ),
    },
    {
      title: "Money categories",
      subtitle: "So the app can tell you what's safe to spend.",
      body: (
        <div className="flex flex-col gap-4">
          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              Income
            </div>
            <Chips
              options={STARTER_TEMPLATES.incomeCategories}
              selected={income}
              onToggle={toggle(setIncome)}
            />
          </div>
          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              Expenses
            </div>
            <Chips
              options={STARTER_TEMPLATES.expenseCategories}
              selected={expense}
              onToggle={toggle(setExpense)}
            />
          </div>
        </div>
      ),
    },
    {
      title: "What are you working toward?",
      subtitle: "Pick any that fit — you can add your own later.",
      body: (
        <Chips
          options={STARTER_TEMPLATES.goals}
          selected={goals}
          onToggle={toggle(setGoals)}
        />
      ),
    },
  ];

  const current = steps[step];
  const isLast = step === 3;

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col justify-between p-6">
      {/* Enter-only: no exit animation to wait on, so a step can never be
          left half-rendered if the app is backgrounded mid-transition. */}
      <div className="flex-1 pt-12">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-cyan-500">
            Step {step + 1} of {steps.length}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {current.title}
          </h1>
          <p className="mb-6 mt-1 text-sm text-slate-500 dark:text-slate-400">
            {current.subtitle}
          </p>
          {current.body}
        </motion.div>
      </div>

      <div className="flex flex-col gap-2 pb-4">
        <Button
          onClick={() => (isLast ? finish() : setStep((s) => (s + 1) as Step))}
          disabled={saving}
          className="w-full"
        >
          {isLast ? (saving ? "Setting up…" : "Finish setup") : "Continue"}
        </Button>
        <button
          onClick={() =>
            step === 0 ? finish(true) : setStep((s) => (s - 1) as Step)
          }
          disabled={saving}
          className="py-2 text-sm font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          {step === 0 ? "Skip — start blank" : "Back"}
        </button>
      </div>
    </div>
  );
}
