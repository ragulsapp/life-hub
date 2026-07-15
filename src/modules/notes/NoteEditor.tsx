import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { db, NOTE_TAGS } from "../../db/db";
import { Button } from "../../components/Button";
import { inputClass } from "../../components/inputStyles";

export function NoteEditor() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [pinned, setPinned] = useState(false);

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const showPrivacyLock = tags.includes("Content-Scripts");

  const save = async () => {
    if (!title.trim() && !body.trim()) return;
    await db.notes.add({
      title: title.trim() || "Untitled Note",
      body,
      tags,
      pinned,
      createdAt: Date.now(),
    } as never);
    setTitle("");
    setBody("");
    setTags([]);
    setPinned(false);
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
        {showPrivacyLock && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden rounded-xl border-2 border-red-400 bg-red-50 p-3 text-sm font-semibold text-red-700 dark:border-red-500/60 dark:bg-red-900/20 dark:text-red-300"
          >
            ⚠️ PRIVACY LOCK: Strip all client names (e.g., Vinoth) and agency
            branding before finalizing this script.
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap gap-2">
        {NOTE_TAGS.map((tag) => (
          <motion.button
            key={tag}
            whileTap={{ scale: 0.94 }}
            onClick={() => toggleTag(tag)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              tags.includes(tag)
                ? "bg-cyan-500 text-slate-900"
                : "bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300"
            }`}
          >
            {tag}
          </motion.button>
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <input
          type="checkbox"
          checked={pinned}
          onChange={(e) => setPinned(e.target.checked)}
          className="accent-cyan-500"
        />
        Pin this note
      </label>

      <Button onClick={save} disabled={!title.trim() && !body.trim()}>
        Save Note
      </Button>
    </div>
  );
}
