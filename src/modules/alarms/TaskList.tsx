import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion } from "framer-motion";
import { db } from "../../db/db";
import { Button } from "../../components/Button";
import { inputClass } from "../../components/inputStyles";
import {
  cancelReminder,
  requestNotificationPermission,
  scheduleDailyReminder,
  taskNotifId,
} from "../../lib/notify";
import { reminderCreationGuard } from "../../lib/reminderLogic";

export function TaskList() {
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? [];
  const [title, setTitle] = useState("");
  const [editingReminder, setEditingReminder] = useState<number | null>(null);

  const sorted = [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return b.createdAt - a.createdAt;
  });

  const add = async () => {
    const t = title.trim();
    if (!t) return;
    await db.tasks.add({ title: t, done: false, createdAt: Date.now() } as never);
    setTitle("");
  };

  const toggle = (id: number, done: boolean) =>
    db.tasks.update(id, { done: !done });
  const remove = (id: number) => {
    cancelReminder(taskNotifId(id));
    db.tasks.delete(id);
  };

  const setReminder = async (id: number, title: string, time: string) => {
    await requestNotificationPermission();
    await scheduleDailyReminder(taskNotifId(id), "Task reminder", title, time);
    await db.tasks.update(id, {
      reminderTime: time,
      reminderEnabled: !!time,
      // A time already past today anchors to tomorrow (no instant fire).
      lastReminderDate: reminderCreationGuard(time),
    });
    setEditingReminder(null);
  };

  const clearReminder = (id: number) => {
    cancelReminder(taskNotifId(id));
    db.tasks.update(id, { reminderEnabled: false });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="New task..."
          className={`flex-1 ${inputClass}`}
        />
        <Button onClick={add} disabled={!title.trim()}>
          Add
        </Button>
      </div>

      <ul className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {sorted.map((t) => (
            <motion.li
              key={t.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -16 }}
              className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-700/40"
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggle(t.id, t.done)}
                  aria-label={`Mark "${t.title}" ${t.done ? "not done" : "done"}`}
                  aria-pressed={t.done}
                  className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 text-xs ${
                    t.done
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-slate-300 dark:border-slate-500"
                  }`}
                >
                  {t.done && "✓"}
                </button>
                <span
                  className={`flex-1 ${
                    t.done
                      ? "text-slate-400 line-through dark:text-slate-500"
                      : "text-slate-900 dark:text-white"
                  }`}
                >
                  {t.title}
                </span>
                <button
                  onClick={() =>
                    setEditingReminder(editingReminder === t.id ? null : t.id)
                  }
                  aria-label={
                    t.reminderEnabled
                      ? `Reminder set for ${t.reminderTime}`
                      : "Set reminder"
                  }
                  className={`text-xs ${
                    t.reminderEnabled
                      ? "text-cyan-500 dark:text-cyan-300"
                      : "text-slate-400 hover:text-cyan-500 dark:hover:text-cyan-300"
                  }`}
                >
                  {t.reminderEnabled ? `🔔 ${t.reminderTime}` : "🔔"}
                </button>
                <button
                  onClick={() => remove(t.id)}
                  aria-label={`Delete task "${t.title}"`}
                  className="text-xs text-slate-300 hover:text-red-500 dark:text-slate-600"
                >
                  ✕
                </button>
              </div>

              {editingReminder === t.id && (
                <div className="mt-2 flex items-center gap-2 border-t border-slate-200/60 pt-2 dark:border-slate-600/40">
                  <input
                    type="time"
                    defaultValue={t.reminderTime ?? "09:00"}
                    onChange={(e) => setReminder(t.id, t.title, e.target.value)}
                    className={`!p-1.5 text-sm ${inputClass}`}
                  />
                  {t.reminderEnabled && (
                    <button
                      onClick={() => clearReminder(t.id)}
                      className="text-xs text-red-500"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
            </motion.li>
          ))}
        </AnimatePresence>
        {sorted.length === 0 && (
          <li className="text-sm text-slate-500 dark:text-slate-400">
            No tasks yet.
          </li>
        )}
      </ul>
    </div>
  );
}
