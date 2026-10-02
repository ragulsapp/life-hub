import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { db } from "../db/db";
import { localDateStr } from "./dates";

export interface BackupPayload {
  version: number;
  exportedAt: number;
  tables: {
    healthMetrics: unknown[];
    habitLogs: unknown[];
    habits?: unknown[];
    financeCategories: unknown[];
    transactions: unknown[];
    budgets?: unknown[];
    notes: unknown[];
    goals: unknown[];
    metricGoals?: unknown[];
    fastingSessions?: unknown[];
    tasks?: unknown[];
    alarms?: unknown[];
    achievements?: unknown[];
    wakeLogs?: unknown[];
    debts?: unknown[];
    recurringTransactions?: unknown[];
    appSettings: unknown[];
  };
}

export const BACKUP_VERSION = 2;

/** Tables every valid backup must contain (present since backup v1). */
const REQUIRED_TABLES = [
  "healthMetrics",
  "habitLogs",
  "financeCategories",
  "transactions",
  "notes",
  "goals",
  "appSettings",
] as const;

export async function buildBackupPayload(): Promise<BackupPayload> {
  return {
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    tables: {
      healthMetrics: await db.healthMetrics.toArray(),
      habitLogs: await db.habitLogs.toArray(),
      habits: await db.habits.toArray(),
      financeCategories: await db.financeCategories.toArray(),
      transactions: await db.transactions.toArray(),
      budgets: await db.budgets.toArray(),
      notes: await db.notes.toArray(),
      goals: await db.goals.toArray(),
      metricGoals: await db.metricGoals.toArray(),
      fastingSessions: await db.fastingSessions.toArray(),
      tasks: await db.tasks.toArray(),
      alarms: await db.alarms.toArray(),
      achievements: await db.achievements.toArray(),
      wakeLogs: await db.wakeLogs.toArray(),
      debts: await db.debts.toArray(),
      recurringTransactions: await db.recurringTransactions.toArray(),
      appSettings: await db.appSettings.toArray(),
      // `sounds` is deliberately omitted: it holds Blobs, and JSON.stringify
      // flattens a Blob to {}, so exporting it would write junk rows that
      // restore as unplayable sounds. Custom audio must be re-uploaded.
    },
  };
}

/**
 * Validate an untrusted parsed JSON value before letting it near the
 * database (M3). Throws a user-readable Error on any structural problem.
 */
export function validateBackupPayload(data: unknown): BackupPayload {
  if (typeof data !== "object" || data === null) {
    throw new Error("That file isn't a Life Mentor backup.");
  }
  const p = data as Partial<BackupPayload>;
  if (typeof p.version !== "number" || !p.tables || typeof p.tables !== "object") {
    throw new Error("That file isn't a Life Mentor backup.");
  }
  if (p.version > BACKUP_VERSION) {
    throw new Error(
      `This backup is from a newer app version (v${p.version}). Update the app first.`,
    );
  }
  for (const table of REQUIRED_TABLES) {
    if (!Array.isArray((p.tables as Record<string, unknown>)[table])) {
      throw new Error(`Backup is missing its "${table}" data — file may be corrupted.`);
    }
  }
  return p as BackupPayload;
}

export function countRecords(payload: BackupPayload): number {
  return Object.values(payload.tables).reduce(
    (sum, rows) => sum + (Array.isArray(rows) ? rows.length : 0),
    0,
  );
}

/** Replace all data atomically — a mid-restore failure rolls back everything. */
export async function restoreBackupPayload(payload: BackupPayload): Promise<void> {
  const t = payload.tables;

  await db.transaction(
    "rw",
    [
      db.healthMetrics,
      db.habitLogs,
      db.habits,
      db.financeCategories,
      db.transactions,
      db.budgets,
      db.notes,
      db.goals,
      db.metricGoals,
      db.fastingSessions,
      db.tasks,
      db.alarms,
      db.achievements,
      db.wakeLogs,
      db.debts,
      db.recurringTransactions,
      db.appSettings,
    ],
    async () => {
      await Promise.all([
        db.healthMetrics.clear(),
        db.habitLogs.clear(),
        db.habits.clear(),
        db.financeCategories.clear(),
        db.transactions.clear(),
        db.budgets.clear(),
        db.notes.clear(),
        db.goals.clear(),
        db.metricGoals.clear(),
        db.fastingSessions.clear(),
        db.tasks.clear(),
        db.alarms.clear(),
        db.achievements.clear(),
        db.wakeLogs.clear(),
        db.debts.clear(),
        db.recurringTransactions.clear(),
      ]);

      await db.healthMetrics.bulkAdd(t.healthMetrics as never[]);
      await db.habitLogs.bulkAdd(t.habitLogs as never[]);
      if (t.habits) await db.habits.bulkAdd(t.habits as never[]);
      await db.financeCategories.bulkAdd(t.financeCategories as never[]);
      await db.transactions.bulkAdd(t.transactions as never[]);
      if (t.budgets) await db.budgets.bulkAdd(t.budgets as never[]);
      await db.notes.bulkAdd(t.notes as never[]);
      await db.goals.bulkAdd(t.goals as never[]);
      if (t.metricGoals) await db.metricGoals.bulkAdd(t.metricGoals as never[]);
      if (t.fastingSessions)
        await db.fastingSessions.bulkAdd(t.fastingSessions as never[]);
      if (t.tasks) await db.tasks.bulkAdd(t.tasks as never[]);
      if (t.alarms) await db.alarms.bulkAdd(t.alarms as never[]);
      if (t.achievements)
        await db.achievements.bulkAdd(t.achievements as never[]);
      if (t.wakeLogs) await db.wakeLogs.bulkAdd(t.wakeLogs as never[]);
      if (t.debts) await db.debts.bulkAdd(t.debts as never[]);
      if (t.recurringTransactions)
        await db.recurringTransactions.bulkAdd(t.recurringTransactions as never[]);

      if (t.appSettings[0]) {
        // MERGE rather than replace. `put` would swap the whole row, so
        // restoring a backup taken before a settings field existed would
        // silently wipe it — the body profile being the painful case, since
        // every Body Basics card would just go blank with no explanation.
        const incoming = t.appSettings[0] as Record<string, unknown>;
        const current = await db.appSettings.get(1);
        await db.appSettings.put({
          ...current,
          ...incoming,
          id: 1,
        } as never);
      }
    },
  );
}

/** Whether the backup left the app, and by which route. */
export type ExportResult = "shared" | "downloaded" | "cancelled";

/**
 * Hands the user a copy of everything they own.
 *
 * This is the single most important function in the app. The whole promise is
 * that life data never leaves the device, which also means **there is no copy
 * of it anywhere else** — one wiped app and years of habits are gone. Export
 * is the only thing standing between the user and that, so it has to actually
 * work and it has to never claim it worked when it didn't.
 *
 * It used to be an `<a download>` click, which on the Android build wrote
 * nothing at all: a Capacitor WebView has no download handler, so a blob-URL
 * anchor click is silently discarded. The old code then resolved anyway and
 * the UI said "Backup downloaded." It had been reporting success for a file
 * that was never created.
 *
 * Native now writes the file for real and opens the system share sheet, so
 * the user picks where it lands — Drive, Files, mail, WhatsApp — and sees it
 * arrive. The browser keeps the anchor, which does work there.
 */
export async function exportBackup(): Promise<ExportResult> {
  const payload = await buildBackupPayload();
  const json = JSON.stringify(payload, null, 2);
  // Filename only — import validates the payload's shape, never its name, so
  // backups exported under the old name still restore fine.
  const name = `life-mentor-backup-${localDateStr()}.json`;

  if (Capacitor.isNativePlatform()) {
    // Cache, not Documents: the file is a hand-off to the share sheet, and
    // the copy that matters is wherever the user sends it. Leaving backups
    // accumulating in app storage would also put them inside the very thing
    // an uninstall deletes, which is the case this exists to survive.
    const { uri } = await Filesystem.writeFile({
      path: name,
      data: json,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });

    try {
      await Share.share({ title: name, files: [uri] });
    } catch {
      // Dismissing the sheet rejects. That is a cancel, not a failure — and
      // crucially not a backup either, so `lastBackupAt` must not move. A
      // date that says "backed up today" when the user backed out is worse
      // than no date at all.
      return "cancelled";
    }

    await db.appSettings.update(1, { lastBackupAt: Date.now() });
    return "shared";
  }

  const url = URL.createObjectURL(
    new Blob([json], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);

  await db.appSettings.update(1, { lastBackupAt: Date.now() });
  return "downloaded";
}
