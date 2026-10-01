import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { BUILT_IN_SOUNDS, db, soundUrl, type SoundId } from "../../db/db";
import { previewSound, previewUrl } from "../../lib/alarmSound";
import {
  BellIcon, CheckIcon, MusicIcon, PlayIcon, PlusIcon, SirenIcon, StopIcon, TrashIcon,
} from "../../components/Icons";

/** Exactly one of these is set; both unset means the generated siren. */
export interface SoundSelection {
  soundId?: number;
  builtInSound?: SoundId;
}

/**
 * One row shape for every sound — built-in, siren, and uploaded.
 *
 * These were three near-identical blocks that had already drifted: the rows
 * sat at 20-24px with 22px preview buttons, well under the minimum target,
 * and the selected state was a heavy filled bar whose blurb text became
 * unreadable against it. Selection is now a tint and a check, matching how
 * every other choice in the app is shown.
 */
function SoundRow({
  icon,
  name,
  blurb,
  selected,
  onSelect,
  playing,
  onPreview,
  onDelete,
}: {
  icon: React.ReactNode;
  name: string;
  blurb?: string;
  selected: boolean;
  onSelect: () => void;
  playing?: boolean;
  onPreview?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-1 rounded-xl border pl-3 pr-1 transition-colors ${
        selected
          ? "border-cyan-400/50 bg-cyan-500/10"
          : "border-slate-200 hover:border-slate-300 dark:border-white/10 dark:hover:border-white/20"
      }`}
    >
      <button
        onClick={onSelect}
        aria-pressed={selected}
        className="flex h-12 min-w-0 flex-1 items-center gap-2.5 text-left"
      >
        <span
          className={
            selected
              ? "text-cyan-600 dark:text-cyan-300"
              : "text-slate-500 dark:text-slate-400"
          }
        >
          {icon}
        </span>
        <span className="min-w-0 truncate text-sm">
          <span
            className={
              selected
                ? "font-semibold text-cyan-700 dark:text-cyan-200"
                : "text-slate-700 dark:text-slate-200"
            }
          >
            {name}
          </span>
          {blurb && (
            <span className="ml-1.5 text-xs text-slate-500 dark:text-slate-400">
              {blurb}
            </span>
          )}
        </span>
        {selected && (
          <span className="ml-auto text-cyan-600 dark:text-cyan-300">
            <CheckIcon size={15} />
          </span>
        )}
      </button>

      {onPreview && (
        <button
          onClick={onPreview}
          aria-label={`${playing ? "Stop" : "Preview"} ${name}`}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-500/10 dark:text-slate-400"
        >
          {playing ? <StopIcon size={13} /> : <PlayIcon size={13} />}
        </button>
      )}
      {onDelete && (
        <button
          onClick={onDelete}
          aria-label={`Delete sound ${name}`}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-500"
        >
          <TrashIcon size={14} />
        </button>
      )}
    </div>
  );
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
      {BUILT_IN_SOUNDS.map((s) => (
        <SoundRow
          key={s.id}
          icon={<BellIcon size={16} on />}
          name={s.label}
          blurb={s.blurb}
          selected={value.builtInSound === s.id}
          onSelect={() => onChange({ builtInSound: s.id })}
          playing={playing === s.id}
          onPreview={() => playPreview(s.id, () => previewUrl(soundUrl(s.id)))}
        />
      ))}

      <SoundRow
        icon={<SirenIcon size={16} />}
        name="Siren"
        blurb="loud, keeps going"
        selected={isSiren}
        onSelect={() => onChange({})}
      />

      {sounds.map((s) => (
        <SoundRow
          key={s.id}
          icon={<MusicIcon size={16} />}
          name={s.name}
          selected={value.soundId === s.id}
          onSelect={() => onChange({ soundId: s.id })}
          playing={playing === s.id}
          onPreview={() => preview(s.id)}
          onDelete={() => removeSound(s.id)}
        />
      ))}

      <button
        onClick={() => fileRef.current?.click()}
        className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 text-sm font-medium text-slate-500 transition-colors hover:border-cyan-400 hover:text-cyan-500 dark:border-white/15 dark:hover:text-cyan-300"
      >
        <PlusIcon size={14} />
        Upload song / audio
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
