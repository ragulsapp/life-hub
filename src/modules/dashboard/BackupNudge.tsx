import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import { exportBackup } from "../../lib/backup";
import { toast } from "../../lib/toast";
import { DownloadIcon } from "../../components/Icons";

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
    /* Amber-alert styling made a routine reminder the loudest thing on the
       home screen — it out-shouted the day's actual plan. It is a real risk
       on an app with no cloud, so it stays visible, but as a quiet row that
       states the fact and offers the fix. Alert colour is reserved for
       things that are actually wrong. */
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/70 px-3 py-2 dark:border-white/5">
      <span className="text-label text-slate-500 dark:text-slate-400">
        {last
          ? `Last backup: ${staleDays} days ago.`
          : "No backup yet — your data lives only on this device."}
      </span>
      <button
        onClick={doExport}
        className="inline-flex h-11 flex-shrink-0 items-center gap-1.5 rounded-xl px-3 text-label font-semibold text-cyan-600 transition-colors hover:bg-cyan-500/10 dark:text-cyan-300"
      >
        <DownloadIcon size={14} />
        Back up
      </button>
    </div>
  );
}
