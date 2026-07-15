import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";

const PADS = [
  { id: 0, color: "#f43f5e" },
  { id: 1, color: "#22d3ee" },
  { id: 2, color: "#a78bfa" },
  { id: 3, color: "#34d399" },
];

/** Simon-style: watch a growing sequence, then repeat it. */
export function MemoryMission({
  difficulty,
  onSolved,
}: {
  difficulty: number;
  onSolved: () => void;
}) {
  const length = 3 + difficulty; // 4..6
  const [sequence, setSequence] = useState<number[]>([]);
  const [phase, setPhase] = useState<"watch" | "input">("watch");
  const [litPad, setLitPad] = useState<number | null>(null);
  const [inputIdx, setInputIdx] = useState(0);
  const [wrongPad, setWrongPad] = useState<number | null>(null);

  useEffect(() => {
    setSequence(
      Array.from({ length }, () => Math.floor(Math.random() * PADS.length)),
    );
  }, [length]);

  const playSequence = useCallback(async () => {
    setPhase("watch");
    setInputIdx(0);
    await new Promise((r) => setTimeout(r, 600));
    for (const pad of sequence) {
      setLitPad(pad);
      await new Promise((r) => setTimeout(r, 450));
      setLitPad(null);
      await new Promise((r) => setTimeout(r, 200));
    }
    setPhase("input");
  }, [sequence]);

  useEffect(() => {
    if (sequence.length) playSequence();
  }, [sequence, playSequence]);

  const tap = (id: number) => {
    if (phase !== "input") return;
    if (id === sequence[inputIdx]) {
      const next = inputIdx + 1;
      setLitPad(id);
      setTimeout(() => setLitPad(null), 150);
      if (next >= sequence.length) onSolved();
      else setInputIdx(next);
    } else {
      setWrongPad(id);
      setTimeout(() => setWrongPad(null), 400);
      playSequence(); // restart from the beginning
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-sm font-medium text-white/70">
        {phase === "watch"
          ? "Watch the sequence…"
          : `Repeat it · ${inputIdx}/${sequence.length}`}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {PADS.map((pad) => (
          <motion.button
            key={pad.id}
            disabled={phase !== "input"}
            onClick={() => tap(pad.id)}
            animate={{
              scale: wrongPad === pad.id ? [1, 0.9, 1] : 1,
              opacity: litPad === pad.id ? 1 : 0.4,
            }}
            transition={{ duration: 0.15 }}
            className="h-24 w-24 rounded-3xl"
            style={{
              backgroundColor: pad.color,
              boxShadow:
                litPad === pad.id ? `0 0 30px 4px ${pad.color}` : "none",
            }}
          />
        ))}
      </div>
    </div>
  );
}
