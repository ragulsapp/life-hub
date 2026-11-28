/**
 * Turns one spoken Tanglish sentence into a list of proposed app actions.
 *
 * Runs entirely on the phone: plain rules, no model, no network. The app only
 * does five things (alarm, task, expense, note — and habits later), so the
 * phrases people use for them are few enough to cover with rules, and a
 * rule never sends a word anywhere or costs anything.
 *
 * Nothing here acts. The result is shown as a confirm card; only what the
 * user approves is created. When unsure, a clause comes back as `unknown`
 * rather than a guess — a wrong alarm is worse than no alarm.
 */
import { localDateStr } from "../dates";

export type VoiceAction =
  | { type: "alarm"; time: string; date: string }
  | { type: "task"; title: string; dueDate?: string }
  | { type: "expense"; amount: number; category: string }
  | { type: "note"; text: string }
  | { type: "unknown"; text: string };

const DAY_WORDS: Record<string, number> = {
  innaiku: 0, innaikku: 0, inniku: 0, inniki: 0, inaiku: 0, today: 0, indru: 0,
  naalaiku: 1, naalaikku: 1, nalaiku: 1, nalaikku: 1, naliku: 1, naalai: 1,
  nalai: 1, naalaike: 1, tomorrow: 1,
  naalanniku: 2, nalanniku: 2, naalannaiku: 2,
};

/** Words between clauses: "…alarm vechiru apram …". Dropped. */
const CONNECTORS = new Set(["apram", "apparam", "aprom", "appuram", "aprm", "then", "and", "also"]);

const PM_WORDS = /\b(pm|evening|saayangalam|sayangalam|saayankalam|night|raathiri|rathiri|iravu|madhiyam|mathiyam|afternoon)\b/;
const AM_WORDS = /\b(am|morning|kaalai|kaalaila|kalai|kalaila|kaalaiyila)\b/;
const ALARM_WORDS = /\b(alarm|ezhuppu|ezhupu|wake)\b/;
const NOTE_TRIGGER = /^(?:(?:idha|itha|this)\s+)?(?:note\s+pannu|note\s+panni\s+vai|ezhudhi\s+vai|ezhuthi\s+vai|note|write\s+down)\b\s*/;
const NOTE_INSIDE = /\b(?:idha|itha|this)?\s*(?:ezhudhi|ezhuthi)\s+vai\b\s*/;
const CURRENCY = /\b(rupees|rupee|rs|ruba|roobai|inr)\b|₹/;
const SPEND = /\b(selavu|spent|spend|pottaen|potten|pottan|kuduthen|kuduthaen)\b/;

/** Spoken category word → the app's starter category names. */
const CATEGORY_WORDS: Record<string, string> = {
  food: "Food", saapadu: "Food", sapadu: "Food", saapaadu: "Food", lunch: "Food",
  dinner: "Food", breakfast: "Food", tiffin: "Food", hotel: "Food", tea: "Food",
  coffee: "Food", snacks: "Food",
  petrol: "Transport", diesel: "Transport", fuel: "Transport", auto: "Transport",
  bus: "Transport", train: "Transport", uber: "Transport", ola: "Transport",
  cab: "Transport", taxi: "Transport", metro: "Transport", transport: "Transport",
  groceries: "Groceries", grocery: "Groceries", maligai: "Groceries",
  vegetables: "Groceries", milk: "Groceries", paal: "Groceries",
  shopping: "Shopping", dress: "Shopping", clothes: "Shopping", shoes: "Shopping",
  medicine: "Health", hospital: "Health", doctor: "Health", tablet: "Health",
  pharmacy: "Health", health: "Health",
  rent: "Rent", vaadagai: "Rent",
  recharge: "Subscriptions", netflix: "Subscriptions", subscription: "Subscriptions",
};

/** Words that only carry the sentence, never the category. */
const EXPENSE_FILLER = new Set([
  "ku", "kku", "la", "on", "for", "ah", "a", "the", "i", "naan", "panninen",
  "aachu", "achu", "selavu", "spent", "spend", "pottaen", "potten", "pottan",
  "kuduthen", "kuduthaen", "rupees", "rupee", "rs", "ruba", "roobai", "inr",
]);

const LEADING_FILLER = [
  "remind me to", "remind me", "i have to", "i need to", "need to", "have to",
  "work la", "velai la", "velaila", "work", "velai", "todo", "tasks", "task",
  "enakku", "enaku", "naan", "to",
];

/** Tanglish "must do" verb: pannanum, anuppanum, vaanganum, poganum… */
const isMustVerb = (w: string) =>
  w.length > 4 && /(?:anum|aanum|num)$/.test(w) && !/^(minimum|maximum)$/.test(w);

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/(\d),(?=\d{3}\b)/g, "$1") // 12,000 → 12000
    .replace(/o['’]?\s?clock/g, "oclock")
    .replace(/(\d)(am|pm|rs)\b/g, "$1 $2")
    .replace(/₹\s*/g, "₹ ")
    .replace(/[^\w\s:.₹]/g, " ")
    .replace(/\.(?!\d)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function addDays(now: Date, n: number): string {
  const d = new Date(now);
  d.setDate(d.getDate() + n);
  return localDateStr(d);
}

function dayOffsetIn(words: string[]): number | null {
  for (const w of words) if (w in DAY_WORDS) return DAY_WORDS[w];
  return null;
}

/** Hour and minute from an alarm clause, or null when no time was said. */
function timeIn(clause: string): { h: number; m: number } | null {
  const hm =
    clause.match(/\b(\d{1,2})[:.](\d{2})\b/) ??
    clause.match(/\b(\d{1,2}) ([0-5]\d)\b/); // "7 30" — speech drops the colon
  let h: number;
  let m = 0;
  if (hm) {
    h = Number(hm[1]);
    m = Number(hm[2]);
  } else {
    const single =
      clause.match(/\b(\d{1,2}) ?(?:oclock|manikku|mani|am|pm|ku)\b/) ??
      clause.match(/\b(\d{1,2})\b/);
    if (!single) return null;
    h = Number(single[1]);
  }
  if (h > 23 || m > 59) return null;
  if (PM_WORDS.test(clause) && h < 12) h += 12;
  else if (AM_WORDS.test(clause) && h === 12) h = 0;
  return { h, m };
}

function stripLeading(words: string[]): string[] {
  let out = words;
  for (let changed = true; changed && out.length; ) {
    changed = false;
    const joined = out.join(" ");
    for (const f of LEADING_FILLER) {
      if (joined === f || joined.startsWith(f + " ")) {
        out = out.slice(f.split(" ").length);
        changed = true;
        break;
      }
    }
  }
  return out;
}

/** Split on connector words, then after each "must do" verb. */
function clausesOf(words: string[]): string[][] {
  const clauses: string[][] = [];
  let cur: string[] = [];
  const flush = () => {
    if (cur.length) clauses.push(cur);
    cur = [];
  };
  for (const w of words) {
    if (CONNECTORS.has(w)) {
      flush();
      continue;
    }
    cur.push(w);
    if (isMustVerb(w)) flush();
  }
  flush();
  return clauses;
}

export function parseVoiceCommand(text: string, now = new Date()): VoiceAction[] {
  const norm = normalize(text);
  if (!norm) return [];

  // A note swallows everything after its trigger, connectors included —
  // "note: call amma and buy milk" is one note, not a note and a task.
  const startNote = norm.match(NOTE_TRIGGER);
  if (startNote) {
    const body = norm.slice(startNote[0].length).trim();
    return body ? [{ type: "note", text: cap(body) }] : [];
  }
  const inNote = norm.match(NOTE_INSIDE);
  if (inNote && inNote.index !== undefined && inNote.index < 12) {
    const body = (norm.slice(0, inNote.index) + " " + norm.slice(inNote.index + inNote[0].length)).trim();
    return body ? [{ type: "note", text: cap(body.replace(/^(idha|itha|this)\s+/, "")) }] : [];
  }

  const actions: VoiceAction[] = [];
  let dayContext: number | null = null;

  for (const clauseWords of clausesOf(norm.split(" "))) {
    const clause = clauseWords.join(" ");
    const said = dayOffsetIn(clauseWords);
    if (said !== null) dayContext = said;
    const content = clauseWords.filter((w) => !(w in DAY_WORDS));

    if (ALARM_WORDS.test(clause)) {
      const t = timeIn(content.join(" "));
      if (!t) {
        actions.push({ type: "unknown", text: clause });
        continue;
      }
      const time = `${String(t.h).padStart(2, "0")}:${String(t.m).padStart(2, "0")}`;
      let offset = said ?? dayContext;
      if (offset === null) {
        const passed = t.h * 60 + t.m <= now.getHours() * 60 + now.getMinutes();
        offset = passed ? 1 : 0;
      }
      actions.push({ type: "alarm", time, date: addDays(now, offset) });
      continue;
    }

    const amount = content.join(" ").match(/(?:₹ )?\b(\d+(?:\.\d+)?)\b/);
    const categoryWord = content.find((w) => w in CATEGORY_WORDS);
    if (amount && (CURRENCY.test(clause) || SPEND.test(clause) || categoryWord)) {
      let category = categoryWord ? CATEGORY_WORDS[categoryWord] : "";
      if (!category) {
        const rest = content.filter(
          (w) => !EXPENSE_FILLER.has(w) && w !== "₹" && !/^\d/.test(w),
        );
        category = rest.map(cap).join(" ") || "Other";
      }
      actions.push({ type: "expense", amount: Number(amount[1]), category });
      continue;
    }

    const isRemind = /^(?:\w+ )?remind me\b/.test(clause);
    if (isRemind || content.some(isMustVerb)) {
      const title = stripLeading(content).join(" ");
      if (title) {
        actions.push({
          type: "task",
          title: cap(title),
          ...(dayContext !== null ? { dueDate: addDays(now, dayContext) } : {}),
        });
        continue;
      }
    }

    actions.push({ type: "unknown", text: clause });
  }

  return actions;
}
