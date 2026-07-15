import { useRef } from "react";
import { exportBackup, importBackup } from "../lib/backup";

export function BackupBar() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (
      !confirm(
        "Importing will replace all current data with the backup file. Continue?",
      )
    ) {
      e.target.value = "";
      return;
    }
    await importBackup(file);
    e.target.value = "";
    alert("Backup restored.");
  };

  return (
    <div className="flex items-center gap-1 text-xs">
      <button
        onClick={() => exportBackup()}
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
