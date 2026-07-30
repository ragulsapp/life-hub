import { useLiveQuery } from "dexie-react-hooks";
import {
  BUILT_IN_SOUNDS,
  db,
  DEFAULT_REMINDER_SOUND,
  soundUrl,
  type SoundId,
} from "../../db/db";
import { previewUrl } from "../../lib/alarmSound";
import { toast } from "../../lib/toast";
import {
  requestNotificationPermission,
  showLocalNotification,
} from "../../lib/notify";
import { resyncNativeReminders } from "../../lib/reminderSync";

/**
 * Which tone habit/task/note reminders use.
 *
 * Changing it reschedules every existing reminder, because a scheduled Android
 * notification is bound to the channel it was created with — a new tone can't
 * retroactively apply to schedules already sitting in the OS.
 */
export function ReminderSoundPicker() {
  const settings = useLiveQuery(() => db.appSettings.get(1), []);
  const current = settings?.reminderSound ?? DEFAULT_REMINDER_SOUND;

  const choose = async (id: SoundId) => {
    previewUrl(soundUrl(id));
    await db.appSettings.update(1, { reminderSound: id });
    await resyncNativeReminders(id);
  };

  const test = async () => {
    const perm = await requestNotificationPermission();
    if (perm !== "granted") {
      toast("Allow notifications first.", "error");
      return;
    }
    await showLocalNotification(
      "Test reminder",
      "If you can hear this, reminders are working.",
    );
    toast("Sent — check your notification shade.");
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Used for habit, task and note reminders.
      </p>
      <div className="flex flex-wrap gap-2">
        {BUILT_IN_SOUNDS.map((s) => (
          <button
            key={s.id}
            onClick={() => choose(s.id)}
            aria-pressed={current === s.id}
            className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${
              current === s.id
                ? "bg-cyan-500 text-slate-900"
                : "bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300"
            }`}
          >
            🔔 {s.label}
            {current === s.id && " ✓"}
          </button>
        ))}
      </div>
      <button
        onClick={test}
        className="self-start text-xs font-semibold text-cyan-500 hover:underline"
      >
        Send a test reminder now
      </button>
    </div>
  );
}
