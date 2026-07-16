import { useRef } from "react";
import {
  countRecords,
  exportBackup,
  restoreBackupPayload,
  validateBackupPayload,
} from "../lib/backup";
import { toast } from "../lib/toast";

export function BackupBar() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      await exportBackup();
      toast("Backup downloaded.");
    } catch (err) {
      console.error(err);
      toast("Export failed.", "error");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(await file.text());
      } catch {
        throw new Error("That file isn't valid JSON.");
      }
      const payload = validateBackupPayload(parsed);
      const total = countRecords(payload);
      if (
        !confirm(
          `Replace ALL current data with ${total} records from this backup?`,
        )
      )
        return;
      await restoreBackupPayload(payload);
      toast("Backup restored.");
    } catch (err) {
      console.error(err);
      toast(err instanceof Error ? err.message : "Import failed.", "error");
    }
  };

  return (
    <div className="flex items-center gap-1 text-xs">
      <button
        onClick={handleExport}
        className="rounded-full px-2 py-1 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700/60"
        title="Export all data as JSON"
      >
        ⬇️ Export
      </button>
      <button
        onClick={() => fileInputRef.current?.click()}
        className="rounded-full px-2 py-1 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700/60"
        title="Import data from JSON backup"
      >
        ⬆️ Import
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        onChange={handleImport}
        className="hidden"
      />
    </div>
  );
}
