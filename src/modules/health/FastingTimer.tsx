import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, DEFAULT_FAST_HOURS, FAST_TARGET_PRESETS } from "../../db/db";
import { ProgressRing } from "../../components/ProgressRing";
import { Button } from "../../components/Button";
import { inputClass } from "../../components/inputStyles";
import {
  requestNotificationPermission,
  showLocalNotification,
} from "../../lib/notify";

/**
 * A fast the user chose to keep. Framed as an observance being kept and
 * completed — not a metabolic protocol with a goal to hit, and never with
 * "time to eat!" celebration copy, which is wrong for a religious fast.
 */
function fmt(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

export function FastingTimer() {
  const active = useLiveQuery(
    () => db.fastingSessions.filter((f) => f.endedAt === undefined).first(),
    [],
  );
  const [now, setNow] = useState(Date.now());
  const [target, setTarget] = useState(DEFAULT_FAST_HOURS);
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  const start = async () => {
    await requestNotificationPermission();
    const name = label.trim();
    await db.fastingSessions.add({
      startedAt: Date.now(),
      targetHours: target,
      label: name || undefined,
    } as never);
    setNow(Date.now());
    setLabel("");
    await showLocalNotification(
      name ? `${name} started` : "Fast started",
      `Tracking ${target}h. I'll let you know when you reach it.`,
    );
  };

  const end = async () => {
    if (!active) return;
    // fastingSessions is the single source of truth for fasting history —
    // no duplicate healthMetrics row needed.
    await db.fastingSessions.update(active.id, { endedAt: Date.now() });
  };

  if (!active) {
    return (
      <div className="flex flex-col gap-3">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="What are you keeping? (optional)"
          className={`!p-2 text-sm ${inputClass}`}
        />
        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            How long
          </div>
          <div className="flex flex-wrap gap-2">
            {FAST_TARGET_PRESETS.map((h) => (
              <button
                key={h}
                onClick={() => setTarget(h)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  target === h
                    ? "bg-cyan-500 text-slate-900"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400"
                }`}
              >
                {h}h
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="font-semibold text-slate-800 dark:text-slate-100">
              Not currently fasting
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Tracking {target}h when you start
            </div>
          </div>
          <Button variant="toggle-on" onClick={start}>
            Start
          </Button>
        </div>
      </div>
    );
  }

  const elapsedMs = now - active.startedAt;
  const targetMs = active.targetHours * 3600000;
  const percent = Math.min(100, (elapsedMs / targetMs) * 100);
  const reached = elapsedMs >= targetMs;
  const remainingMs = targetMs - elapsedMs;

  return (
    <div className="flex items-center gap-4">
      <ProgressRing
        percent={percent}
        size={92}
        strokeWidth={8}
        color={reached ? "#34d399" : "#22d3ee"}
      >
        <span className="text-sm font-extrabold text-slate-700 dark:text-slate-100">
          {Math.floor(percent)}%
        </span>
      </ProgressRing>
      <div className="min-w-0 flex-1">
        {active.label && (
          <div className="truncate text-xs font-semibold text-cyan-500">
            {active.label}
          </div>
        )}
        <div className="text-lg font-extrabold tabular-nums text-slate-900 dark:text-white">
          {fmt(elapsedMs)}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {reached
            ? `${active.targetHours}h reached · ${fmt(-remainingMs)} beyond`
            : `${fmt(remainingMs)} to ${active.targetHours}h`}
        </div>
        <Button
          variant={reached ? "toggle-on" : "secondary"}
          onClick={end}
          className="mt-2 !py-1.5 text-sm"
        >
          Complete
        </Button>
      </div>
    </div>
  );
}
