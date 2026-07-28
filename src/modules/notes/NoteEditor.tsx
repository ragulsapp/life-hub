import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import { Button } from "../../components/Button";
import { inputClass } from "../../components/inputStyles";

export function NoteEditor() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [pinned, setPinned] = useState(false);
  const [sensitive, setSensitive] = useState(false);

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
      setTagDraft("");
      return;
    }
    setTags((prev) => [...prev, tag]);
    setTagDraft("");
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
    setTitle("");
    setBody("");
    setTags([]);
    setTagDraft("");
    setPinned(false);
    setSensitive(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className={`font-medium ${inputClass}`}
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
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
            ⚠️ Marked sensitive — review before sharing.
          </motion.div>
        )}
      </AnimatePresence>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <motion.button
              key={tag}
              whileTap={{ scale: 0.94 }}
              onClick={() => setTags((p) => p.filter((t) => t !== tag))}
              aria-label={`Remove tag ${tag}`}
              className="rounded-full bg-cyan-500 px-3 py-1 text-xs font-medium text-slate-900"
            >
              {tag} ✕
            </motion.button>
          ))}
        </div>
      )}

      <input
        value={tagDraft}
        onChange={(e) => {
          const v = e.target.value;
          if (v.endsWith(",")) addTag(v);
          else setTagDraft(v);
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
              className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 dark:bg-slate-700/60 dark:text-slate-300"
            >
              + {tag}
            </button>
          ))}
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <input
          type="checkbox"
          checked={pinned}
          onChange={(e) => setPinned(e.target.checked)}
          className="accent-cyan-500"
        />
        Pin this note
      </label>

      <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <input
          type="checkbox"
          checked={sensitive}
          onChange={(e) => setSensitive(e.target.checked)}
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
