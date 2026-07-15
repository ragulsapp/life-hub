import { useMemo, useState } from "react";
import { motion } from "framer-motion";

interface Problem {
  text: string;
  answer: number;
}

function makeProblem(difficulty: number): Problem {
  // difficulty 1: 2-digit add/sub · 2: with ×(1-digit) · 3: 2-digit ×
  const r = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;
  if (difficulty >= 3) {
    const a = r(11, 29);
    const b = r(11, 19);
    return { text: `${a} × ${b}`, answer: a * b };
  }
  if (difficulty === 2) {
    const a = r(2, 9);
    const b = r(11, 29);
    return { text: `${a} × ${b}`, answer: a * b };
  }
  const a = r(23, 89);
  const b = r(11, 49);
  return Math.random() > 0.5
    ? { text: `${a} + ${b}`, answer: a + b }
    : { text: `${a + b} − ${b}`, answer: a };
}

export function MathMission({
  difficulty,
  steps,
  onSolved,
}: {
  difficulty: number;
  steps: number;
  onSolved: () => void;
}) {
  const problems = useMemo(
    () => Array.from({ length: steps }, () => makeProblem(difficulty)),
    [difficulty, steps],
  );
  const [idx, setIdx] = useState(0);
  const [value, setValue] = useState("");
  const [wrong, setWrong] = useState(false);

  const current = problems[idx];

  const submit = () => {
    if (Number(value) === current.answer) {
      setWrong(false);
      if (idx + 1 >= steps) onSolved();
      else {
        setIdx(idx + 1);
        setValue("");
      }
    } else {
      setWrong(true);
      setValue("");
      setTimeout(() => setWrong(false), 500);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-sm font-medium text-white/70">
        Solve to dismiss · {idx + 1}/{steps}
      </div>
      <motion.div
        key={idx}
        animate={wrong ? { x: [-8, 8, -8, 8, 0] } : { x: 0 }}
        className="text-5xl font-extrabold tabular-nums text-white"
      >
        {current.text}
      </motion.div>
      <input
        autoFocus
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="?"
        className={`w-40 rounded-2xl border-2 bg-white/10 p-3 text-center text-2xl font-bold text-white outline-none ${
          wrong ? "border-red-400" : "border-white/30 focus:border-white"
        }`}
      />
      <button
        onClick={submit}
        className="rounded-2xl bg-white px-8 py-3 text-lg font-bold text-slate-900 active:scale-95"
      >
        Check
      </button>
    </div>
  );
}
