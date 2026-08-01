import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type GoalTerm } from "../../db/db";
import { Button } from "../../components/Button";
import { inputClass } from "../../components/inputStyles";

const TERM_LABEL: Record<GoalTerm, string> = {
  long: "Long-term",
  short: "Short-term",
  today: "Today",
};
const TERM_OPTIONS: GoalTerm[] = ["long", "short", "today"];

export function GoalForm() {
  const [title, setTitle] = useState("");
  const [targetDate, setTargetDate] = useState("");
  // "short" default matches every other form in the app defaulting to the
  // most common case rather than forcing a blank choice.
  const [term, setTerm] = useState<GoalTerm>("short");
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
      term,
      linkedHabits: linked.length ? linked : undefined,
      createdAt: Date.now(),
    } as never);
    setTitle("");
    setTargetDate("");
    setTerm("short");
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
      <div className="flex gap-1.5">
        {TERM_OPTIONS.map((t) => (
          <button
            key={t}
            onClick={() => setTerm(t)}
            className={`flex-1 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors ${
              term === t
                ? "bg-cyan-500 text-white"
                : "bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300"
            }`}
          >
            {TERM_LABEL[t]}
          </button>
        ))}
      </div>
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
                    ? "bg-cyan-500 text-white"
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
