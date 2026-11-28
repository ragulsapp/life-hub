/**
 * Carries out the actions the user approved on the voice confirm card.
 *
 * Each action becomes the same row the app's own form would create, so
 * everything downstream (lists, reports, reminders, backup) treats it the
 * same. Alarms are saved first and then put on Android's schedule through
 * syncReminder, which cannot throw. `unknown` is never acted on.
 */
import { db, DEFAULT_REMINDER_SOUND } from "../../db/db";
import { localDateStr } from "../dates";
import { scheduleAlarm } from "../notify";
import { syncReminder } from "../reminderActions";
import type { VoiceAction } from "./parseCommand";

export interface ApplyResult {
  created: number;
  skipped: number;
}

async function expenseCategory(spoken: string): Promise<string> {
  const cats = await db.financeCategories.where("kind").equals("expense").toArray();
  const match = cats.find((c) => c.name.toLowerCase() === spoken.toLowerCase());
  if (match) return match.name;
  await db.financeCategories.add({ name: spoken, kind: "expense" } as never);
  return spoken;
}

export async function applyVoiceActions(
  actions: VoiceAction[],
  now: Date = new Date(),
): Promise<ApplyResult> {
  let created = 0;
  let skipped = 0;

  for (const a of actions) {
    switch (a.type) {
      case "alarm": {
        const row = {
          label: "",
          time: a.time,
          days: [] as number[],
          onDate: a.date,
          mission: "math" as const,
          difficulty: 2,
          builtInSound: DEFAULT_REMINDER_SOUND,
          enabled: true,
          createdAt: now.getTime(),
        };
        const id = (await db.alarms.add(row as never)) as unknown as number;
        await syncReminder(() => scheduleAlarm({ id, ...row }), { enabling: true });
        created++;
        break;
      }
      case "task":
        await db.tasks.add({
          title: a.title,
          done: false,
          createdAt: now.getTime(),
          ...(a.dueDate ? { dueDate: a.dueDate } : {}),
        } as never);
        created++;
        break;
      case "expense":
        await db.transactions.add({
          date: localDateStr(now),
          type: "expense",
          amount: Math.round(a.amount * 100) / 100,
          category: await expenseCategory(a.category),
        } as never);
        created++;
        break;
      case "note":
        await db.notes.add({
          title: `Voice note — ${now.toLocaleString()}`,
          body: a.text,
          tags: ["voice"],
          pinned: false,
          sensitive: false,
          createdAt: now.getTime(),
        } as never);
        created++;
        break;
      default:
        skipped++;
    }
  }
  return { created, skipped };
}
