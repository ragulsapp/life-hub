import { useRef } from "react";
import { motion } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import {
  countRecords,
  exportBackup,
  restoreBackupPayload,
  validateBackupPayload,
} from "../../lib/backup";
import { toast } from "../../lib/toast";
import { useDarkMode } from "../../lib/theme";
import { BodyProfileForm } from "../health/BodyProfileForm";
import { ReminderSoundPicker } from "../alarms/ReminderSoundPicker";
import { setFastingEnabled } from "../health/healthActions";
import { resyncNativeReminders } from "../../lib/reminderSync";

/**
 * Everything that used to live in the header, plus body basics.
 *
 * A full-screen panel rather than a Dashboard card because Import REPLACES
 * ALL DATA — a destructive action shouldn't sit one mis-tap away on the
 * screen you open twenty times a day. And not an 8th tab: seven already
 * leave ~64px each, an eighth truncates the labels.
 *
 * No exit animation: content is static, but the rule that matters here is
 * that an AnimatePresence whose subtree ever gains a looping animation
 * strands an invisible tap-blocking layer (see AlarmOverlay).
 */

/** A tappable row. Fixed min-height so every target clears Android's 48dp. */
function Row({
  icon,
  label,
  hint,
  onClick,
  trailing,
  danger,
}: {
  icon: string;
  label: string;
  hint?: string;
  onClick?: () => void;
  trailing?: React.ReactNode;
  danger?: boolean;
}) {
  const inner = (
    <>
      <span className="w-6 flex-shrink-0 text-center text-base">{icon}</span>
      <span className="min-w-0 flex-1 text-left">
        <span
          className={`block text-sm font-medium ${
            danger
              ? "text-red-500"
              : "text-slate-800 dark:text-slate-100"
          }`}
        >
          {label}
        </span>
        {hint && (
          <span className="block text-xs text-slate-400">{hint}</span>
        )}
      </span>
      {trailing}
    </>
  );

  const cls =
    "flex min-h-[52px] w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors";

  return onClick ? (
    <motion.button whileTap={{ scale: 0.985 }} onClick={onClick} className={`${cls} hover:bg-slate-100 dark:hover:bg-slate-700/50`}>
      {inner}
    </motion.button>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
        {title}
      </div>
      <div className="glass rounded-3xl border border-white/60 bg-white/80 p-1.5 shadow-e2 dark:border-white/5 dark:bg-slate-800/60 dark:shadow-e2-dark">
        {children}
      </div>
    </div>
  );
}

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const settings = useLiveQuery(() => db.appSettings.get(1), []);
  const [darkMode, toggleDark] = useDarkMode();
  const fileInputRef = useRef<HTMLInputElement>(null);
  // undefined (pre-existing installs) and `true` both mean on — see db.ts.
  const nightOn = settings?.nightReminderEnabled !== false;

  const toggleNightReminder = async () => {
    await db.appSettings.update(1, { nightReminderEnabled: !nightOn });
    await resyncNativeReminders();
  };

  const setNightReminderTime = async (time: string) => {
    await db.appSettings.update(1, { nightReminderTime: time });
    await resyncNativeReminders();
  };

  const lastBackup = settings?.lastBackupAt
    ? new Date(settings.lastBackupAt).toLocaleDateString()
    : "Never";

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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-40 overflow-y-auto bg-slate-50 dark:bg-slate-900"
    >
      <div
        className="mx-auto flex max-w-md flex-col gap-5 p-4"
        style={{
          paddingTop: "calc(var(--sat) + 1rem)",
          paddingBottom: "calc(var(--sab) + 2rem)",
        }}
      >
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Settings
          </h1>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            aria-label="Close settings"
            className="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:bg-slate-700/60"
          >
            ✕
          </motion.button>
        </div>

        <Section title="About you">
          <div className="p-2">
            {/* Reused in place from the health module rather than moved —
                moving it would invert the dependency (settings → health
                domain logic) for no benefit. */}
            <BodyProfileForm profile={settings?.bodyProfile} />
          </div>
        </Section>

        <Section title="Appearance">
          <Row
            icon={darkMode ? "🌙" : "☀️"}
            label="Dark mode"
            hint={darkMode ? "On" : "Off"}
            onClick={toggleDark}
            trailing={
              <span
                className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
                  darkMode ? "bg-cyan-500" : "bg-slate-300 dark:bg-slate-600"
                }`}
              >
                <motion.span
                  layout
                  transition={{ type: "spring", stiffness: 500, damping: 32 }}
                  className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow"
                  style={{ left: darkMode ? 22 : 2 }}
                />
              </span>
            }
          />
        </Section>

        <Section title="Reminders">
          <div className="p-2">
            <ReminderSoundPicker />
          </div>
          <Row
            icon="🌃"
            label="Night reminder"
            hint={
              nightOn
                ? `Plan tomorrow — ${settings?.nightReminderTime ?? "21:00"}`
                : "Off"
            }
            onClick={toggleNightReminder}
            trailing={
              <span
                className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
                  nightOn ? "bg-cyan-500" : "bg-slate-300 dark:bg-slate-600"
                }`}
              >
                <motion.span
                  layout
                  transition={{ type: "spring", stiffness: 500, damping: 32 }}
                  className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow"
                  style={{ left: nightOn ? 22 : 2 }}
                />
              </span>
            }
          />
          {nightOn && (
            <div className="px-3 pb-2">
              <input
                type="time"
                value={settings?.nightReminderTime ?? "21:00"}
                onChange={(e) => setNightReminderTime(e.target.value)}
                className="!p-1.5 text-sm rounded-xl border border-slate-200 bg-white/50 text-slate-900 outline-none dark:border-slate-600 dark:bg-slate-900/30 dark:text-white"
              />
            </div>
          )}
          <Row
            icon="🌙"
            label="Track fasts"
            hint={
              settings?.fastingEnabled
                ? "Shown in Health"
                : "Hidden — turn on if you keep fasts"
            }
            onClick={() => setFastingEnabled(!settings?.fastingEnabled)}
            trailing={
              <span
                className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
                  settings?.fastingEnabled
                    ? "bg-cyan-500"
                    : "bg-slate-300 dark:bg-slate-600"
                }`}
              >
                <motion.span
                  layout
                  transition={{ type: "spring", stiffness: 500, damping: 32 }}
                  className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow"
                  style={{ left: settings?.fastingEnabled ? 22 : 2 }}
                />
              </span>
            }
          />
        </Section>

        <Section title="Your data">
          <Row
            icon="⬇️"
            label="Export a backup"
            hint={`Last backup: ${lastBackup}`}
            onClick={handleExport}
          />
          <Row
            icon="⬆️"
            label="Restore from a backup"
            hint="Replaces everything currently in the app"
            onClick={() => fileInputRef.current?.click()}
            danger
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleImport}
            className="hidden"
          />
        </Section>

        <p className="px-3 text-center text-xs text-slate-400">
          Everything stays on this device. Nothing is uploaded.
        </p>
      </div>
    </motion.div>
  );
}
