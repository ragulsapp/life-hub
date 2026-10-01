import { useState } from "react";
import { DateField } from "../../components/DateTimeField";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type GoalTerm } from "../../db/db";
import { Button } from "../../components/Button";
import { inputClass } from "../../components/inputStyles";
import { Chip, Segmented } from "../../components/Chip";

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
      <Segmented
        options={TERM_OPTIONS.map((t) => ({ id: t, label: TERM_LABEL[t] }))}
        value={term}
        onChange={setTerm}
      />
      <DateField label="Target date" value={targetDate} onCommit={setTargetDate} />

      {habits.length > 0 && (
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            Daily steps — habits that move this forward
          </div>
          <div className="flex flex-wrap gap-1.5">
            {habits.map((h) => (
              <Chip
                key={h.id}
                selected={linked.includes(h.name)}
                onClick={() => toggleHabit(h.name)}
              >
                {h.icon} {h.name}
              </Chip>
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
