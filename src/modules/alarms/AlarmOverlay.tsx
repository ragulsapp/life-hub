import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { db } from "../../db/db";
import { useScheduler } from "../../lib/scheduler";
import { startAlarmSound, stopAlarmSound, vibrate } from "../../lib/alarmSound";
import { MathMission } from "./missions/MathMission";
import { MemoryMission } from "./missions/MemoryMission";

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="text-6xl font-extrabold tabular-nums text-white">
      {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
    </div>
  );
}

export function AlarmOverlay() {
  const { activeAlarm, dismiss } = useScheduler();

  useEffect(() => {
    if (!activeAlarm) return;

    let stopped = false;
    (async () => {
      let blob: Blob | null = null;
      if (activeAlarm.soundId != null) {
        const sound = await db.sounds.get(activeAlarm.soundId);
        blob = sound?.blob ?? null;
      }
      if (!stopped) startAlarmSound(blob);
    })();
    vibrate();
    const vibrateId = setInterval(vibrate, 3000);

    // Keep the screen awake while ringing (best-effort).
    let wakeLock: { release: () => Promise<void> } | null = null;
    const nav = navigator as unknown as {
      wakeLock?: { request: (t: string) => Promise<typeof wakeLock> };
    };
    nav.wakeLock
      ?.request("screen")
      .then((wl) => (wakeLock = wl))
      .catch(() => {});

    return () => {
      stopped = true;
      stopAlarmSound();
      clearInterval(vibrateId);
      wakeLock?.release().catch(() => {});
    };
  }, [activeAlarm]);

  return (
    <AnimatePresence>
      {activeAlarm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 overflow-y-auto bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 p-6"
        >
          <motion.div
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ repeat: Infinity, duration: 1.4 }}
            className="text-5xl"
          >
            ⏰
          </motion.div>
          <LiveClock />
          <div className="text-center text-lg font-semibold text-white/80">
            {activeAlarm.label || "Alarm"}
          </div>

          <div className="w-full max-w-sm rounded-3xl bg-white/5 p-6 backdrop-blur">
            {activeAlarm.mission === "math" ? (
              <MathMission
                difficulty={activeAlarm.difficulty}
                steps={activeAlarm.difficulty + 1}
                onSolved={dismiss}
              />
            ) : (
              <MemoryMission
                difficulty={activeAlarm.difficulty}
                onSolved={dismiss}
              />
            )}
          </div>

          <p className="max-w-xs text-center text-xs text-white/40">
            The alarm stops only when you finish the mission. Stay awake!
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
