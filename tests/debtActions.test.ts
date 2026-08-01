// fake-indexeddb must load before Dexie touches indexedDB.
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../src/db/db";
import { addDebt, deleteDebt, recordDebtPayment, updateDebt } from "../src/modules/finance/debtActions";

beforeEach(async () => {
  await db.debts.clear();
  await db.transactions.clear();
});

describe("addDebt", () => {
  it("starts a debt at zero paid, unsettled", async () => {
    await addDebt({ type: "loan", name: "Car loan", amount: 5000 });
    const [row] = await db.debts.toArray();
    expect(row).toMatchObject({ type: "loan", name: "Car loan", amount: 5000, paidAmount: 0 });
    expect(row.settledAt).toBeUndefined();
  });
});

describe("recordDebtPayment", () => {
  it("increments paidAmount and writes a linked expense for a liability type", async () => {
    await addDebt({ type: "loan", name: "Car loan", amount: 5000 });
    const [debt] = await db.debts.toArray();

    await recordDebtPayment(debt.id, 2000);

    const updated = await db.debts.get(debt.id);
    expect(updated?.paidAmount).toBe(2000);
    expect(updated?.settledAt).toBeUndefined();

    const txns = await db.transactions.toArray();
    expect(txns).toHaveLength(1);
    expect(txns[0]).toMatchObject({ type: "expense", amount: 2000, note: "Car loan" });
  });

  it("writes a linked income transaction for a 'lent' debt being repaid", async () => {
    await addDebt({ type: "lent", name: "Loaned to Priya", amount: 1000 });
    const [debt] = await db.debts.toArray();

    await recordDebtPayment(debt.id, 1000);

    const txns = await db.transactions.toArray();
    expect(txns[0].type).toBe("income");
  });

  it("marks the debt settled once fully paid", async () => {
    await addDebt({ type: "borrowed", name: "From Dad", amount: 500 });
    const [debt] = await db.debts.toArray();

    await recordDebtPayment(debt.id, 500);

    const updated = await db.debts.get(debt.id);
    expect(updated?.settledAt).toBeDefined();
  });

  it("ignores non-positive or non-finite amounts without writing anything", async () => {
    await addDebt({ type: "loan", name: "X", amount: 100 });
    const [debt] = await db.debts.toArray();

    await recordDebtPayment(debt.id, 0);
    await recordDebtPayment(debt.id, -50);
    await recordDebtPayment(debt.id, NaN);

    expect((await db.debts.get(debt.id))?.paidAmount).toBe(0);
    expect(await db.transactions.count()).toBe(0);
  });

  it("accumulates across multiple payments", async () => {
    await addDebt({ type: "emi", name: "Bike EMI", amount: 900 });
    const [debt] = await db.debts.toArray();

    await recordDebtPayment(debt.id, 300);
    await recordDebtPayment(debt.id, 300);
    await recordDebtPayment(debt.id, 300);

    const updated = await db.debts.get(debt.id);
    expect(updated?.paidAmount).toBe(900);
    expect(updated?.settledAt).toBeDefined();
    expect(await db.transactions.count()).toBe(3);
  });
});

describe("updateDebt / deleteDebt", () => {
  it("patches only the given fields", async () => {
    await addDebt({ type: "loan", name: "Old name", amount: 100 });
    const [debt] = await db.debts.toArray();

    await updateDebt(debt.id, { name: "New name" });

    const updated = await db.debts.get(debt.id);
    expect(updated?.name).toBe("New name");
    expect(updated?.amount).toBe(100);
  });

  it("removes the debt", async () => {
    await addDebt({ type: "loan", name: "Gone", amount: 100 });
    const [debt] = await db.debts.toArray();

    await deleteDebt(debt.id);

    expect(await db.debts.count()).toBe(0);
  });
});
