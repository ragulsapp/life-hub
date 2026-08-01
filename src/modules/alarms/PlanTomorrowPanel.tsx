import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { motion, Reorder, useDragControls } from "framer-motion";
import { db, type Task } from "../../db/db";
import { Button } from "../../components/Button";
import { inputClass } from "../../components/inputStyles";
import { tomorrowStr } from "../../lib/dates";
import { sortByOrder } from "../../lib/taskOrder";
import { cancelReminder, taskNotifId } from "../../lib/notify";

/**
 * Opened by tapping the Night Reminder notification, or manually. Planning
 * only — no done-toggle here, that belongs to the real Tasks list once
 * tomorrow actually arrives.
 */

function TaskRow({
  task,
  onSave,
  onDelete,
}: {
  task: Task;
  onSave: (id: number, title: string) => void;
  onDelete: (id: number) => void;
}) {
  const controls = useDragControls();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);

  const save = () => {
    const t = draft.trim();
    if (t) onSave(task.id, t);
    else setDraft(task.title);
    setEditing(false);
  };

  return (
    <Reorder.Item
      value={task}
      id={String(task.id)}
      dragListener={false}
      dragControls={controls}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className="flex items-center gap-2 rounded-2xl bg-slate-50 p-3 dark:bg-slate-700/40"
    >
      <button
        onPointerDown={(e) => controls.start(e)}
        aria-label={`Reorder "${task.title}"`}
        className="shrink-0 cursor-grab touch-none px-1 text-slate-300 active:cursor-grabbing dark:text-slate-500"
      >
        ⋮⋮
      </button>

      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => e.key === "Enter" && save()}
          className={`flex-1 !p-1.5 text-sm ${inputClass}`}
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="min-w-0 flex-1 truncate text-left text-slate-900 dark:text-white"
        >
          {task.title}
        </button>
      )}

      <button
        onClick={() => onDelete(task.id)}
        aria-label={`Delete "${task.title}"`}
        className="shrink-0 text-xs text-slate-300 hover:text-red-500 dark:text-slate-600"
      >
        ✕
      </button>
    </Reorder.Item>
  );
}

export function PlanTomorrowPanel({ onClose }: { onClose: () => void }) {
  const tomorrow = tomorrowStr();
  const allTasks = useLiveQuery(() => db.tasks.toArray(), []) ?? [];
  const [title, setTitle] = useState("");

  const tasks = sortByOrder(allTasks.filter((t) => t.dueDate === tomorrow));

  const add = async () => {
    const t = title.trim();
    if (!t) return;
    const maxOrder = tasks.reduce((m, x) => Math.max(m, x.order ?? -1), -1);
    await db.tasks.add({
      title: t,
      done: false,
      createdAt: Date.now(),
      dueDate: tomorrow,
      order: maxOrder + 1,
    } as never);
    setTitle("");
  };

  const rename = (id: number, newTitle: string) => {
    db.tasks.update(id, { title: newTitle });
  };

  const remove = (id: number) => {
    cancelReminder(taskNotifId(id));
    db.tasks.delete(id);
  };

  const reorder = (newOrder: Task[]) => {
    newOrder.forEach((t, i) => {
      if (t.order !== i) db.tasks.update(t.id, { order: i });
    });
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
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Plan Tomorrow
            </h1>
            <p className="text-xs text-slate-400">{tomorrow}</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:bg-slate-700/60"
          >
            ✕
          </motion.button>
        </div>

        <div className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Add something for tomorrow..."
            className={`flex-1 ${inputClass}`}
          />
          <Button onClick={add} disabled={!title.trim()}>
            Add
          </Button>
        </div>

        <Reorder.Group
          axis="y"
          values={tasks}
          onReorder={reorder}
          className="flex flex-col gap-2"
        >
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} onSave={rename} onDelete={remove} />
          ))}
        </Reorder.Group>
        {tasks.length === 0 && (
          <p className="text-center text-sm text-slate-400">
            Nothing planned yet — add tomorrow's first task above.
          </p>
        )}

        <Button onClick={onClose} className="mt-2 w-full">
          Save tomorrow's plan
        </Button>
      </div>
    </motion.div>
  );
}
