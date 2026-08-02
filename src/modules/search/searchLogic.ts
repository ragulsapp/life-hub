import type { Goal, Habit, Note, Transaction } from "../../db/db";

export type SearchResultKind = "note" | "goal" | "habit" | "transaction";

export interface SearchResult {
  kind: SearchResultKind;
  id: number;
  title: string;
  subtitle?: string;
  /** Which bottom-nav tab this result lives on. */
  tab: "notes" | "goals" | "habits" | "finance";
}

const includes = (haystack: string, q: string) => haystack.toLowerCase().includes(q);

/**
 * Client-side filter across notes/goals/habits/transactions — genuinely fast
 * and fully offline at this app's actual data volume (hundreds of rows, not
 * thousands), so no index/worker is needed.
 */
export function searchAll(
  query: string,
  data: {
    notes: Note[];
    goals: Goal[];
    habits: Habit[];
    transactions: Transaction[];
  },
): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: SearchResult[] = [];

  for (const n of data.notes) {
    if (
      includes(n.title, q) ||
      includes(n.body, q) ||
      n.tags.some((t) => includes(t, q))
    ) {
      results.push({
        kind: "note",
        id: n.id,
        title: n.title || "Untitled note",
        subtitle: n.body.slice(0, 60),
        tab: "notes",
      });
    }
  }

  for (const g of data.goals) {
    if (includes(g.title, q)) {
      results.push({ kind: "goal", id: g.id, title: g.title, tab: "goals" });
    }
  }

  for (const h of data.habits) {
    if (includes(h.name, q)) {
      results.push({ kind: "habit", id: h.id, title: h.name, tab: "habits" });
    }
  }

  for (const t of data.transactions) {
    if (includes(t.category, q) || (t.note !== undefined && includes(t.note, q))) {
      results.push({
        kind: "transaction",
        id: t.id,
        title: t.category,
        subtitle: t.note,
        tab: "finance",
      });
    }
  }

  return results;
}
