import { useLiveQuery } from "dexie-react-hooks";
import { motion } from "framer-motion";
import { db, PRACTICES } from "../../db/db";
import { toast } from "../../lib/toast";
import { createHabitFromTemplate } from "../habits/habitActions";

/**
 * A shelf of practices to pick from — the app suggests, the user chooses.
 * Nothing here is enabled by default and nothing is prescribed.
 *
 * Picking one creates an ordinary habit, so it immediately gets streaks,
 * reminders and pillar scoring rather than living in a parallel system.
 */
export function PracticesShelf() {
  const habits = useLiveQuery(() => db.habits.toArray(), []) ?? [];

  // Case-insensitive, because Dexie's unique &name index is case-sensitive
  // and a manually-added "exercise" must still read as already-added.
  const activeNames = new Set(
    habits.filter((h) => !h.archived).map((h) => h.name.trim().toLowerCase()),
  );

  const add = async (name: string) => {
    const tpl = PRACTICES.find((p) => p.name === name);
    if (!tpl) return;
    const result = await createHabitFromTemplate(tpl);
    if (result === "created") toast(`${tpl.name} added to your habits.`);
    else if (result === "restored") toast(`${tpl.name} is back in your habits.`);
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Pick what fits your life — nothing here is switched on for you.
      </p>
      {PRACTICES.map((p) => {
        const added = activeNames.has(p.name.trim().toLowerCase());
        return (
          <div
            key={p.name}
            className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-700/40"
          >
            <span
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-lg"
              style={{ backgroundColor: p.color + "22" }}
            >
              {p.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                {p.name}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {p.blurb}
              </div>
            </div>
            {added ? (
              <span className="flex-shrink-0 text-xs font-semibold text-emerald-500">
                Added ✓
              </span>
            ) : (
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={() => add(p.name)}
                aria-label={`Add ${p.name} to your habits`}
                className="flex-shrink-0 rounded-full bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Add
              </motion.button>
            )}
          </div>
        );
      })}
    </div>
  );
}
