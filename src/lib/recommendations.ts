/**
 * The "one focus recommendation" rule engine.
 *
 * Deliberately an ordered rule list, not a model: it's inspectable, testable,
 * instant, works offline, and never sends data anywhere. Rules are evaluated
 * top-down and the FIRST match wins — order encodes priority, so put the
 * things a person most needs to hear first.
 */
import type { Budget, Goal, Habit, HabitLog, Transaction } from "../db/db";
import { localDateStr } from "./dates";
import { isDueOn } from "../modules/habits/habitStreaks";
import { calcSafeToSpendToday, categoryDeltas } from "../modules/finance/financeSummary";

export type RecommendationKind =
  | "habit-recovery"
  | "overspend"
  | "goal-nearly-done"
  | "goal-overdue"
  | "spending-spike"
  | "momentum"
  | "get-started"
  | "all-clear";

export interface Recommendation {
  kind: RecommendationKind;
  /** Short, action-first sentence. Never scolding. */
  message: string;
  /** Optional deep-link target tab. */
  tab?: "habits" | "finance" | "goals" | "health" | "notes";
}

export interface RecommendationInput {
  habits: Habit[];
  logs: HabitLog[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  monthKey: string;
  now?: Date;
}

/**
 * Consecutive days a due habit was missed, counting back from yesterday.
 * Never looks earlier than the habit was created — a brand-new habit must
 * not report a month of "misses" from before it existed.
 */
export function consecutiveMisses(
  habit: Habit,
  logs: HabitLog[],
  now = new Date(),
): number {
  const completed = new Set(
    logs
      .filter((l) => l.completed && l.habitName === habit.name)
      .map((l) => l.date),
  );
  const createdDay = habit.createdAt ? localDateStr(new Date(habit.createdAt)) : null;

  let misses = 0;
  for (let i = 1; i <= 30; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const ds = localDateStr(d);
    if (createdDay && ds < createdDay) break; // predates the habit
    if (!isDueOn(habit.schedule, d)) continue;
    if (completed.has(ds)) break;
    misses += 1;
  }
  return misses;
}

export function getRecommendation(input: RecommendationInput): Recommendation {
  const { habits, logs, transactions, budgets, goals, monthKey } = input;
  const now = input.now ?? new Date();
  const active = habits.filter((h) => !h.archived);

  // Nothing to work with yet.
  if (active.length === 0 && goals.length === 0) {
    return {
      kind: "get-started",
      message: "Add your first habit to start building momentum.",
      tab: "habits",
    };
  }

  // 1. A slipping habit matters most — this is the moment people quit.
  //    Offer a smaller target rather than guilt.
  const slipping = active
    .map((h) => ({ habit: h, misses: consecutiveMisses(h, logs, now) }))
    .filter((x) => x.misses >= 2)
    .sort((a, b) => b.misses - a.misses)[0];
  if (slipping) {
    return {
      kind: "habit-recovery",
      message: `You've missed ${slipping.habit.name} ${slipping.misses} days. Try a smaller version today — even 5 minutes counts.`,
      tab: "habits",
    };
  }

  // 2. Over budget — say it plainly, no advice, just the number.
  const safe = calcSafeToSpendToday(transactions, budgets, monthKey, now);
  if (safe && safe.remaining < 0) {
    return {
      kind: "overspend",
      message: `You're ₹${Math.abs(safe.remaining).toLocaleString()} over budget this month. Hold off on non-essentials.`,
      tab: "finance",
    };
  }

  // 3. Celebrate a goal about to land — cheap, high-motivation moment.
  const nearlyDone = goals.find(
    (g) =>
      g.status === "active" &&
      (g.linkedHabits?.length ?? 0) > 0 &&
      g.linkedHabits!.every((name) =>
        logs.some(
          (l) =>
            l.habitName === name &&
            l.completed &&
            l.date === localDateStr(now),
        ),
      ),
  );
  if (nearlyDone) {
    return {
      kind: "goal-nearly-done",
      message: `Every step for "${nearlyDone.title}" is done today. Strong work.`,
      tab: "goals",
    };
  }

  // 4. An overdue goal needs a decision, not a nag.
  const today = localDateStr(now);
  const overdue = goals.find(
    (g) => g.status === "active" && g.targetDate && g.targetDate < today,
  );
  if (overdue) {
    return {
      kind: "goal-overdue",
      message: `"${overdue.title}" passed its target date. Push the date or close it out.`,
      tab: "goals",
    };
  }

  // 5. A spending category that jumped — observation only, never advice.
  const spike = categoryDeltas(transactions, monthKey).find(
    (d) => d.pctChange >= 30,
  );
  if (spike) {
    return {
      kind: "spending-spike",
      message: `${spike.category} is ${spike.pctChange}% higher than last month.`,
      tab: "finance",
    };
  }

  // 6. Still something due today.
  const dueToday = active.filter((h) => isDueOn(h.schedule, now));
  const doneToday = new Set(
    logs.filter((l) => l.completed && l.date === today).map((l) => l.habitName),
  );
  const remaining = dueToday.filter((h) => !doneToday.has(h.name));
  if (remaining.length > 0) {
    return {
      kind: "momentum",
      message:
        remaining.length === 1
          ? `Only ${remaining[0].name} left today. Finish strong.`
          : `${remaining.length} habits left today. Start with ${remaining[0].name}.`,
      tab: "habits",
    };
  }

  return {
    kind: "all-clear",
    message: "Everything due today is done. Enjoy the evening.",
  };
}
