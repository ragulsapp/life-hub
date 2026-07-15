import { useState } from "react";
import { db } from "../../db/db";
import { Button } from "../../components/Button";
import { inputClass } from "../../components/inputStyles";

export function GoalForm() {
  const [title, setTitle] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const add = async () => {
    if (!title.trim()) return;
    await db.goals.add({
      title: title.trim(),
      status: "active",
      targetDate: targetDate || undefined,
    } as never);
    setTitle("");
    setTargetDate("");
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
      <Button onClick={add} disabled={!title.trim()}>
        Add Goal
      </Button>
    </div>
  );
}
