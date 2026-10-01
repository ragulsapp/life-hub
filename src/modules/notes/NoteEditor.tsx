import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import { Button } from "../../components/Button";
import { inputClass } from "../../components/inputStyles";
import { useDraft } from "../../lib/useDraft";
import { AlertIcon, PlusIcon, XIcon } from "../../components/Icons";

interface NoteDraft {
  title: string;
  body: string;
  tags: string[];
  tagDraft: string;
  pinned: boolean;
  sensitive: boolean;
}

const EMPTY: NoteDraft = {
  title: "",
  body: "",
  tags: [],
  tagDraft: "",
  pinned: false,
  sensitive: false,
};

export function NoteEditor({ onSaved }: { onSaved?: () => void } = {}) {
  // One draft object rather than six pieces of state: switching tabs unmounts
  // this component, and everything typed here has to survive that.
  const [draft, setDraft, clearDraft] = useDraft<NoteDraft>("note", EMPTY);
  const { title, body, tags, tagDraft, pinned, sensitive } = draft;
  const patch = (p: Partial<NoteDraft>) => setDraft((d) => ({ ...d, ...p }));

  const allNotes = useLiveQuery(() => db.notes.toArray(), []) ?? [];

  // The tag vocabulary builds itself from what the user has already used —
  // no fixed list to outgrow.
  const suggestions = useMemo(() => {
    const seen = new Map<string, number>();
    for (const n of allNotes) {
      for (const t of n.tags ?? []) seen.set(t, (seen.get(t) ?? 0) + 1);
    }
    return [...seen.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([t]) => t)
      .filter(
        (t) =>
          !tags.includes(t) &&
          (!tagDraft || t.toLowerCase().includes(tagDraft.toLowerCase())),
      )
      .slice(0, 6);
  }, [allNotes, tags, tagDraft]);

  const addTag = (raw: string) => {
    const tag = raw.trim().replace(/,$/, "");
    if (!tag || tags.includes(tag)) {
      patch({ tagDraft: "" });
      return;
    }
    patch({ tags: [...tags, tag], tagDraft: "" });
  };

  const save = async () => {
    if (!title.trim() && !body.trim()) return;
    await db.notes.add({
      title: title.trim() || "Untitled Note",
      body,
      tags,
      pinned,
      sensitive,
      createdAt: Date.now(),
    } as never);
    // Only after the write lands — clearing first would lose the note if the
    // add threw.
    clearDraft(EMPTY);
    onSaved?.();
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        value={title}
        onChange={(e) => patch({ title: e.target.value })}
        placeholder="Title"
        className={`font-medium ${inputClass}`}
      />
      <textarea
        value={body}
        onChange={(e) => patch({ body: e.target.value })}
        placeholder="Write your note..."
        rows={4}
        className={inputClass}
      />

      <AnimatePresence>
        {sensitive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden rounded-xl border-2 border-amber-400 bg-amber-50 p-3 text-sm font-semibold text-amber-700 dark:border-amber-500/60 dark:bg-amber-900/20 dark:text-amber-300"
          >
            <AlertIcon size={15} className="mr-1 inline-block align-[-2px]" />
            Marked sensitive — review before sharing.
          </motion.div>
        )}
      </AnimatePresence>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <motion.button
              key={tag}
              whileTap={{ scale: 0.94 }}
              onClick={() => patch({ tags: tags.filter((t) => t !== tag) })}
              aria-label={`Remove tag ${tag}`}
              className="inline-flex h-11 items-center gap-1 rounded-full bg-cyan-500 px-3 text-xs font-medium text-white"
            >
              {tag}
              <XIcon size={12} />
            </motion.button>
          ))}
        </div>
      )}

      <input
        value={tagDraft}
        onChange={(e) => {
          const v = e.target.value;
          if (v.endsWith(",")) addTag(v);
          else patch({ tagDraft: v });
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addTag(tagDraft);
          }
        }}
        placeholder="Add a tag, press Enter"
        className={`text-sm ${inputClass}`}
      />

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((tag) => (
            <button
              key={tag}
              onClick={() => addTag(tag)}
              className="inline-flex h-11 items-center gap-1 rounded-full bg-slate-100 px-3.5 text-xs text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-700/60 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <PlusIcon size={11} />
              {tag}
            </button>
          ))}
        </div>
      )}

      <label className="flex min-h-11 items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300">
        <input
          type="checkbox"
          checked={pinned}
          onChange={(e) => patch({ pinned: e.target.checked })}
          className="h-5 w-5 flex-shrink-0 accent-cyan-500"
        />
        Pin this note
      </label>

      <label className="flex min-h-11 items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300">
        <input
          type="checkbox"
          checked={sensitive}
          onChange={(e) => patch({ sensitive: e.target.checked })}
          className="accent-amber-500"
        />
        Mark as sensitive
      </label>

      <Button onClick={save} disabled={!title.trim() && !body.trim()}>
        Save Note
      </Button>
    </div>
  );
}
