import { describe, expect, it } from "vitest";
import { parseVoiceCommand } from "../src/lib/voice/parseCommand";

/**
 * Inputs are written the way Android speech-to-text hands them over for
 * Tanglish: lowercase-ish, little or no punctuation, spelling that wanders
 * (naalaiku / nalaiku / naliku). Saturday 2026-11-28, 10:00.
 */
const NOW = new Date(2026, 10, 28, 10, 0);
const TODAY = "2026-11-28";
const TOMORROW = "2026-11-29";
const parse = (s: string) => parseVoiceCommand(s, NOW);

describe("alarms", () => {
  it("naliku 8 o clock alarm vechiru", () => {
    expect(parse("naliku 8 o clock alarm vechiru")).toEqual([
      { type: "alarm", time: "08:00", date: TOMORROW },
    ]);
  });

  it.each([
    ["naalaiku kaalaila 6 30 ku alarm", "06:30"],
    ["nalaiku 6:30 am alarm vei", "06:30"],
    ["tomorrow 5 manikku alarm", "05:00"],
    ["naalai kaalai 7 mani ku ezhuppu", "07:00"],
  ])("%s → %s tomorrow", (input, time) => {
    expect(parse(input)).toEqual([{ type: "alarm", time, date: TOMORROW }]);
  });

  it("evening / night words move the hour past noon", () => {
    expect(parse("saayangalam 6 manikku alarm")).toEqual([
      { type: "alarm", time: "18:00", date: TODAY },
    ]);
    expect(parse("night 10 ku alarm")).toEqual([
      { type: "alarm", time: "22:00", date: TODAY },
    ]);
  });

  it("an alarm with no day word is the next time that clock time comes round", () => {
    // 10:00 now, so 8:00 has passed today → tomorrow; 11:00 is still today.
    expect(parse("8 manikku alarm")[0]).toMatchObject({ date: TOMORROW });
    expect(parse("11 manikku alarm")[0]).toMatchObject({ date: TODAY });
  });

  it("an alarm without a time is not guessed", () => {
    expect(parse("naliku alarm vechiru")).toEqual([
      { type: "unknown", text: "naliku alarm vechiru" },
    ]);
  });
});

describe("tasks", () => {
  it("splits a run-on list on Tanglish verb endings", () => {
    expect(
      parse("naliku client ku invoice anuppanum bank ku call pannanum"),
    ).toEqual([
      { type: "task", title: "Client ku invoice anuppanum", dueDate: TOMORROW },
      { type: "task", title: "Bank ku call pannanum", dueDate: TOMORROW },
    ]);
  });

  it("the full example: alarm, then the day's work", () => {
    expect(
      parse(
        "naliku 8 o clock alarm vechiru apram naliku work la presentation ready pannanum amma ku medicine vaanganum",
      ),
    ).toEqual([
      { type: "alarm", time: "08:00", date: TOMORROW },
      { type: "task", title: "Presentation ready pannanum", dueDate: TOMORROW },
      { type: "task", title: "Amma ku medicine vaanganum", dueDate: TOMORROW },
    ]);
  });

  it("a day word carries forward to the tasks after it", () => {
    expect(parse("innaiku gym poganum and evening mail check pannanum")).toEqual([
      { type: "task", title: "Gym poganum", dueDate: TODAY },
      { type: "task", title: "Evening mail check pannanum", dueDate: TODAY },
    ]);
  });

  it("an English 'remind me to' is a task too", () => {
    expect(parse("remind me to pay electricity bill tomorrow")).toEqual([
      { type: "task", title: "Pay electricity bill", dueDate: TOMORROW },
    ]);
  });
});

describe("expenses", () => {
  it.each([
    ["200 rupees saapadu ku selavu", 200, "Food"],
    ["food 150 rs", 150, "Food"],
    ["petrol ku 500 pottaen", 500, "Transport"],
    ["spent 1200 on groceries", 1200, "Groceries"],
    ["auto ku 80 rupees", 80, "Transport"],
  ])("%s", (input, amount, category) => {
    expect(parse(input)).toEqual([{ type: "expense", amount, category }]);
  });

  it("keeps an unknown category word as the category rather than guessing", () => {
    expect(parse("300 rupees haircut")).toEqual([
      { type: "expense", amount: 300, category: "Haircut" },
    ]);
  });
});

describe("notes", () => {
  it("'note' / 'ezhudhi vai' saves the rest as a note", () => {
    expect(parse("note business idea clinic ku whatsapp bot")).toEqual([
      { type: "note", text: "Business idea clinic ku whatsapp bot" },
    ]);
    expect(parse("idha ezhudhi vai shop open time 9 mani")).toEqual([
      { type: "note", text: "Shop open time 9 mani" },
    ]);
  });
});

describe("edge cases speech-to-text produces", () => {
  it("'7 30' with nothing after it is 7:30, not 7:00", () => {
    expect(parse("nalaiku 7 30 alarm")).toEqual([
      { type: "alarm", time: "07:30", date: TOMORROW },
    ]);
  });

  it("thousands with a comma stay one number", () => {
    expect(parse("rent 12,000 rupees")).toEqual([
      { type: "expense", amount: 12000, category: "Rent" },
    ]);
  });

  it("₹ stuck to the number", () => {
    expect(parse("₹50 tea")).toEqual([{ type: "expense", amount: 50, category: "Food" }]);
  });

  it("a number inside a task doesn't turn it into an expense", () => {
    expect(parse("remind me to call amma at 5")).toEqual([
      { type: "task", title: "Call amma at 5" },
    ]);
  });

  it("a note keeps its 'and'", () => {
    expect(parse("note call amma and buy milk")).toEqual([
      { type: "note", text: "Call amma and buy milk" },
    ]);
  });

  it("an impossible time is refused, not wrapped", () => {
    expect(parse("naliku 27 manikku alarm")[0].type).toBe("unknown");
  });
});

describe("safety", () => {
  it("returns nothing for empty speech", () => {
    expect(parse("   ")).toEqual([]);
  });

  it("never invents an action from noise", () => {
    expect(parse("hmm okay")).toEqual([{ type: "unknown", text: "hmm okay" }]);
  });
});
