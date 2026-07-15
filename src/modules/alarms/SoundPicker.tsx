import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import { previewSound } from "../../lib/alarmSound";

export function SoundPicker({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange: (soundId: number | undefined) => void;
}) {
  const sounds = useLiveQuery(() => db.sounds.toArray(), []) ?? [];
  const fileRef = useRef<HTMLInputElement>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const [playing, setPlaying] = useState<number | null>(null);

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
    onChange(id as number);
  };

  const preview = async (id: number) => {
    stopRef.current?.();
    if (playing === id) {
      setPlaying(null);
      return;
    }
    const s = await db.sounds.get(id);
    if (!s) return;
    stopRef.current = previewSound(s.blob);
    setPlaying(id);
    setTimeout(() => setPlaying((p) => (p === id ? null : p)), 4000);
  };

  const removeSound = async (id: number) => {
    await db.sounds.delete(id);
    if (value === id) onChange(undefined);
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => onChange(undefined)}
        className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          value === undefined
            ? "bg-cyan-500 text-slate-900"
            : "bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-300"
        }`}
      >
        <span>🔔 Default siren</span>
        {value === undefined && <span>✓</span>}
      </button>

      {sounds.map((s) => (
        <div
          key={s.id}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
            value === s.id
              ? "bg-cyan-500 text-slate-900"
              : "bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300"
          }`}
        >
          <button
            onClick={() => onChange(s.id)}
            className="flex flex-1 items-center gap-2 text-left"
          >
            <span>🎵</span>
            <span className="truncate">{s.name}</span>
            {value === s.id && <span className="ml-auto">✓</span>}
          </button>
          <button
            onClick={() => preview(s.id)}
            title="Preview"
            className="px-1 text-base"
          >
            {playing === s.id ? "⏹" : "▶"}
          </button>
          <button
            onClick={() => removeSound(s.id)}
            title="Delete sound"
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
