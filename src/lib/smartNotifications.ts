/**
 * Pure decision logic for the four Smart Notification triggers — no Dexie,
 * no notification side effects, so it's fully unit-testable independent of
 * scheduler.tsx's poll/DB plumbing.
 */

export interface SmartNotifiedState {
  date: string;
  habitsLeft?: boolean;
  budgetClose?: boolean;
  missionOneLeft?: boolean;
  missionComplete?: boolean;
}

/**
 * Mirrors DashboardView's Today's Mission construction: due habits toggle
 * done/not-done in place, but a completed task simply drops out of the
 * `!t.done` slice on the next read — so within any one snapshot, every task
 * entry is done:false by construction. "Mission complete" only becomes true
 * once zero open tasks remain (within the first 5 shown) AND every due
 * habit is checked off.
 */
export function missionState(
  dueHabitsCount: number,
  habitsRemaining: number,
  openTasksCount: number,
): { size: number; remaining: number } {
  const size = dueHabitsCount + Math.min(openTasksCount, 5);
  const done = dueHabitsCount - habitsRemaining;
  return { size, remaining: size - done };
}

export type SmartTrigger =
  | { kind: "habitsLeft"; count: number }
  | { kind: "budgetClose" }
  | { kind: "missionOneLeft" }
  | { kind: "missionComplete" };

export interface SmartCheckInput {
  now: Date;
  habitsRemaining: number;
  missionSize: number;
  missionRemaining: number;
  todaySpend: number;
  /** null when no budgets are set — calcSafeToSpendToday returns null then. */
  safePerDay: number | null;
}

/**
 * Every trigger that's newly due this tick — independent conditions, so
 * more than one can fire in the same tick (e.g. mission-complete and
 * budget-close at once). Each is individually gated by `notified` so a
 * caller can mark exactly the ones it actually delivered.
 */
export function smartTriggersDue(
  input: SmartCheckInput,
  notified: SmartNotifiedState,
): SmartTrigger[] {
  const out: SmartTrigger[] = [];

  // habits-remaining: evening-gated so it's not a morning nag.
  if (!notified.habitsLeft && input.now.getHours() >= 18 && input.habitsRemaining > 0) {
    out.push({ kind: "habitsLeft", count: input.habitsRemaining });
  }

  // budget-proximity: today's spend crossing ~80% of the safe daily pace.
  if (
    !notified.budgetClose &&
    input.safePerDay !== null &&
    input.safePerDay > 0 &&
    input.todaySpend >= input.safePerDay * 0.8
  ) {
    out.push({ kind: "budgetClose" });
  }

  // one-task-from-mission-complete.
  if (!notified.missionOneLeft && input.missionSize > 0 && input.missionRemaining === 1) {
    out.push({ kind: "missionOneLeft" });
  }

  // mission-just-completed — the daily flag itself makes this a
  // false→true transition: it can only fire once, the first tick that
  // finds the mission complete.
  if (!notified.missionComplete && input.missionSize > 0 && input.missionRemaining === 0) {
    out.push({ kind: "missionComplete" });
  }

  return out;
}
