// fake-indexeddb must load before Dexie touches indexedDB.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The resync runs on every launch and re-registers every reminder with the
 * OS. It used to do that as one long sequence of awaits with no isolation:
 * alarms, then habits, tasks, notes and the nightly reminder. A single throw
 * anywhere — one malformed row, one schedule Android refuses — silently
 * aborted everything after it.
 *
 * That ordering is exactly the shape of the reported fault: habit reminders
 * arrive, note reminders do not. Habits are scheduled before notes, so they
 * survive any failure further down the line; notes do not.
 */

const scheduled: number[] = [];
const failOn = new Set<number>();

vi.mock("../src/lib/notify", async (orig) => {
  const real = await orig<typeof import("../src/lib/notify")>();
  return {
    ...real,
    isNative: true,
    ensureChannels: vi.fn(async () => {}),
    setReminderSound: vi.fn(),
    cancelReminder: vi.fn(async () => {}),
    scheduleDailyReminder: vi.fn(async (id: number) => {
      if (failOn.has(id)) throw new Error(`refused ${id}`);
      scheduled.push(id);
    }),
    scheduleAlarm: vi.fn(async (a: { id: number }) => {
      const id = real.alarmNotifId(a.id, 7);
      if (failOn.has(id)) throw new Error(`refused alarm ${a.id}`);
      scheduled.push(id);
    }),
  };
});

const { db } = await import("../src/db/db");
const { resyncNativeReminders, lastResyncFailures } = await import(
  "../src/lib/reminderSync"
);
const notify = await import("../src/lib/notify");

beforeEach(async () => {
  scheduled.length = 0;
  failOn.clear();
  await Promise.all([
    db.habits.clear(),
    db.tasks.clear(),
    db.notes.clear(),
    db.alarms.clear(),
    db.appSettings.clear(),
  ]);
  await db.habits.add({
    id: 1, name: "Water", reminderEnabled: true, reminderTime: "08:00",
  } as never);
  await db.tasks.add({
    id: 1, title: "Call bank", reminderEnabled: true, reminderTime: "10:00",
    done: false,
  } as never);
  await db.notes.add({
    id: 1, title: "Groceries", body: "", tags: [], pinned: false,
    createdAt: 0, reminderEnabled: true, reminderTime: "18:00",
  } as never);
  await db.alarms.add({
    id: 1, label: "Wake", time: "06:00", days: [], enabled: true,
    mission: "none", difficulty: 1, createdAt: 0,
  } as never);
});

describe("resyncNativeReminders", () => {
  it("schedules everything when nothing fails", async () => {
    await resyncNativeReminders();
    expect(scheduled).toEqual(
      expect.arrayContaining([
        notify.habitNotifId(1),
        notify.taskNotifId(1),
        notify.noteNotifId(1),
        notify.alarmNotifId(1, 7),
        notify.NIGHT_REMINDER_NOTIF_ID,
      ]),
    );
    expect(lastResyncFailures()).toEqual([]);
  });

  it("still schedules notes and the nightly reminder when a task fails", async () => {
    failOn.add(notify.taskNotifId(1));
    await resyncNativeReminders();
    expect(scheduled).toContain(notify.noteNotifId(1));
    expect(scheduled).toContain(notify.NIGHT_REMINDER_NOTIF_ID);
  });

  it("does not let a refused alarm take the habits down with it", async () => {
    failOn.add(notify.alarmNotifId(1, 7));
    await resyncNativeReminders();
    expect(scheduled).toContain(notify.habitNotifId(1));
    expect(scheduled).toContain(notify.noteNotifId(1));
  });

  it("records what failed, so the failure can be seen rather than inferred", async () => {
    failOn.add(notify.taskNotifId(1));
    await resyncNativeReminders();
    const failures = lastResyncFailures();
    expect(failures).toHaveLength(1);
    expect(failures[0].what).toContain("Call bank");
    expect(failures[0].error).toContain("refused");
  });
});
