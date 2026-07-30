import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { db, type Alarm } from "../db/db";
import {
  habitNotifId,
  isNative,
  noteNotifId,
  scheduleDailyReminder,
  showLocalNotification,
  taskNotifId,
} from "./notify";
import { localDateStr } from "./dates";
import { alarmDueState, reminderDue } from "./reminderLogic";

interface SchedulerContext {
  activeAlarm: Alarm | null;
  ringNow: (alarm: Alarm) => void;
  dismiss: () => void;
}

const Ctx = createContext<SchedulerContext>({
  activeAlarm: null,
  ringNow: () => {},
  dismiss: () => {},
});

export const useScheduler = () => useContext(Ctx);

/** One-off alarms (no repeat days) disable themselves after they fire. */
function firedPatch(alarm: Alarm, today: string): Partial<Alarm> {
  return alarm.days.length === 0
    ? { lastFiredDate: today, enabled: false }
    : { lastFiredDate: today };
}

export function SchedulerProvider({ children }: { children: ReactNode }) {
  const [activeAlarm, setActiveAlarm] = useState<Alarm | null>(null);
  const activeRef = useRef<Alarm | null>(null);
  activeRef.current = activeAlarm;

  // M4: if the page was refreshed mid-ring, resume the mission — a reload
  // must not be an escape hatch from the alarm.
  useEffect(() => {
    (async () => {
      const settings = await db.appSettings.get(1);
      if (settings?.ringingAlarmId == null) return;
      const alarm = await db.alarms.get(settings.ringingAlarmId);
      if (alarm) {
        setActiveAlarm(alarm);
      } else {
        await db.appSettings.update(1, { ringingAlarmId: undefined });
      }
    })().catch(console.error);
  }, []);

  // Re-register every enabled reminder's native OS schedule on launch —
  // covers reminders created before this device had the plugin, restored
  // from a backup import, or cleared by an OS/app data reset.
  useEffect(() => {
    if (!isNative) return;
    (async () => {
      const [habits, tasks, notes] = await Promise.all([
        db.habits.toArray(),
        db.tasks.toArray(),
        db.notes.toArray(),
      ]);
      for (const h of habits) {
        if (h.reminderEnabled && h.reminderTime && !h.archived) {
          await scheduleDailyReminder(
            habitNotifId(h.id),
            "Habit reminder",
            `Time for: ${h.name}`,
            h.reminderTime,
          );
        }
      }
      for (const t of tasks) {
        if (t.reminderEnabled && t.reminderTime && !t.done) {
          await scheduleDailyReminder(
            taskNotifId(t.id),
            "Task reminder",
            t.title,
            t.reminderTime,
          );
        }
      }
      for (const n of notes) {
        if (n.reminderEnabled && n.reminderTime) {
          await scheduleDailyReminder(
            noteNotifId(n.id),
            "Note reminder",
            n.title,
            n.reminderTime,
          );
        }
      }
    })().catch(console.error);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      const now = new Date();
      const today = localDateStr(now);

      // --- Alarms (H4: grace window, missed handling, once per day) ---
      if (!activeRef.current) {
        const alarms = await db.alarms.toArray();
        for (const a of alarms) {
          if (!a.enabled || a.lastFiredDate === today) continue;
          const state = alarmDueState(a.time, a.days, now);
          if (state === "ring") {
            await db.alarms.update(a.id, firedPatch(a, today));
            await db.appSettings.update(1, { ringingAlarmId: a.id });
            if (!cancelled) setActiveAlarm(a);
            break;
          }
          if (state === "missed") {
            await db.alarms.update(a.id, firedPatch(a, today));
            await showLocalNotification(
              "Missed alarm ⏰",
              `${a.time} · ${a.label || "Alarm"} was over an hour ago.`,
            );
          }
        }
      }

      // --- Habit/task/note reminders: native builds get these from the OS
      // schedule (see the resync effect above) — polling here too would
      // double-fire them. This poll path stays as the delivery mechanism
      // for browser/PWA testing only. ---
      if (!isNative) {
        const habits = await db.habits.toArray();
        for (const h of habits) {
          if (
            !h.reminderEnabled ||
            !h.reminderTime ||
            h.archived ||
            h.lastReminderDate === today
          )
            continue;
          if (reminderDue(h.reminderTime, now)) {
            await db.habits.update(h.id, { lastReminderDate: today });
            await showLocalNotification(
              "Habit reminder",
              `Time for: ${h.name}`,
            );
          }
        }

        const tasks = await db.tasks.toArray();
        for (const t of tasks) {
          if (
            !t.reminderEnabled ||
            !t.reminderTime ||
            t.done ||
            t.lastReminderDate === today
          )
            continue;
          if (reminderDue(t.reminderTime, now)) {
            await db.tasks.update(t.id, { lastReminderDate: today });
            await showLocalNotification("Task reminder", t.title);
          }
        }

        const notes = await db.notes.toArray();
        for (const n of notes) {
          if (
            !n.reminderEnabled ||
            !n.reminderTime ||
            n.lastReminderDate === today
          )
            continue;
          if (reminderDue(n.reminderTime, now)) {
            await db.notes.update(n.id, { lastReminderDate: today });
            await showLocalNotification("Note reminder", n.title);
          }
        }
      }

      // --- Fast reached its length: notify once, keep it running. Neutral
      // wording on purpose — a fast may be an observance, so "time to eat!"
      // is not ours to say. Known limitation: this uses the poll path rather
      // than a native OS schedule, so on native it only fires while the app
      // is alive. ---
      const activeFasts = await db.fastingSessions
        .filter((f) => f.endedAt === undefined && !f.targetNotified)
        .toArray();
      for (const f of activeFasts) {
        const elapsedHours = (now.getTime() - f.startedAt) / 3600000;
        if (elapsedHours >= f.targetHours) {
          await db.fastingSessions.update(f.id, { targetNotified: true });
          await showLocalNotification(
            f.label ? `${f.label} — ${f.targetHours}h reached` : "Fast complete",
            `You've reached ${f.targetHours} hours.`,
          );
        }
      }
    };

    tick().catch(console.error);
    const id = window.setInterval(() => tick().catch(console.error), 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const ringNow = (alarm: Alarm) => {
    db.appSettings.update(1, { ringingAlarmId: alarm.id }).catch(() => {});
    setActiveAlarm(alarm);
  };

  const dismiss = () => {
    db.appSettings.update(1, { ringingAlarmId: undefined }).catch(() => {});
    setActiveAlarm(null);
  };

  return (
    <Ctx.Provider value={{ activeAlarm, ringNow, dismiss }}>
      {children}
    </Ctx.Provider>
  );
}
