import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion } from "framer-motion";
import { db } from "../../db/db";
import { Card } from "../../components/Card";
import { inputClass } from "../../components/inputStyles";
import { NoteEditor } from "./NoteEditor";
import { requestNotificationPermission } from "../../lib/notify";
import { reminderCreationGuard } from "../../lib/reminderLogic";

export function NotesView() {
  const notes = useLiveQuery(() => db.notes.toArray(), []) ?? [];
  const [query, setQuery] = useState("");

  const filtered = notes
    .filter(
      (n) =>
        !query.trim() ||
        n.title.toLowerCase().includes(query.toLowerCase()) ||
        n.body.toLowerCase().includes(query.toLowerCase()) ||
        n.tags.some((t) => t.toLowerCase().includes(query.toLowerCase())),
    )
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.createdAt - a.createdAt;
    });

  const togglePin = async (id: number, pinned: boolean) => {
    await db.notes.update(id, { pinned: !pinned });
  };

  const remove = async (id: number) => {
    await db.notes.delete(id);
  };

  const toggleReminder = async (
    id: number,
    enabled: boolean,
    time?: string,
  ) => {
    if (!enabled) await requestNotificationPermission();
    await db.notes.update(id, {
      reminderEnabled: enabled,
      reminderTime: time ?? "09:00",
      lastReminderDate: reminderCreationGuard(time ?? "09:00"),
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        Notes
      </h1>

      <Card title="New Note">
        <NoteEditor />
      </Card>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search notes or tags..."
        className={`bg-white/80 dark:bg-slate-800/60 ${inputClass}`}
      />

      <div className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {filtered.map((n) => (
            <motion.div
              key={n.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
            >
              <Card>
                <div className="flex items-start justify-between">
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {n.pinned && "📌 "}
                    {n.title}
                  </div>
                  <div className="flex gap-2 text-xs">
                    <button
                      onClick={() => togglePin(n.id, n.pinned)}
                      className="text-slate-400 hover:text-cyan-500"
                    >
                      {n.pinned ? "Unpin" : "Pin"}
                    </button>
                    <button
                      onClick={() => remove(n.id)}
                      aria-label={`Delete note "${n.title}"`}
                      className="text-slate-400 hover:text-red-500"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                {n.sensitive && (
                  <div className="mt-2 rounded-xl border-2 border-amber-400 bg-amber-50 p-2 text-xs font-semibold text-amber-700 dark:border-amber-500/60 dark:bg-amber-900/20 dark:text-amber-300">
                    ⚠️ Marked sensitive — review before sharing.
                  </div>
                )}
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
                  {n.body}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {n.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-700/60 dark:text-slate-300"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2 border-t border-slate-200/60 pt-2 dark:border-slate-600/40">
                  {n.reminderEnabled && (
                    <input
                      type="time"
                      value={n.reminderTime ?? "09:00"}
                      onChange={(e) =>
                        toggleReminder(n.id, true, e.target.value)
                      }
                      className="rounded-md bg-slate-100 px-1 py-0.5 text-[11px] dark:bg-slate-700/50"
                    />
                  )}
                  <button
                    onClick={() =>
                      toggleReminder(n.id, !n.reminderEnabled, n.reminderTime)
                    }
                    className={`text-[11px] font-medium ${
                      n.reminderEnabled
                        ? "text-cyan-500"
                        : "text-slate-400 hover:text-cyan-500"
                    }`}
                  >
                    {n.reminderEnabled
                      ? `🔔 Reminder on`
                      : "🔔 Add reminder"}
                  </button>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className="text-sm text-slate-500 dark:text-slate-400">
            No notes found.
          </div>
        )}
      </div>
    </div>
  );
}
