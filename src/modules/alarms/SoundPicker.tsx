import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { BUILT_IN_SOUNDS, db, soundUrl, type SoundId } from "../../db/db";
import { previewSound, previewUrl } from "../../lib/alarmSound";

/** Exactly one of these is set; both unset means the generated siren. */
export interface SoundSelection {
  soundId?: number;
  builtInSound?: SoundId;
}

export function SoundPicker({
  value,
  onChange,
}: {
  value: SoundSelection;
  onChange: (next: SoundSelection) => void;
}) {
  const sounds = useLiveQuery(() => db.sounds.toArray(), []) ?? [];
  const fileRef = useRef<HTMLInputElement>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const [playing, setPlaying] = useState<number | string | null>(null);

  const isSiren = value.soundId == null && value.builtInSound == null;

  /** Shared preview lifecycle: stop any current clip, auto-stop after 4s. */
  const playPreview = (key: number | string, start: () => () => void) => {
    stopRef.current?.();
    stopRef.current = null;
    if (playing === key) {
      setPlaying(null);
      return;
    }
    const stop = start();
    stopRef.current = stop;
    setPlaying(key);
    setTimeout(() => {
      setPlaying((p) => {
        if (p !== key) return p;
        stop();
        if (stopRef.current === stop) stopRef.current = null;
        return null;
      });
    }, 4000);
  };

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("audio/")) {
      alert("Please choose an audio file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      alert("Please choose an audio file under 8 MB.");
      return;
    }
    const id = await db.sounds.add({
      name: file.name.replace(/\.[^.]+$/, ""),
      blob: file,
      createdAt: Date.now(),
    } as never);
    onChange({ soundId: id as number });
  };

  const preview = async (id: number) => {
    const s = await db.sounds.get(id);
    if (!s) return;
    // Auto-stop matters here: without it only the icon reset while a long
    // uploaded clip kept playing.
    playPreview(id, () => previewSound(s.blob));
  };

  const removeSound = async (id: number) => {
    await db.sounds.delete(id);
    if (value.soundId === id) onChange({});
  };

  return (
    <div className="flex flex-col gap-2">
      {BUILT_IN_SOUNDS.map((s) => {
        const selected = value.builtInSound === s.id;
        return (
          <div
            key={s.id}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
              selected
                ? "bg-cyan-500 text-slate-900"
                : "bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300"
            }`}
          >
            <button
              onClick={() => onChange({ builtInSound: s.id })}
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
            >
              <span>🔔</span>
              <span className="min-w-0 truncate">
                {s.label}
                <span
                  className={`ml-1.5 text-xs ${selected ? "text-slate-900/60" : "opacity-60"}`}
                >
                  {s.blurb}
                </span>
              </span>
              {selected && <span className="ml-auto">✓</span>}
            </button>
            <button
              onClick={() => playPreview(s.id, () => previewUrl(soundUrl(s.id)))}
              title="Preview"
              aria-label={`${playing === s.id ? "Stop" : "Preview"} ${s.label}`}
              className="px-1 text-base"
            >
              {playing === s.id ? "⏹" : "▶"}
            </button>
          </div>
        );
      })}

      <button
        onClick={() => onChange({})}
        className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          isSiren
            ? "bg-cyan-500 text-slate-900"
            : "bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-300"
        }`}
      >
        <span>📢 Siren (loud, keeps going)</span>
        {isSiren && <span>✓</span>}
      </button>

      {sounds.map((s) => (
        <div
          key={s.id}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
            value.soundId === s.id
              ? "bg-cyan-500 text-slate-900"
              : "bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300"
          }`}
        >
          <button
            onClick={() => onChange({ soundId: s.id })}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            <span>🎵</span>
            <span className="truncate">{s.name}</span>
            {value.soundId === s.id && <span className="ml-auto">✓</span>}
          </button>
          <button
            onClick={() => preview(s.id)}
            title="Preview"
            aria-label={`${playing === s.id ? "Stop" : "Preview"} "${s.name}"`}
            className="px-1 text-base"
          >
            {playing === s.id ? "⏹" : "▶"}
          </button>
          <button
            onClick={() => removeSound(s.id)}
            title="Delete sound"
            aria-label={`Delete sound "${s.name}"`}
            className="px-1 text-xs opacity-60 hover:text-red-500 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}

      <button
        onClick={() => fileRef.current?.click()}
        className="rounded-lg border border-dashed border-slate-300 py-2 text-sm font-medium text-slate-500 hover:border-cyan-400 hover:text-cyan-500 dark:border-slate-600"
      >
        ＋ Upload song / audio
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="audio/*"
        onChange={upload}
        className="hidden"
      />
    </div>
  );
}
