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

const pad = (n: number) => String(n).padStart(2, "0");
const dateStr = (d: Date) => d.toISOString().slice(0, 10);
const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** Fire only within the target minute so a late app-open doesn't replay old times. */
function isDueNow(time: string, days: number[], now: Date): boolean {
  if (time !== hhmm(now)) return false;
  if (days.length > 0 && !days.includes(now.getDay())) return false;
  return true;
}

export function SchedulerProvider({ children }: { children: ReactNode }) {
  const [activeAlarm, setActiveAlarm] = useState<Alarm | null>(null);
  const activeRef = useRef<Alarm | null>(null);
  activeRef.current = activeAlarm;

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      const now = new Date();
      const today = dateStr(now);

      // --- Alarms ---
      if (!activeRef.current) {
        const alarms = await db.alarms.toArray();
        for (const a of alarms) {
          if (!a.enabled || a.lastFiredDate === today) continue;
          if (isDueNow(a.time, a.days, now)) {
            await db.alarms.update(a.id, { lastFiredDate: today });
            if (!cancelled) setActiveAlarm(a);
            break;
          }
        }
      }

      // --- Habit reminders ---
      const habits = await db.habits.toArray();
      for (const h of habits) {
        if (
          !h.reminderEnabled ||
          !h.reminderTime ||
          h.archived ||
          h.lastReminderDate === today
        )
          continue;
        if (isDueNow(h.reminderTime, [], now)) {
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
        if (isDueNow(t.reminderTime, [], now)) {
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
        if (isDueNow(n.reminderTime, [], now)) {
          await db.notes.update(n.id, { lastReminderDate: today });
          await showLocalNotification("Note reminder", n.title);
        }
      }
    };

    tick();
    const id = window.setInterval(tick, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const ringNow = (alarm: Alarm) => setActiveAlarm(alarm);
  const dismiss = () => setActiveAlarm(null);

  return (
    <Ctx.Provider value={{ activeAlarm, ringNow, dismiss }}>
      {children}
    </Ctx.Provider>
  );
}
