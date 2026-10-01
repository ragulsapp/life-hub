import { useEffect, useRef, useState } from "react";

/**
 * The app's time and date control.
 *
 * Replaces seven hand-rolled `<input type="time">` / `type="date"` elements,
 * each styled differently. The worst of them — the habit reminder — rendered
 * 22px tall at 11px type, less than half Android's 48dp minimum and Apple's
 * 44pt, which is why its time could not be changed: the target was too small
 * to hit, not the handler wrong.
 *
 * It also fixes a subtler failure those inputs shared. They were controlled
 * straight from Dexie, and every keystroke or spin of the native picker wrote
 * to the database and rescheduled a notification. The write round-trips
 * through a liveQuery before coming back as a new `value`, so the field could
 * reset itself mid-interaction — the picker fighting the app for control.
 *
 * Here the field owns its value while focused and reports outward on a
 * debounce and on blur, so the picker is never interrupted and the expensive
 * work (a Dexie write, an OS notification reschedule) happens once per edit
 * rather than once per tick of the wheel.
 */
function Field({
  kind,
  value,
  onCommit,
  label,
  hint,
  className = "",
  commitDelayMs = 500,
  size = "md",
}: {
  kind: "time" | "date";
  value: string;
  /** Called once the edit settles — not on every intermediate value. */
  onCommit: (next: string) => void;
  label?: string;
  hint?: string;
  className?: string;
  commitDelayMs?: number;
  /** "lg" makes the value the headline — for screens where the time IS the subject. */
  size?: "md" | "lg";
}) {
  const [local, setLocal] = useState(value);
  const focused = useRef(false);
  const timer = useRef<number | undefined>(undefined);

  // Accept outside changes (an import, a reset, another screen) — but never
  // while the user is mid-edit, which is the reset that caused the fighting.
  useEffect(() => {
    if (!focused.current) setLocal(value);
  }, [value]);

  useEffect(
    () => () => {
      if (timer.current !== undefined) window.clearTimeout(timer.current);
    },
    [],
  );

  const commit = (next: string) => {
    if (timer.current !== undefined) window.clearTimeout(timer.current);
    if (next && next !== value) onCommit(next);
  };

  return (
    <label className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      {label && (
        <span className="text-caption font-semibold text-slate-500 dark:text-slate-400">
          {label}
        </span>
      )}
      <input
        type={kind}
        value={local}
        onFocus={() => {
          focused.current = true;
        }}
        onChange={(e) => {
          const next = e.target.value;
          setLocal(next);
          // Native pickers fire change continuously while spinning. Settle
          // first, so one edit is one write and one reschedule.
          if (timer.current !== undefined) window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => commit(next), commitDelayMs);
        }}
        onBlur={(e) => {
          focused.current = false;
          commit(e.target.value);
          setLocal(e.target.value || value);
        }}
        // h-12 is the point of this component, not decoration: 48px clears
        // Android's minimum and Apple's, on every screen that uses it.
        className={`w-full min-w-0 rounded-xl border border-slate-200 bg-white/60 tabular-nums text-slate-900 outline-none transition-colors focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/25 dark:border-white/10 dark:bg-slate-900/40 dark:text-white ${
          size === "lg"
            ? "h-16 px-4 text-3xl font-semibold tracking-tight"
            : "h-12 px-3 text-body"
        }`}
      />
      {hint && (
        <span className="text-caption text-slate-500 dark:text-slate-400">
          {hint}
        </span>
      )}
    </label>
  );
}

export function TimeField(props: Omit<Parameters<typeof Field>[0], "kind">) {
  return <Field {...props} kind="time" />;
}

export function DateField(props: Omit<Parameters<typeof Field>[0], "kind">) {
  return <Field {...props} kind="date" />;
}
