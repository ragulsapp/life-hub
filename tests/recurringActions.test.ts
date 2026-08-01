// fake-indexeddb must load before Dexie touches indexedDB.
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../src/db/db";
import {
  addRecurringTransaction,
  confirmRecurringTransaction,
  deleteRecurringTransaction,
  updateRecurringTransaction,
} from "../src/modules/finance/recurringActions";

beforeEach(async () => {
  await db.recurringTransactions.clear();
  await db.transactions.clear();
});

describe("addRecurringTransaction", () => {
  it("starts active with no generatedMonth", async () => {
    await addRecurringTransaction({
      type: "expense",
      category: "Rent",
      amount: 15000,
      dayOfMonth: 1,
    });
    const [row] = await db.recurringTransactions.toArray();
    expect(row).toMatchObject({ category: "Rent", amount: 15000, active: true });
    expect(row.generatedMonth).toBeUndefined();
  });
});

describe("confirmRecurringTransaction", () => {
  it("writes a linked transaction and stamps generatedMonth for this month", async () => {
    await addRecurringTransaction({
      type: "expense",
      category: "Rent",
      amount: 15000,
      dayOfMonth: 1,
    });
    const [r] = await db.recurringTransactions.toArray();

    await confirmRecurringTransaction(r.id, new Date(2026, 6, 15));

    const updated = await db.recurringTransactions.get(r.id);
    expect(updated?.generatedMonth).toBe("2026-07");

    const txns = await db.transactions.toArray();
    expect(txns).toHaveLength(1);
    expect(txns[0]).toMatchObject({ type: "expense", amount: 15000, category: "Rent" });
  });

  it("is idempotent — a second confirm this month writes nothing further", async () => {
    await addRecurringTransaction({
      type: "income",
      category: "Salary",
      amount: 50000,
      dayOfMonth: 1,
    });
    const [r] = await db.recurringTransactions.toArray();

    await confirmRecurringTransaction(r.id, new Date(2026, 6, 15));
    await confirmRecurringTransaction(r.id, new Date(2026, 6, 15)); // replayed tap / double-click

    expect(await db.transactions.count()).toBe(1);
  });

  it("re-fires the following month once generatedMonth no longer matches", async () => {
    await addRecurringTransaction({
      type: "expense",
      category: "Rent",
      amount: 15000,
      dayOfMonth: 1,
    });
    const [r] = await db.recurringTransactions.toArray();
    await confirmRecurringTransaction(r.id, new Date(2026, 6, 15));
    await confirmRecurringTransaction(r.id, new Date(2026, 7, 2));

    expect(await db.transactions.count()).toBe(2);
    expect((await db.recurringTransactions.get(r.id))?.generatedMonth).toBe("2026-08");
  });

  it("does nothing if the recurring transaction was deleted", async () => {
    await confirmRecurringTransaction(999);
    expect(await db.transactions.count()).toBe(0);
  });
});

describe("updateRecurringTransaction / deleteRecurringTransaction", () => {
  it("patches only the given fields", async () => {
    await addRecurringTransaction({
      type: "expense",
      category: "Old",
      amount: 100,
      dayOfMonth: 1,
    });
    const [r] = await db.recurringTransactions.toArray();

    await updateRecurringTransaction(r.id, { active: false });

    const updated = await db.recurringTransactions.get(r.id);
    expect(updated?.active).toBe(false);
    expect(updated?.category).toBe("Old");
  });

  it("removes the row", async () => {
    await addRecurringTransaction({
      type: "expense",
      category: "Gone",
      amount: 100,
      dayOfMonth: 1,
    });
    const [r] = await db.recurringTransactions.toArray();

    await deleteRecurringTransaction(r.id);

    expect(await db.recurringTransactions.count()).toBe(0);
  });
});
