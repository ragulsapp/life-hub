import { useState } from "react";
import { TimeField } from "../../components/DateTimeField";
import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion } from "framer-motion";
import { db } from "../../db/db";
import { Card } from "../../components/Card";
import { inputClass } from "../../components/inputStyles";
import {
  cancelReminder,
  noteNotifId,
  requestNotificationPermission,
  scheduleDailyReminder,
} from "../../lib/notify";
import { reminderCreationGuard } from "../../lib/reminderLogic";
import { DeleteButton } from "../../components/IconButton";
import { EmptyState } from "../../components/EmptyState";
import {
  AlertIcon,
  BellIcon,
  NoteIcon,
  PinIcon,
} from "../../components/Icons";

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
    await cancelReminder(noteNotifId(id));
    await db.notes.delete(id);
  };

  const toggleReminder = async (
    id: number,
    title: string,
    enabled: boolean,
    time?: string,
  ) => {
    const t = time ?? "09:00";
    if (enabled) {
      await requestNotificationPermission();
      await scheduleDailyReminder(noteNotifId(id), "Note reminder", title, t);
    } else {
      await cancelReminder(noteNotifId(id));
    }
    await db.notes.update(id, {
      reminderEnabled: enabled,
      reminderTime: t,
      lastReminderDate: reminderCreationGuard(t),
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">

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
                    {n.pinned && (
                      <PinIcon
                        size={14}
                        on
                        className="mr-1 inline-block align-[-1px] text-cyan-500 dark:text-cyan-300"
                      />
                    )}
                    {n.title}
                  </div>
                  <div className="flex gap-2 text-xs">
                    <button
                      onClick={() => togglePin(n.id, n.pinned)}
                      className="inline-flex h-11 items-center rounded-xl px-2 text-slate-500 dark:text-slate-400 transition-colors hover:bg-cyan-500/10 hover:text-cyan-500 dark:hover:text-cyan-300"
                    >
                      {n.pinned ? "Unpin" : "Pin"}
                    </button>
                    <DeleteButton onDelete={() => remove(n.id)} label={`Delete note "${n.title}"`} />
                  </div>
                </div>
                {n.sensitive && (
                  <div className="mt-2 rounded-xl border-2 border-amber-400 bg-amber-50 p-2 text-xs font-semibold text-amber-700 dark:border-amber-500/60 dark:bg-amber-900/20 dark:text-amber-300">
                    <AlertIcon size={14} className="mr-1 inline-block align-[-2px]" />
                    Marked sensitive — review before sharing.
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
                    <TimeField
                      className="flex-1"
                      value={n.reminderTime ?? "09:00"}
                      onCommit={(v) => toggleReminder(n.id, n.title, true, v)}
                    />
                  )}
                  <button
                    onClick={() =>
                      toggleReminder(
                        n.id,
                        n.title,
                        !n.reminderEnabled,
                        n.reminderTime,
                      )
                    }
                    className={`inline-flex h-11 items-center gap-1 rounded-xl px-2 text-caption font-medium transition-colors hover:bg-cyan-500/10 ${
                      n.reminderEnabled
                        ? "text-cyan-500 dark:text-cyan-300"
                        : "text-slate-500 dark:text-slate-400 hover:text-cyan-500 dark:hover:text-cyan-300"
                    }`}
                  >
                    <BellIcon size={13} on={!!n.reminderEnabled} />
                    {n.reminderEnabled ? "Reminder on" : "Add reminder"}
                  </button>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <EmptyState
            icon={<NoteIcon size={30} />}
            title={notes.length === 0 ? "No notes yet" : "Nothing matches"}
            hint={
              notes.length === 0
                ? "Anything you want to keep. It never leaves this device. Tap + to write one."
                : "Try a different word, or clear the filters."
            }
          />
        )}
      </div>
    </div>
  );
}
