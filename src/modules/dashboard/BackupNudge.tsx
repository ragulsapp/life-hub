import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import { exportBackup } from "../../lib/backup";
import { toast } from "../../lib/toast";

const STALE_AFTER_DAYS = 7;

/**
 * There is no cloud sync — a manual export is the only safety net, so nudge
 * when the last backup is stale (or was never taken).
 */
export function BackupNudge() {
  const settings = useLiveQuery(() => db.appSettings.get(1));
  if (settings === undefined) return null; // still loading

  const last = settings?.lastBackupAt;
  const staleDays = last
    ? Math.floor((Date.now() - last) / 86400000)
    : Infinity;
  if (staleDays < STALE_AFTER_DAYS) return null;

  const doExport = async () => {
    try {
      await exportBackup();
      toast("Backup downloaded — keep it somewhere safe.");
    } catch (err) {
      console.error(err);
      toast("Export failed.", "error");
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
      <span>
        {last
          ? `Last backup was ${staleDays} days ago.`
          : "You haven't backed up your data yet."}
      </span>
      <button
        onClick={doExport}
        className="flex-shrink-0 rounded-xl bg-amber-400 px-3 py-1.5 font-semibold text-slate-900"
      >
        Export now
      </button>
    </div>
  );
}
