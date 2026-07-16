import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { db, type Alarm } from "../db/db";
import { showLocalNotification } from "./notify";
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

      // --- Habit reminders (fire late rather than never) ---
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
          await showLocalNotification("Habit reminder", `Time for: ${h.name}`);
        }
      }

      // --- Task reminders ---
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

      // --- Note reminders ---
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
