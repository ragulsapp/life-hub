/**
 * What a list says when it has nothing in it.
 *
 * These were one-liners in body grey — "No habits yet — add one above.",
 * "No goals yet.", "No transactions yet." Three problems: they read as a
 * failure rather than a starting point, they looked like stray text rather
 * than designed space, and now that creation lives behind the + button,
 * "above" is simply wrong.
 *
 * The icon is drawn faint on purpose. An empty list should feel like room
 * to fill, not like something is broken.
 */
export function EmptyState({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  /** One line. If it needs two, the screen is doing too much. */
  hint: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <span className="text-slate-300 dark:text-slate-600">{icon}</span>
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {title}
      </span>
      <span className="max-w-[26ch] text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        {hint}
      </span>
    </div>
  );
}
