import type { FastingSession } from "../../db/db";
import { fastNotifId, scheduleOnce } from "../../lib/notify";

/**
 * The words for a fast reaching its length. Neutral on purpose — a fast may
 * be an observance, so "time to eat!" is not ours to say. Shared by the OS
 * schedule and the in-browser poll so the two can never drift apart.
 */
export function fastCompleteCopy(f: Pick<FastingSession, "label" | "targetHours">) {
  return {
    title: f.label ? `${f.label} — ${f.targetHours}h reached` : "Fast complete",
    body: `You've reached ${f.targetHours} hours.`,
  };
}

/** When a fast reaches its target. */
export function fastTargetAt(f: Pick<FastingSession, "startedAt" | "targetHours">): Date {
  return new Date(f.startedAt + f.targetHours * 3_600_000);
}

/** Put a fast's completion on the OS schedule. */
export function scheduleFastComplete(
  f: Pick<FastingSession, "id" | "startedAt" | "targetHours" | "label">,
): Promise<void> {
  const { title, body } = fastCompleteCopy(f);
  return scheduleOnce(fastNotifId(f.id), title, body, fastTargetAt(f));
}
