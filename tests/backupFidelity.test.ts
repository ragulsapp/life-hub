// fake-indexeddb must load before Dexie touches indexedDB.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../src/db/db";
import {
  buildBackupPayload,
  restoreBackupPayload,
  validateBackupPayload,
} from "../src/lib/backup";

/**
 * A backup is only worth anything if it brings back exactly what was there.
 *
 * The older round-trip test seeded four tables, compared only counts, and
 * never went through JSON — but the real backup is a JSON file, and restore
 * REPLACES every table, so a table the export forgets is not "not restored",
 * it is deleted. This seeds one row in every table, sends the payload through
 * the same JSON round trip as a real file, restores it onto an empty database
 * (a new phone), and compares every field.
 */

/** `sounds` holds Blobs, which JSON cannot carry; documented in backup.ts. */
const NOT_BACKED_UP = new Set(["sounds"]);

const ROWS: Record<string, Record<string, unknown>> = {
  healthMetrics: { id: 1, date: "2026-11-14", type: "weight", value: 71.5 },
  habitLogs: { id: 1, date: "2026-11-14", habitName: "Read", completed: true },
  habits: {
    id: 1, name: "Read", icon: "book", schedule: { type: "daily" },
    archived: false, createdAt: 1, reminderEnabled: true, reminderTime: "08:00",
  },
  financeCategories: { id: 1, name: "Food", kind: "expense" },
  transactions: {
    id: 1, date: "2026-11-14", type: "expense", amount: 250, category: "Food",
    note: "lunch",
  },
  budgets: { id: 1, category: "Food", amount: 6000 },
  notes: {
    id: 1, title: "Ideas", body: "line one\nline two — ₹ தமிழ்", tags: ["a", "b"],
    pinned: true, createdAt: 2, reminderEnabled: true, reminderTime: "18:00",
  },
  goals: { id: 1, title: "Run 5k", status: "active", createdAt: 3 },
  metricGoals: { id: 1, metric: "weight", target: 68, createdAt: 4 },
  fastingSessions: { id: 1, startedAt: 5, endedAt: 6, targetHours: 16, label: "Ekadashi" },
  tasks: { id: 1, title: "Call bank", done: false, createdAt: 7 },
  alarms: {
    id: 1, label: "Wake", time: "06:30", days: [1, 2, 3, 4, 5], enabled: true,
    mission: "math", difficulty: 2, builtInSound: "chime", createdAt: 8,
  },
  achievements: { id: 1, key: "first-habit", unlockedAt: 9 },
  wakeLogs: { id: 1, date: "2026-11-14", alarmId: 1, minutesLate: 2 },
  debts: { id: 1, name: "Arun", type: "lent", amount: 2000, createdAt: 10 },
  recurringTransactions: {
    id: 1, type: "expense", category: "Rent", amount: 12000, dayOfMonth: 5,
    active: true,
  },
};

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe("backup fidelity", () => {
  it("covers every table the app stores, except the documented exclusion", async () => {
    const payload = await buildBackupPayload();
    const exported = new Set(Object.keys(payload.tables));
    const stored = db.tables.map((t) => t.name).filter((n) => !NOT_BACKED_UP.has(n));
    // A table added to the app but not to the backup would be silently
    // DELETED by every restore. This fails the moment that happens.
    expect(stored.filter((n) => !exported.has(n))).toEqual([]);
  });

  it("restores every row of every table exactly, through a real JSON file", async () => {
    for (const [table, row] of Object.entries(ROWS)) {
      await db.table(table).put(row);
    }
    await db.appSettings.put({
      id: 1, reminderSound: "ping", nightReminderEnabled: false,
      bodyProfile: { heightCm: 172, birthYear: 1998 },
    } as never);

    // Exactly what a backup file goes through: out to text and back.
    const file = JSON.stringify(await buildBackupPayload(), null, 2);
    const payload = validateBackupPayload(JSON.parse(file));

    // A new phone: nothing at all.
    await Promise.all(db.tables.map((t) => t.clear()));

    await restoreBackupPayload(payload);

    for (const [table, row] of Object.entries(ROWS)) {
      expect(await db.table(table).toArray(), table).toEqual([row]);
    }
    expect(await db.appSettings.get(1)).toMatchObject({
      reminderSound: "ping",
      nightReminderEnabled: false,
      bodyProfile: { heightCm: 172, birthYear: 1998 },
    });
  });

  it("does not delete the user's uploaded sounds when restoring", async () => {
    // Sounds are not in the backup, so restore must leave them alone rather
    // than clear a table it cannot refill.
    await db.sounds.put({ id: 1, name: "Rooster", blob: new Blob(["x"]), createdAt: 1 } as never);
    const payload = validateBackupPayload(
      JSON.parse(JSON.stringify(await buildBackupPayload())),
    );
    await restoreBackupPayload(payload);
    expect(await db.sounds.count()).toBe(1);
  });
});
