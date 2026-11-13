// fake-indexeddb must load before Dexie touches indexedDB.
import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { exportOutcomeMessage } from "../src/lib/backup";

/**
 * Export used to be reported by whichever screen called it, in its own
 * words — and the home-screen nudge ignored the result entirely, announcing
 * "Backup downloaded" even when the user dismissed the share sheet and no
 * file existed anywhere. On the one feature standing between the user and
 * losing everything, the message has to match what actually happened.
 */
describe("exportOutcomeMessage", () => {
  it("never claims a backup was made when the share sheet was dismissed", () => {
    const msg = exportOutcomeMessage("cancelled");
    expect(msg).toMatch(/not saved/i);
    expect(msg).not.toMatch(/downloaded|saved —|backed up/i);
  });

  it("says saved when the file went through the share sheet", () => {
    expect(exportOutcomeMessage("shared")).toMatch(/^Backup saved/);
  });

  it("says downloaded when the browser downloaded it", () => {
    expect(exportOutcomeMessage("downloaded")).toMatch(/^Backup downloaded/);
  });
});
