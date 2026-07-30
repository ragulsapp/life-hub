import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { db } from "../../db/db";
import { useScheduler } from "../../lib/scheduler";
import { startAlarmSound, stopAlarmSound, vibrate } from "../../lib/alarmSound";
import { minutesAfterScheduled } from "../../lib/wakeStreak";
import { MathMission } from "./missions/MathMission";
import { MemoryMission } from "./missions/MemoryMission";
import { MorningBriefing } from "./MorningBriefing";
import { recordWakeUp } from "./wakeActions";

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
  const [needsTap, setNeedsTap] = useState(false);
  const [solved, setSolved] = useState(false);
  const [minutesLate, setMinutesLate] = useState(0);
  const blobRef = useRef<Blob | null>(null);
  const vibrateRef = useRef<number | null>(null);

  const stopRinging = () => {
    stopAlarmSound();
    if (vibrateRef.current !== null) {
      clearInterval(vibrateRef.current);
      vibrateRef.current = null;
    }
  };

  /**
   * Mission beaten. The overlay stays mounted to show the briefing, so the
   * alarm has to be silenced explicitly here — the effect's cleanup won't run
   * until the user taps through to the app.
   */
  const handleSolved = async () => {
    if (!activeAlarm) return;
    stopRinging();
    const at = Date.now();
    setMinutesLate(minutesAfterScheduled(activeAlarm.time, at));
    try {
      await recordWakeUp(activeAlarm, at);
    } catch (err) {
      // A failed write must never trap the user behind the overlay.
      console.error(err);
    }
    setSolved(true);
  };

  useEffect(() => {
    if (!activeAlarm) return;

    let stopped = false;
    setNeedsTap(false);
    setSolved(false);
    (async () => {
      let blob: Blob | null = null;
      if (activeAlarm.soundId != null) {
        const sound = await db.sounds.get(activeAlarm.soundId);
        blob = sound?.blob ?? null;
      }
      blobRef.current = blob;
      if (stopped) return;
      const audible = await startAlarmSound(blob);
      if (!stopped) setNeedsTap(!audible);
    })();
    vibrate();
    vibrateRef.current = window.setInterval(vibrate, 3000);

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
      stopRinging();
      wakeLock?.release().catch(() => {});
    };
  }, [activeAlarm]);

  // NOTE: no AnimatePresence exit animation here — the always-running child
  // animations (clock tick, pulse) prevent exit-complete from firing, which
  // strands an invisible full-screen layer that blocks all taps. Dismissal
  // unmounts immediately; only the entrance fades.
  return (
    <>
      {activeAlarm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 overflow-y-auto bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 p-6"
        >
          {solved ? (
            <MorningBriefing minutesLate={minutesLate} onDone={dismiss} />
          ) : (
            <>
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

          {needsTap && (
            <motion.button
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              onClick={async () => {
                stopAlarmSound();
                const audible = await startAlarmSound(blobRef.current);
                setNeedsTap(!audible);
              }}
              className="rounded-2xl bg-amber-400 px-6 py-3 text-base font-bold text-slate-900"
            >
              🔊 Tap for sound
            </motion.button>
          )}

          <div className="w-full max-w-sm rounded-3xl bg-white/5 p-6 backdrop-blur">
            {activeAlarm.mission === "math" ? (
              <MathMission
                difficulty={activeAlarm.difficulty}
                steps={activeAlarm.difficulty + 1}
                onSolved={handleSolved}
              />
            ) : (
              <MemoryMission
                difficulty={activeAlarm.difficulty}
                onSolved={handleSolved}
              />
            )}
          </div>

          <p className="max-w-xs text-center text-xs text-white/40">
            The alarm stops only when you finish the mission. Stay awake!
          </p>
            </>
          )}
        </motion.div>
      )}
    </>
  );
}
