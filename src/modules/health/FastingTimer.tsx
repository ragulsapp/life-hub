import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, DEFAULT_FAST_HOURS } from "../../db/db";
import { ProgressRing } from "../../components/ProgressRing";
import { Button } from "../../components/Button";

const todayStr = () => new Date().toISOString().slice(0, 10);

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

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  const start = async () => {
    await db.fastingSessions.add({
      startedAt: Date.now(),
      targetHours: DEFAULT_FAST_HOURS,
    } as never);
    setNow(Date.now());
  };

  const end = async () => {
    if (!active) return;
    const elapsedHours = (Date.now() - active.startedAt) / 3600000;
    await db.fastingSessions.update(active.id, { endedAt: Date.now() });
    // If the fast reached its target, mark today's 15.5h-fast metric done.
    if (elapsedHours >= active.targetHours) {
      const today = todayStr();
      const existing = await db.healthMetrics
        .where({ date: today, metricType: "15.5h-fast" })
        .first();
      if (existing) await db.healthMetrics.update(existing.id, { value: 1 });
      else
        await db.healthMetrics.add({
          date: today,
          metricType: "15.5h-fast",
          value: 1,
        } as never);
    }
  };

  if (!active) {
    return (
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold text-slate-800 dark:text-slate-100">
            Not fasting
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Target {DEFAULT_FAST_HOURS}h window
          </div>
        </div>
        <Button variant="toggle-on" onClick={start}>
          Start Fast
        </Button>
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
      <div className="flex-1">
        <div className="text-lg font-extrabold tabular-nums text-slate-900 dark:text-white">
          {fmt(elapsedMs)}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {reached
            ? `🎉 Target reached! +${fmt(-remainingMs)} extra`
            : `${fmt(remainingMs)} to ${active.targetHours}h`}
        </div>
        <Button
          variant={reached ? "toggle-on" : "secondary"}
          onClick={end}
          className="mt-2 !py-1.5 text-sm"
        >
          End Fast
        </Button>
      </div>
    </div>
  );
}
