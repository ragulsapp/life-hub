import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { motion } from "framer-motion";
import { db } from "../../db/db";
import { inputClass } from "../../components/inputStyles";
import { searchAll, type SearchResult } from "./searchLogic";

const KIND_ICON: Record<SearchResult["kind"], string> = {
  note: "📝",
  goal: "🏆",
  habit: "🎯",
  transaction: "💸",
};

export function SearchPanel({
  onClose,
  onNavigate,
}: {
  onClose: () => void;
  onNavigate: (tab: SearchResult["tab"]) => void;
}) {
  const [query, setQuery] = useState("");
  const notes = useLiveQuery(() => db.notes.toArray(), []) ?? [];
  const goals = useLiveQuery(() => db.goals.toArray(), []) ?? [];
  const habits = useLiveQuery(() => db.habits.toArray(), []) ?? [];
  const transactions = useLiveQuery(() => db.transactions.toArray(), []) ?? [];

  const results = searchAll(query, { notes, goals, habits, transactions });

  const openResult = (r: SearchResult) => {
    onNavigate(r.tab);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-40 overflow-y-auto bg-slate-50 dark:bg-slate-900"
    >
      <div
        className="mx-auto flex max-w-md flex-col gap-4 p-4"
        style={{
          paddingTop: "calc(var(--sat) + 1rem)",
          paddingBottom: "calc(var(--sab) + 2rem)",
        }}
      >
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes, goals, habits, transactions..."
            className={`flex-1 ${inputClass}`}
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            aria-label="Close search"
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:bg-slate-700/60"
          >
            ✕
          </motion.button>
        </div>

        {query.trim() === "" ? (
          <p className="px-1 text-sm text-slate-400">
            Search across everything — offline, on this device.
          </p>
        ) : results.length === 0 ? (
          <p className="px-1 text-sm text-slate-400">No matches for "{query}".</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {results.map((r) => (
              <li key={`${r.kind}-${r.id}`}>
                <button
                  onClick={() => openResult(r)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-white/70 p-3 text-left dark:bg-slate-800/60"
                >
                  <span className="text-lg">{KIND_ICON[r.kind]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">
                      {r.title}
                    </span>
                    {r.subtitle && (
                      <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                        {r.subtitle}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  );
}
