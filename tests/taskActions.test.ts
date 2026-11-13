// fake-indexeddb must load before Dexie touches indexedDB.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Ticking a task done never cancelled its OS reminder. Two screens mark tasks
 * done — Today's mission and the task list — and neither touched the
 * schedule, so Android went on firing "Call bank" every day after the bank
 * had been called. Both now go through setTaskDone, and these tests pin the
 * rule: done cancels, un-done restores a reminder the user had set.
 */

const cancelled: number[] = [];
const scheduled: { id: number; time: string }[] = [];

vi.mock("../src/lib/notify", async (orig) => {
  const real = await orig<typeof import("../src/lib/notify")>();
  return {
    ...real,
    isNative: true,
    cancelReminder: vi.fn(async (id: number) => {
      cancelled.push(id);
    }),
    scheduleDailyReminder: vi.fn(
      async (id: number, _t: string, _b: string, time: string) => {
        scheduled.push({ id, time });
      },
    ),
  };
});

const { db } = await import("../src/db/db");
const { setTaskDone } = await import("../src/modules/alarms/taskActions");
const { taskNotifId } = await import("../src/lib/notify");

beforeEach(async () => {
  cancelled.length = 0;
  scheduled.length = 0;
  await db.tasks.clear();
  await db.tasks.add({
    id: 1, title: "Call bank", done: false, createdAt: 0,
    reminderEnabled: true, reminderTime: "10:00",
  } as never);
  await db.tasks.add({
    id: 2, title: "No reminder", done: false, createdAt: 0,
  } as never);
});

describe("setTaskDone", () => {
  it("cancels the OS reminder when a task is ticked done", async () => {
    await setTaskDone(1, true);
    expect(cancelled).toContain(taskNotifId(1));
    expect((await db.tasks.get(1))?.done).toBe(true);
  });

  it("restores the reminder when the task is un-ticked", async () => {
    await setTaskDone(1, true);
    await setTaskDone(1, false);
    expect(scheduled).toEqual([{ id: taskNotifId(1), time: "10:00" }]);
    expect((await db.tasks.get(1))?.completedAt).toBeUndefined();
  });

  it("does not invent a reminder for a task that never had one", async () => {
    await setTaskDone(2, true);
    await setTaskDone(2, false);
    expect(scheduled).toEqual([]);
  });

  it("still records the tick when the OS call fails", async () => {
    const notify = await import("../src/lib/notify");
    vi.mocked(notify.cancelReminder).mockRejectedValueOnce(new Error("boom"));
    await setTaskDone(1, true);
    expect((await db.tasks.get(1))?.done).toBe(true);
  });
});
