// fake-indexeddb must load before Dexie touches indexedDB.
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../src/db/db";
import {
  buildBackupPayload,
  countRecords,
  restoreBackupPayload,
  validateBackupPayload,
  BACKUP_VERSION,
} from "../src/lib/backup";

beforeEach(async () => {
  await Promise.all([
    db.notes.clear(),
    db.transactions.clear(),
    db.habits.clear(),
    db.habitLogs.clear(),
    db.goals.clear(),
    db.tasks.clear(),
    db.alarms.clear(),
  ]);
});

describe("backup round-trip", () => {
  it("exports and restores every table's records", async () => {
    await db.notes.add({
      title: "Note",
      body: "Body",
      tags: ["Tamil-Poetry"],
      pinned: false,
      createdAt: 1,
    } as never);
    await db.transactions.add({
      date: "2026-07-14",
      type: "income",
      amount: 500,
      category: "Career Consulting (CCC)",
    } as never);
    await db.habits.add({
      name: "Read",
      color: "#fff",
      icon: "📚",
      schedule: { type: "daily" },
      archived: false,
      createdAt: 1,
    } as never);
    await db.habitLogs.add({
      date: "2026-07-14",
      habitName: "Read",
      completed: true,
    } as never);

    const payload = await buildBackupPayload();
    expect(payload.version).toBe(BACKUP_VERSION);
    expect(countRecords(payload)).toBeGreaterThanOrEqual(4);

    // Simulate data loss, then restore.
    await db.notes.clear();
    await db.transactions.clear();
    await db.habits.clear();
    await db.habitLogs.clear();

    await restoreBackupPayload(payload);

    expect(await db.notes.count()).toBe(1);
    expect(await db.transactions.count()).toBe(1);
    expect(await db.habits.count()).toBe(1);
    expect((await db.habitLogs.toArray())[0]).toMatchObject({
      habitName: "Read",
      completed: true,
    });
  });
});

describe("validateBackupPayload (M3)", () => {
  it("rejects non-objects and junk", () => {
    expect(() => validateBackupPayload(null)).toThrow(/isn't a .* backup/);
    expect(() => validateBackupPayload("hello")).toThrow();
    expect(() => validateBackupPayload({ foo: 1 })).toThrow();
  });

  it("rejects payloads missing required tables", () => {
    expect(() =>
      validateBackupPayload({ version: 2, tables: { notes: [] } }),
    ).toThrow(/missing/);
  });

  it("rejects backups from a newer app version", () => {
    const tables = Object.fromEntries(
      [
        "healthMetrics",
        "habitLogs",
        "financeCategories",
        "transactions",
        "notes",
        "goals",
        "appSettings",
      ].map((k) => [k, []]),
    );
    expect(() =>
      validateBackupPayload({ version: BACKUP_VERSION + 1, tables }),
    ).toThrow(/newer app version/);
  });

  it("accepts a minimal valid v1 backup", () => {
    const tables = Object.fromEntries(
      [
        "healthMetrics",
        "habitLogs",
        "financeCategories",
        "transactions",
        "notes",
        "goals",
        "appSettings",
      ].map((k) => [k, []]),
    );
    expect(validateBackupPayload({ version: 1, tables }).version).toBe(1);
  });
});
