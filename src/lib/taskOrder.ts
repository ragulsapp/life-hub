import type { Task } from "../db/db";

/**
 * Tasks with an explicit `order` (set by drag-reordering, e.g. in Plan
 * Tomorrow) sort by it; everything else falls back to newest-first — the
 * existing TaskList convention — so existing tasks are unaffected until the
 * user actually reorders something.
 */
export function sortByOrder(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.order != null && b.order != null) return a.order - b.order;
    if (a.order != null) return -1;
    if (b.order != null) return 1;
    return b.createdAt - a.createdAt;
  });
}
