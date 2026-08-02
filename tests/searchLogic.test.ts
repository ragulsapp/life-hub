import { describe, it, expect } from "vitest";
import type { Goal, Habit, Note, Transaction } from "../src/db/db";
import { searchAll } from "../src/modules/search/searchLogic";

const note = (title: string, body = "", tags: string[] = []): Note =>
  ({ id: 1, title, body, tags, pinned: false, createdAt: 0 }) as Note;
const goal = (title: string): Goal => ({ id: 2, title, status: "active" }) as Goal;
const habit = (name: string): Habit =>
  ({
    id: 3,
    name,
    color: "#fff",
    icon: "🎯",
    schedule: { type: "daily" },
    archived: false,
    createdAt: 0,
  }) as Habit;
const txn = (category: string, note?: string): Transaction =>
  ({ id: 4, date: "2026-07-01", type: "expense", amount: 100, category, note }) as Transaction;

const empty = { notes: [], goals: [], habits: [], transactions: [] };

describe("searchAll", () => {
  it("returns nothing for an empty or whitespace-only query", () => {
    expect(searchAll("", { ...empty, notes: [note("Groceries")] })).toEqual([]);
    expect(searchAll("   ", { ...empty, notes: [note("Groceries")] })).toEqual([]);
  });

  it("matches notes by title, body, or tag, case-insensitively", () => {
    const data = { ...empty, notes: [note("Trip Plan", "Book flights", ["Travel"])] };
    expect(searchAll("trip", data)).toHaveLength(1);
    expect(searchAll("FLIGHTS", data)).toHaveLength(1);
    expect(searchAll("travel", data)).toHaveLength(1);
    expect(searchAll("nothing", data)).toHaveLength(0);
  });

  it("gives an untitled note a fallback title rather than an empty string", () => {
    const data = { ...empty, notes: [note("", "some private thought")] };
    const [result] = searchAll("private", data);
    expect(result.title).toBe("Untitled note");
  });

  it("matches goals by title only", () => {
    const data = { ...empty, goals: [goal("Run a marathon")] };
    expect(searchAll("marathon", data)).toHaveLength(1);
  });

  it("matches habits by name only", () => {
    const data = { ...empty, habits: [habit("Meditate")] };
    expect(searchAll("medit", data)).toHaveLength(1);
  });

  it("matches transactions by category or note", () => {
    const data = { ...empty, transactions: [txn("Groceries", "Weekly shop")] };
    expect(searchAll("groceries", data)).toHaveLength(1);
    expect(searchAll("weekly", data)).toHaveLength(1);
  });

  it("does not throw when a transaction has no note", () => {
    const data = { ...empty, transactions: [txn("Rent")] };
    expect(() => searchAll("rent", data)).not.toThrow();
    expect(searchAll("rent", data)).toHaveLength(1);
  });

  it("tags each result with the correct kind and destination tab", () => {
    const data = {
      notes: [note("A note")],
      goals: [goal("A goal")],
      habits: [habit("A habit")],
      transactions: [txn("A transaction")],
    };
    const results = searchAll("a", data);
    const byKind = Object.fromEntries(results.map((r) => [r.kind, r.tab]));
    expect(byKind).toEqual({
      note: "notes",
      goal: "goals",
      habit: "habits",
      transaction: "finance",
    });
  });

  it("searches across all four sources at once", () => {
    const data = {
      notes: [note("Budget note")],
      goals: [goal("Budget goal")],
      habits: [habit("Budget habit")],
      transactions: [txn("Budget category")],
    };
    expect(searchAll("budget", data)).toHaveLength(4);
  });
});
