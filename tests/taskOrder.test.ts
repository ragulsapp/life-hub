import { describe, it, expect } from "vitest";
import type { Task } from "../src/db/db";
import { sortByOrder } from "../src/lib/taskOrder";

const task = (id: number, createdAt: number, order?: number): Task =>
  ({ id, title: `t${id}`, done: false, createdAt, order }) as Task;

describe("sortByOrder", () => {
  it("sorts entirely by order when every task has one", () => {
    const tasks = [task(1, 1, 2), task(2, 2, 0), task(3, 3, 1)];
    expect(sortByOrder(tasks).map((t) => t.id)).toEqual([2, 3, 1]);
  });

  it("falls back to newest-first createdAt when no task has an order — matches the pre-existing TaskList default", () => {
    const tasks = [task(1, 100), task(2, 300), task(3, 200)];
    expect(sortByOrder(tasks).map((t) => t.id)).toEqual([2, 3, 1]);
  });

  it("puts ordered tasks before unordered ones", () => {
    const tasks = [task(1, 500), task(2, 100, 0)];
    expect(sortByOrder(tasks).map((t) => t.id)).toEqual([2, 1]);
  });

  it("does not mutate the input array", () => {
    const tasks = [task(1, 100), task(2, 200)];
    const copy = [...tasks];
    sortByOrder(tasks);
    expect(tasks).toEqual(copy);
  });
});
