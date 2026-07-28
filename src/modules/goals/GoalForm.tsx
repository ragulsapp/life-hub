import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import { Button } from "../../components/Button";
import { inputClass } from "../../components/inputStyles";

export function GoalForm() {
  const [title, setTitle] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [linked, setLinked] = useState<string[]>([]);

  const habits =
    useLiveQuery(() => db.habits.filter((h) => !h.archived).toArray(), []) ?? [];

  const toggleHabit = (name: string) =>
    setLinked((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );

  const add = async () => {
    if (!title.trim()) return;
    await db.goals.add({
      title: title.trim(),
      status: "active",
      targetDate: targetDate || undefined,
      linkedHabits: linked.length ? linked : undefined,
    } as never);
    setTitle("");
    setTargetDate("");
    setLinked([]);
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="New goal..."
        className={inputClass}
      />
      <input
        value={targetDate}
        onChange={(e) => setTargetDate(e.target.value)}
        type="date"
        className={inputClass}
      />

      {habits.length > 0 && (
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            Daily steps — habits that move this forward
          </div>
          <div className="flex flex-wrap gap-1.5">
            {habits.map((h) => (
              <button
                key={h.id}
                onClick={() => toggleHabit(h.name)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  linked.includes(h.name)
                    ? "bg-cyan-500 text-slate-900"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400"
                }`}
              >
                {h.icon} {h.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <Button onClick={add} disabled={!title.trim()}>
        Add Goal
      </Button>
    </div>
  );
}
