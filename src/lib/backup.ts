import { db } from "../db/db";

interface BackupPayload {
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
    appSettings: unknown[];
  };
}

export async function exportBackup(): Promise<void> {
  const payload: BackupPayload = {
    version: 2,
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
      appSettings: await db.appSettings.toArray(),
    },
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `life-hub-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);

  await db.appSettings.update(1, { lastBackupAt: Date.now() });
}

export async function importBackup(file: File): Promise<void> {
  const text = await file.text();
  const payload = JSON.parse(text) as BackupPayload;
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

      if (t.appSettings[0]) {
        await db.appSettings.put(t.appSettings[0] as never);
      }
    },
  );
}
