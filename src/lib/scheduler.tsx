import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { db, DEFAULT_REMINDER_SOUND, type Alarm } from "../db/db";
import { isNative, showLocalNotification } from "./notify";
import { resyncNativeReminders } from "./reminderSync";
import { localDateStr, localMonthKey } from "./dates";
import { alarmDueState, reminderDue } from "./reminderLogic";
import { isPending } from "../modules/finance/recurringSummary";
import { calcDayTotal, calcSafeToSpendToday } from "../modules/finance/financeSummary";
import { isDueOn } from "../modules/habits/habitStreaks";
import { missionState, smartTriggersDue } from "./smartNotifications";

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

  // Re-register every enabled reminder's native OS schedule on launch — see
  // resyncNativeReminders for why this is needed.
  useEffect(() => {
    (async () => {
      const settings = await db.appSettings.get(1);
      await resyncNativeReminders(settings?.reminderSound ?? DEFAULT_REMINDER_SOUND);
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

        // Night Reminder: native gets this from the OS schedule (see the
        // resync effect above); this poll path is the browser/PWA fallback.
        const settings = await db.appSettings.get(1);
        if (
          settings &&
          settings.nightReminderEnabled !== false &&
          settings.nightReminderLastDate !== today &&
          reminderDue(settings.nightReminderTime ?? "21:00", now)
        ) {
          await db.appSettings.update(1, { nightReminderLastDate: today });
          await showLocalNotification(
            "Plan tomorrow",
            "Plan tomorrow before you sleep.",
          );
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

      // --- Recurring transactions due this month: notify once, guarded by
      // notifiedMonth. The permanent pending list in Finance → Debts
      // (recurringSummary.pendingRecurring) is the real reliability
      // backstop, independent of whether this notification ever fires — a
      // monthly due-check doesn't warrant a second native-schedule system
      // alongside the one habits/tasks/notes already have. ---
      const thisMonth = localMonthKey(now);
      const recurring = await db.recurringTransactions.toArray();
      for (const r of recurring) {
        if (!isPending(r, now) || r.notifiedMonth === thisMonth) continue;
        await db.recurringTransactions.update(r.id, { notifiedMonth: thisMonth });
        await showLocalNotification(
          "Recurring payment due",
          `${r.category} — ₹${r.amount.toLocaleString()}`,
          { kind: "recurring-due", recurringId: r.id },
        );
      }

      // --- Smart Notifications: four contextual nudges, gated one-per-day
      // via appSettings.smartNotified — bundled into one structured field
      // rather than a per-row lastReminderDate because these conditions are
      // cross-entity/global, not tied to one row. ---
      const smartSettings = await db.appSettings.get(1);
      const smartNotified =
        smartSettings?.smartNotified?.date === today
          ? smartSettings.smartNotified
          : { date: today };

      if (
        !smartNotified.habitsLeft ||
        !smartNotified.budgetClose ||
        !smartNotified.missionOneLeft ||
        !smartNotified.missionComplete
      ) {
        const [smHabits, smLogsToday, smTasks, smTransactions, smBudgets] =
          await Promise.all([
            db.habits.toArray(),
            db.habitLogs.where("date").equals(today).toArray(),
            db.tasks.toArray(),
            db.transactions.toArray(),
            db.budgets.toArray(),
          ]);
        const smDoneToday = new Set(
          smLogsToday.filter((l) => l.completed).map((l) => l.habitName),
        );
        const smDueHabits = smHabits.filter(
          (h) => !h.archived && isDueOn(h.schedule, now),
        );
        const smHabitsRemaining = smDueHabits.filter((h) => !smDoneToday.has(h.name)).length;
        const smMission = missionState(
          smDueHabits.length,
          smHabitsRemaining,
          smTasks.filter((t) => !t.done).length,
        );
        const smSafe = calcSafeToSpendToday(smTransactions, smBudgets, thisMonth, now);

        const triggers = smartTriggersDue(
          {
            now,
            habitsRemaining: smHabitsRemaining,
            missionSize: smMission.size,
            missionRemaining: smMission.remaining,
            todaySpend: calcDayTotal(smTransactions, today).totalExpense,
            safePerDay: smSafe?.perDay ?? null,
          },
          smartNotified,
        );

        if (triggers.length > 0) {
          const patch = { ...smartNotified };
          for (const trigger of triggers) {
            switch (trigger.kind) {
              case "habitsLeft":
                patch.habitsLeft = true;
                await showLocalNotification(
                  "Almost there",
                  `You have ${trigger.count} habit${trigger.count === 1 ? "" : "s"} left today.`,
                );
                break;
              case "budgetClose":
                patch.budgetClose = true;
                await showLocalNotification(
                  "Budget check",
                  "You're close to today's budget.",
                );
                break;
              case "missionOneLeft":
                patch.missionOneLeft = true;
                await showLocalNotification(
                  "So close",
                  "You're one task away from completing today's mission.",
                );
                break;
              case "missionComplete":
                patch.missionComplete = true;
                await showLocalNotification(
                  "Mission Accomplished ✅",
                  "Congratulations! You completed today's mission.",
                );
                break;
            }
          }
          await db.appSettings.update(1, { smartNotified: patch });
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
