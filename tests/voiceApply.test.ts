// fake-indexeddb must load before Dexie touches indexedDB.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The confirm card hands the approved actions here. Each becomes the same
 * row the app's own forms would make, alarms go onto Android's schedule
 * through the save-first helper, and anything unrecognised is skipped —
 * never turned into something.
 */
const scheduledAlarms: unknown[] = [];
vi.mock("../src/lib/notify", async (orig) => {
  const real = await orig<typeof import("../src/lib/notify")>();
  return {
    ...real,
    isNative: true,
    requestNotificationPermission: vi.fn(async () => "granted"),
    scheduleAlarm: vi.fn(async (a: unknown) => {
      scheduledAlarms.push(a);
    }),
  };
});

const { db } = await import("../src/db/db");
const { applyVoiceActions } = await import("../src/lib/voice/applyActions");

const NOW = new Date(2026, 10, 28, 10, 0);

beforeEach(async () => {
  scheduledAlarms.length = 0;
  await Promise.all([
    db.alarms.clear(), db.tasks.clear(), db.transactions.clear(),
    db.notes.clear(), db.financeCategories.clear(),
  ]);
  await db.financeCategories.add({ name: "Food", kind: "expense" } as never);
});

describe("applyVoiceActions", () => {
  it("creates a dated one-off alarm and schedules it", async () => {
    const r = await applyVoiceActions([{ type: "alarm", time: "08:00", date: "2026-11-29" }], NOW);
    const [a] = await db.alarms.toArray();
    expect(a).toMatchObject({ time: "08:00", days: [], onDate: "2026-11-29", enabled: true });
    expect(scheduledAlarms).toHaveLength(1);
    expect(r.created).toBe(1);
  });

  it("creates tasks with their due date", async () => {
    await applyVoiceActions(
      [{ type: "task", title: "Send invoice", dueDate: "2026-11-29" }, { type: "task", title: "Call bank" }],
      NOW,
    );
    const tasks = await db.tasks.toArray();
    expect(tasks.map((t) => [t.title, t.dueDate, t.done])).toEqual([
      ["Send invoice", "2026-11-29", false],
      ["Call bank", undefined, false],
    ]);
  });

  it("logs an expense to the matching category, whatever its case", async () => {
    await applyVoiceActions([{ type: "expense", amount: 200, category: "food" }], NOW);
    const [t] = await db.transactions.toArray();
    expect(t).toMatchObject({ type: "expense", amount: 200, category: "Food", date: "2026-11-28" });
  });

  it("creates a category the user doesn't have yet", async () => {
    await applyVoiceActions([{ type: "expense", amount: 300, category: "Haircut" }], NOW);
    const names = (await db.financeCategories.toArray()).map((c) => c.name);
    expect(names).toContain("Haircut");
  });

  it("saves a note tagged as voice", async () => {
    await applyVoiceActions([{ type: "note", text: "Clinic bot idea" }], NOW);
    const [n] = await db.notes.toArray();
    expect(n).toMatchObject({ body: "Clinic bot idea", tags: ["voice"], pinned: false });
  });

  it("skips what it didn't understand and says so", async () => {
    const r = await applyVoiceActions([{ type: "unknown", text: "hmm" }], NOW);
    expect(r).toEqual({ created: 0, skipped: 1 });
    expect(await db.tasks.count()).toBe(0);
  });
});
