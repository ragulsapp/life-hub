// fake-indexeddb must load before Dexie touches indexedDB.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { applyOnboardingSelections, db, ensureSeeded, onboardingDoneFields } from "../src/db/db";
import { localDateStr } from "../src/lib/dates";

/**
 * Found on a fresh-install walkthrough: finishing the six-step setup dropped
 * the user straight into a second full-screen gate, the "Good morning"
 * brief. Two welcomes in a row. Finishing (or skipping) setup now counts as
 * today's brief; it returns from tomorrow.
 */
beforeEach(async () => {
  await db.delete();
  await db.open();
  await ensureSeeded();
});

describe("finishing onboarding", () => {
  it("counts as today's morning brief", async () => {
    await applyOnboardingSelections({ incomeCategories: [], expenseCategories: [], goals: [] });
    const s = await db.appSettings.get(1);
    expect(s?.onboardingComplete).toBe(true);
    expect(s?.morningBriefShownDate).toBe(localDateStr());
  });

  it("skipping uses the same fields", () => {
    const f = onboardingDoneFields();
    expect(f.onboardingComplete).toBe(true);
    expect(f.morningBriefShownDate).toBe(localDateStr());
    expect(typeof f.onboardingCompletedAt).toBe("number");
  });
});
