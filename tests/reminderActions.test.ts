import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Every reminder toggle and delete used to call Android BEFORE writing to the
 * database. If that call threw, the write never happened: the switch silently
 * stayed off, and a note or habit could not be deleted at all. And the
 * permission request's answer was thrown away, so a reminder could be "on"
 * with notifications blocked and nothing said.
 *
 * syncReminder is the one place that talks to the OS after the user's change
 * is already saved, and turns each failure into something the user can see.
 */

const toasts: { msg: string; kind?: string }[] = [];
let permission: "granted" | "denied" | "default" = "granted";

vi.mock("../src/lib/toast", () => ({
  toast: (msg: string, kind?: string) => toasts.push({ msg, kind }),
}));
vi.mock("../src/lib/notify", async (orig) => {
  const real = await orig<typeof import("../src/lib/notify")>();
  return {
    ...real,
    requestNotificationPermission: vi.fn(async () => permission),
  };
});

const { syncReminder } = await import("../src/lib/reminderActions");

beforeEach(() => {
  toasts.length = 0;
  permission = "granted";
});

describe("syncReminder", () => {
  it("is silent when everything works", async () => {
    const update = vi.fn(async () => {});
    await syncReminder(update, { enabling: true });
    expect(update).toHaveBeenCalledOnce();
    expect(toasts).toEqual([]);
  });

  it("says so when Android refuses the schedule, instead of failing silently", async () => {
    await syncReminder(
      async () => {
        throw new Error("refused");
      },
      { enabling: true },
    );
    expect(toasts).toHaveLength(1);
    expect(toasts[0].kind).toBe("error");
  });

  it("never throws, so the caller's saved change stands", async () => {
    await expect(
      syncReminder(
        async () => {
          throw new Error("refused");
        },
        { enabling: false },
      ),
    ).resolves.toBeUndefined();
  });

  it("warns when notifications are blocked, rather than showing a reminder that can never appear", async () => {
    permission = "denied";
    await syncReminder(async () => {}, { enabling: true });
    expect(toasts.some((t) => /notifications are off/i.test(t.msg))).toBe(true);
  });

  it("does not ask for permission just to turn a reminder off", async () => {
    permission = "denied";
    const notify = await import("../src/lib/notify");
    vi.mocked(notify.requestNotificationPermission).mockClear();
    await syncReminder(async () => {}, { enabling: false });
    expect(notify.requestNotificationPermission).not.toHaveBeenCalled();
    expect(toasts).toEqual([]);
  });
});
