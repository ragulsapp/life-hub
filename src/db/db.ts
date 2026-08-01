import Dexie, { type EntityTable } from "dexie";

export type HealthMetricType =
  | "weight"
  | "energy-level"
  | "water-ml"
  | "sleep-hours";

/**
 * Metrics the user works *toward* over time (start → target, once). Recurring
 * daily targets (water, sleep) are deliberately excluded: their targets are
 * derived from the body profile in `bodyMetrics.ts`, and letting them into
 * `metricGoals` would create a second, silently diverging source of truth.
 */
export type TrajectoryMetricType = "weight" | "energy-level";

/**
 * How multiple same-day rows for a metric collapse into one daily value.
 * "sum" accumulates through the day (each glass of water is its own row);
 * "latest" means the most recent reading wins. Consumed exclusively via
 * `dailyValues()` in `src/lib/healthMetrics.ts` — never re-implement it.
 */
export const METRIC_AGGREGATION: Record<HealthMetricType, "sum" | "latest"> = {
  "water-ml": "sum",
  weight: "latest",
  "energy-level": "latest",
  "sleep-hours": "latest",
};

export interface HealthMetric {
  id: number;
  date: string; // YYYY-MM-DD
  metricType: HealthMetricType;
  value: number; // booleans stored as 1/0
  note?: string;
}

/**
 * The user's body basics, so the app can compute personal targets instead of
 * showing arbitrary ones. Weight deliberately lives in `healthMetrics` (it
 * changes over time and needs a trend) — not here.
 */
export interface BodyProfile {
  /** Age is DERIVED from this — storing age itself would silently rot yearly. */
  birthYear?: number;
  /**
   * Optional, and deliberately month only — no day, so this still isn't a
   * full birthdate. Without it, age is a plain year subtraction that's wrong
   * for most of the year (it assumes the birthday already happened). With
   * it, age is exact except within the birth month itself.
   */
  birthMonth?: number; // 1-12
  heightCm?: number;
  /** Optional: only affects the BMR estimate. "unspecified" shows a range. */
  sex?: "male" | "female" | "unspecified";
  activityLevel?: "sedentary" | "light" | "moderate" | "active" | "very-active";
  /**
   * Which published BMI reference range to interpret weight against.
   * "asia-pacific" uses the lower WHO/ICMR cutoffs. Presented as the user's
   * own choice of reference — deliberately NOT inferred from ethnicity.
   */
  bmiReference?: "standard" | "asia-pacific";
  waterTargetMlOverride?: number;
  sleepTargetHoursOverride?: number;
}

/** Wellness practices offered as a shelf — the user picks what fits their life. */
export const PRACTICES: {
  name: string;
  icon: string;
  color: string;
  identity: string;
  blurb: string;
}[] = [
  {
    name: "Exercise",
    icon: "💪",
    color: "#fb7185",
    identity: "Athlete",
    blurb: "Any movement that raises your heart rate",
  },
  {
    name: "Yoga",
    icon: "🧘",
    color: "#a78bfa",
    identity: "Healthy Person",
    blurb: "Flexibility, balance and breath",
  },
  {
    name: "Meditation",
    icon: "🕉️",
    color: "#60a5fa",
    identity: "Healthy Person",
    blurb: "A few quiet minutes for your mind",
  },
  {
    name: "Home-cooked Meals",
    icon: "🥗",
    color: "#34d399",
    identity: "Healthy Person",
    blurb: "Eat what you prepared yourself",
  },
  {
    name: "No Sugar",
    icon: "🚫",
    color: "#f59e0b",
    identity: "Healthy Person",
    blurb: "Skip added sugar for the day",
  },
];

export interface HabitLog {
  id: number;
  date: string; // YYYY-MM-DD
  habitName: string;
  completed: boolean;
}

/** How often a habit is expected. */
export type HabitSchedule =
  | { type: "daily" }
  | { type: "weekdays"; days: number[] } // 0=Sun .. 6=Sat
  | { type: "times-per-week"; target: number };

export interface Habit {
  id: number;
  name: string;
  color: string; // hex
  icon: string; // emoji
  schedule: HabitSchedule;
  /** Identity this habit builds (see IDENTITIES) — also drives pillar scoring. */
  category?: string;
  archived: boolean;
  createdAt: number;
  /** Shown as a one-tap quick-toggle on the Dashboard (max 2, enforced in UI). */
  pinned?: boolean;
  reminderEnabled?: boolean;
  reminderTime?: string; // HH:MM
  lastReminderDate?: string; // YYYY-MM-DD, prevents same-day double fire
}

export interface Task {
  id: number;
  title: string;
  done: boolean;
  createdAt: number;
  /**
   * When it was actually finished. `done` alone is a boolean with no time, so
   * "how much did I get through this week" was previously underivable.
   * Cleared when a task is un-ticked. Not backfilled — see Goal.createdAt.
   */
  completedAt?: number;
  dueDate?: string; // YYYY-MM-DD
  reminderEnabled?: boolean;
  reminderTime?: string; // HH:MM
  lastReminderDate?: string;
}

export type AlarmMission = "math" | "memory";

export interface Alarm {
  id: number;
  label: string;
  time: string; // HH:MM
  days: number[]; // 0=Sun..6=Sat, empty = every day
  enabled: boolean;
  mission: AlarmMission;
  difficulty: number; // 1..3 (mission steps)
  /** An uploaded clip from the `sounds` table. Takes precedence if set. */
  soundId?: number;
  /** One of the bundled tones. Used when there's no uploaded clip. */
  builtInSound?: SoundId;
  lastFiredDate?: string; // YYYY-MM-DD
  createdAt: number;
}

export type FinanceCategoryKind = "income" | "expense";

export interface FinanceCategory {
  id: number;
  name: string;
  kind: FinanceCategoryKind;
  /** Counts toward recurring monthly income (MRR) rather than one-off. */
  recurring?: boolean;
}

export interface Transaction {
  id: number;
  date: string; // YYYY-MM-DD
  type: FinanceCategoryKind;
  amount: number;
  category: string;
  note?: string;
}

/** Monthly spending cap for an expense category. */
export interface Budget {
  id: number;
  category: string;
  amount: number; // monthly limit
}

export type DebtType = "loan" | "emi" | "borrowed" | "lent";

/**
 * A running ledger entry for money owed either way — no interest/schedule
 * concept, just principal vs. paid so far. `loan`/`emi`/`borrowed` are money
 * the user owes; `lent` is money owed back to the user.
 */
export interface Debt {
  id: number;
  type: DebtType;
  name: string;
  amount: number;
  paidAmount: number;
  /** Derived by debtSummary.remainingAmount() — never stored directly. */
  dueDate?: string; // YYYY-MM-DD
  note?: string;
  createdAt: number;
  settledAt?: number;
}

export interface Note {
  id: number;
  title: string;
  body: string;
  /** Free-form, user-created. The `*tags` multi-entry index powers filtering. */
  tags: string[];
  pinned: boolean;
  createdAt: number; // epoch ms
  /** Shows a "review before sharing" banner — replaces tag-name coupling. */
  sensitive?: boolean;
  reminderEnabled?: boolean;
  reminderTime?: string; // HH:MM
  lastReminderDate?: string;
}

/** A user-uploaded audio clip usable as an alarm sound. */
export interface Sound {
  id: number;
  name: string;
  blob: Blob;
  createdAt: number;
}

export type GoalStatus = "active" | "completed" | "abandoned";

export interface Goal {
  id: number;
  title: string;
  status: GoalStatus;
  targetDate?: string; // YYYY-MM-DD
  /** Habit names that move this goal forward — surfaced as "today's step". */
  linkedHabits?: string[];
  /**
   * Timestamps for history. Both are optional and DELIBERATELY NOT backfilled
   * on goals that predate them: there is no honest value to invent. Guessing
   * "now" would claim every old goal was created today; guessing anything else
   * is equally made up. Undefined renders as "—" and history starts now.
   *
   * Non-indexed, so no Dexie version bump is needed.
   */
  createdAt?: number;
  completedAt?: number;
}

/** A milestone unlocked exactly once; `key` is a stable id like "streak-365". */
export interface Achievement {
  id: number;
  key: string;
  unlockedAt: number; // epoch ms
}

/**
 * One row per day the wake-up mission was actually solved. Solving it is the
 * only way to silence the alarm, so a row here means the user genuinely got
 * up with the app — which is what makes a wake-up streak mean something.
 */
export interface WakeLog {
  id: number;
  date: string; // YYYY-MM-DD (local), unique — one wake per day
  solvedAt: number; // epoch ms
  /** The alarm's scheduled HH:MM, for the "up N minutes later" line. */
  scheduledTime: string;
  /** Positive = solved after the alarm; can be negative if it was previewed. */
  minutesLate: number;
}

/** Solving within this many minutes of the alarm counts as "on time". */
export const WAKE_ON_TIME_GRACE_MIN = 15;

/** Target value for a numeric health metric (e.g. reach 62 kg). */
export interface MetricGoal {
  id: number;
  metricType: TrajectoryMetricType;
  target: number;
  direction: "decrease" | "increase";
}

/** A fasting observance, live while endedAt is undefined. */
export interface FastingSession {
  id: number;
  startedAt: number; // epoch ms
  endedAt?: number; // epoch ms
  targetHours: number;
  /** Optional label for the observance (e.g. "Ekadashi", "Roza"). */
  label?: string;
  /** Set once the elapsed-time notification has fired, so the scheduler
   *  doesn't repeat it every tick. */
  targetNotified?: boolean;
}

export const FAST_TARGET_PRESETS = [8, 10, 12, 14, 16, 18, 24];

export interface AppSettings {
  id: number; // fixed at 1
  darkMode: boolean;
  seeded: boolean;
  lastBackupAt?: number;
  /** Alarm currently ringing — persisted so a page refresh can't skip the mission. */
  ringingAlarmId?: number;
  /** First-run wizard finished (or explicitly skipped). */
  onboardingComplete?: boolean;
  /** Cached auth user id — identity only, never used to sync life data. */
  authUserId?: string;
  /** Offline-grace snapshot; RevenueCat remains the source of truth. */
  entitlementCache?: {
    active: boolean;
    lastCheckedAt: number;
    productId?: string;
  };
  /** Body basics, so health targets are personal rather than arbitrary. */
  bodyProfile?: BodyProfile;
  /**
   * Fasting is OFF unless the user opts in — it's a practice some people keep
   * and others don't, and for many it's an observance rather than a health
   * protocol. The app never assumes it.
   */
  fastingEnabled?: boolean;
  /** Which built-in tone habit/task/note reminders use. */
  reminderSound?: SoundId;
}

export const DEFAULT_FAST_HOURS = 12;

/**
 * The four Life Pillars. Every identity maps to exactly one pillar, so
 * completing a habit strengthens an identity *and* rolls up into a score.
 */
export type Pillar = "health" | "wealth" | "knowledge" | "productivity";

export const PILLAR_META: Record<
  Pillar,
  { label: string; icon: string; color: string }
> = {
  health: { label: "Health", icon: "❤️", color: "#fb7185" },
  wealth: { label: "Wealth", icon: "💰", color: "#f59e0b" },
  knowledge: { label: "Knowledge", icon: "🧠", color: "#a78bfa" },
  productivity: { label: "Productivity", icon: "⚡", color: "#22d3ee" },
};

/** Identity a habit builds. Users pick one; it determines pillar scoring. */
export const IDENTITIES: { name: string; icon: string; pillar: Pillar }[] = [
  { name: "Healthy Person", icon: "🥗", pillar: "health" },
  { name: "Runner", icon: "🏃", pillar: "health" },
  { name: "Athlete", icon: "💪", pillar: "health" },
  { name: "Reader", icon: "📚", pillar: "knowledge" },
  { name: "Learner", icon: "🧠", pillar: "knowledge" },
  { name: "Creator", icon: "✍️", pillar: "knowledge" },
  { name: "Investor", icon: "📈", pillar: "wealth" },
  { name: "Saver", icon: "🏦", pillar: "wealth" },
  { name: "Minimalist", icon: "🍃", pillar: "wealth" },
  { name: "Entrepreneur", icon: "🚀", pillar: "productivity" },
  { name: "Deep Worker", icon: "🎯", pillar: "productivity" },
  { name: "Early Riser", icon: "🌅", pillar: "productivity" },
];

export function pillarForIdentity(identity?: string): Pillar {
  return (
    IDENTITIES.find((i) => i.name === identity)?.pillar ?? "productivity"
  );
}

export const HABIT_COLORS = [
  "#22d3ee",
  "#a78bfa",
  "#34d399",
  "#f59e0b",
  "#fb7185",
  "#60a5fa",
  "#f472b6",
  "#4ade80",
];

export const HABIT_ICONS = [
  "🎯",
  "🧩",
  "💪",
  "📚",
  "🧘",
  "💧",
  "🏃",
  "🥗",
  "🌅",
  "🛌",
  "✍️",
  "🧠",
];

/**
 * Generic suggestions offered as opt-in checkboxes during onboarding.
 * Nothing here is written automatically — the user chooses what they want.
 *
 * Deliberately excludes water and sleep: "did you drink water today?" is a
 * meaningless checkbox because the real question is *how much*. Both are
 * tracked as daily quantities against a personal target in the Health tab
 * instead (see METRIC_AGGREGATION / bodyMetrics.ts).
 */
export const STARTER_TEMPLATES = {
  habits: [
    { name: "Exercise", icon: "💪", color: "#fb7185", identity: "Athlete" },
    { name: "Read", icon: "📚", color: "#a78bfa", identity: "Reader" },
    { name: "Meditate", icon: "🧘", color: "#34d399", identity: "Healthy Person" },
    { name: "Walk", icon: "🏃", color: "#4ade80", identity: "Runner" },
    { name: "Deep Work", icon: "🎯", color: "#60a5fa", identity: "Deep Worker" },
    { name: "Journal", icon: "✍️", color: "#f59e0b", identity: "Creator" },
  ],
  incomeCategories: ["Salary", "Freelance Income", "Business", "Investments"],
  expenseCategories: [
    "Food",
    "Rent",
    "Transport",
    "Groceries",
    "Subscriptions",
    "Shopping",
    "Health",
  ],
  /** Categories pre-marked as recurring monthly income when selected. */
  recurringIncome: ["Salary"],
  goals: [
    "Get Fit",
    "Save ₹100,000",
    "Read 12 Books",
    "Learn a New Skill",
    "Build an Emergency Fund",
  ],
} as const;

/** One glass of water, in ml — the unit the water tracker taps in. */
export const GLASS_ML = 250;

/**
 * Built-in tones, bundled twice from the same source files: in `public/sounds/`
 * so the WebView can play them for the in-app alarm and previews, and in
 * `android/app/src/main/res/raw/` so Android notification channels can use them.
 */
export const BUILT_IN_SOUNDS = [
  { id: "chime", label: "Chime", blurb: "Soft two-note bell" },
  { id: "ping", label: "Ping", blurb: "One bright hit" },
  { id: "bell", label: "Bell", blurb: "Three quick beeps" },
] as const;

export type SoundId = (typeof BUILT_IN_SOUNDS)[number]["id"];

export const DEFAULT_REMINDER_SOUND: SoundId = "chime";

/** Web-accessible path for a built-in tone (previews and the in-app alarm). */
export const soundUrl = (id: SoundId) => `/sounds/${id}.wav`;

/** The Android res/raw filename the notification channel resolves. */
export const soundResource = (id: SoundId) => `${id}.wav`;

class LifeHubDB extends Dexie {
  healthMetrics!: EntityTable<HealthMetric, "id">;
  habitLogs!: EntityTable<HabitLog, "id">;
  habits!: EntityTable<Habit, "id">;
  financeCategories!: EntityTable<FinanceCategory, "id">;
  transactions!: EntityTable<Transaction, "id">;
  budgets!: EntityTable<Budget, "id">;
  debts!: EntityTable<Debt, "id">;
  notes!: EntityTable<Note, "id">;
  goals!: EntityTable<Goal, "id">;
  metricGoals!: EntityTable<MetricGoal, "id">;
  fastingSessions!: EntityTable<FastingSession, "id">;
  tasks!: EntityTable<Task, "id">;
  alarms!: EntityTable<Alarm, "id">;
  sounds!: EntityTable<Sound, "id">;
  achievements!: EntityTable<Achievement, "id">;
  wakeLogs!: EntityTable<WakeLog, "id">;
  appSettings!: EntityTable<AppSettings, "id">;

  constructor() {
    // NEVER rename this. It is the IndexedDB database name, not a label —
    // changing it opens a fresh empty database and orphans every existing
    // user's data. The app's display name is "Life Mentor"; this is not.
    super("life-hub");
    this.version(1).stores({
      healthMetrics: "++id, date, metricType, [date+metricType]",
      habitLogs: "++id, date, habitName, [date+habitName]",
      financeCategories: "++id, name, kind",
      transactions: "++id, date, type, category",
      notes: "++id, createdAt, pinned, *tags",
      goals: "++id, status",
      appSettings: "id",
    });
    this.version(2).stores({
      habits: "++id, &name, category, archived",
      budgets: "++id, &category",
      metricGoals: "++id, &metricType",
      fastingSessions: "++id, startedAt, endedAt",
    });
    this.version(3).stores({
      tasks: "++id, done, createdAt, dueDate",
      alarms: "++id, enabled",
    });
    this.version(4).stores({
      sounds: "++id, name",
    });
    this.version(5)
      .stores({
        habits: "++id, &name, category, archived, pinned",
        notes: "++id, createdAt, pinned, sensitive, *tags",
        financeCategories: "++id, name, kind, recurring",
        achievements: "++id, &key, unlockedAt",
      })
      .upgrade(async (tx) => {
        // Carry an existing device forward: the old privacy banner keyed off a
        // hardcoded tag name, which no longer exists as a concept.
        await tx
          .table("notes")
          .toCollection()
          .modify((n) => {
            if (n.sensitive === undefined) {
              n.sensitive = Array.isArray(n.tags)
                ? n.tags.includes("Content-Scripts")
                : false;
            }
          });
        await tx
          .table("habits")
          .toCollection()
          .modify((h) => {
            if (h.pinned === undefined) h.pinned = false;
          });
        await tx
          .table("financeCategories")
          .toCollection()
          .modify((c) => {
            if (c.recurring === undefined) c.recurring = false;
          });
        await tx
          .table("appSettings")
          .toCollection()
          .modify((s) => {
            // Anyone who already went through the old auto-seed shouldn't be
            // dropped into the new first-run wizard.
            if (s.seeded && s.onboardingComplete === undefined) {
              s.onboardingComplete = true;
            }
          });
      });
    // Purely a new table — nothing to backfill, so no upgrade callback.
    this.version(6).stores({
      wakeLogs: "++id, &date",
    });
    // Purely a new table — nothing to backfill, so no upgrade callback.
    this.version(7).stores({
      debts: "++id, type",
    });
  }
}

export const db = new LifeHubDB();

/** Ensure every habit name that appears in habitLogs also has a definition row. */
export async function backfillHabits(): Promise<void> {
  const names = new Set((await db.habitLogs.toArray()).map((l) => l.habitName));
  const existing = new Set((await db.habits.toArray()).map((h) => h.name));
  const missing = [...names].filter((n) => !existing.has(n));
  if (missing.length === 0) return;

  let colorIdx = existing.size;
  for (const name of missing) {
    await db.habits.add({
      name,
      color: HABIT_COLORS[colorIdx % HABIT_COLORS.length],
      icon: "🎯",
      schedule: { type: "daily" },
      archived: false,
      pinned: false,
      createdAt: Date.now(),
    } as never);
    colorIdx += 1;
  }
}

/**
 * Guarantee the single settings row exists. No content is seeded any more —
 * a new user picks their own habits/categories/goals in the onboarding
 * wizard, so nobody inherits someone else's setup.
 */
export async function ensureSeeded(): Promise<void> {
  const existing = await db.appSettings.get(1);

  if (!existing) {
    await db.appSettings.put({
      id: 1,
      darkMode: true,
      seeded: true,
      onboardingComplete: false,
    });
  }

  // Reconcile habit definitions with any names present in logs (covers data
  // created before the habits table existed).
  await backfillHabits();
}

/**
 * Applies the user's onboarding choices, then marks onboarding done.
 *
 * Habits are deliberately NOT handled here — they go through
 * `createHabitFromTemplate` in `modules/habits/habitActions.ts`, the single
 * habit-creation path. Calling it from this file would be a circular import,
 * so the wizard invokes it directly before calling this.
 */
export async function applyOnboardingSelections(selection: {
  incomeCategories: string[];
  expenseCategories: string[];
  goals: string[];
}): Promise<void> {
  await db.transaction(
    "rw",
    [db.financeCategories, db.goals, db.appSettings],
    async () => {
      for (const name of selection.incomeCategories) {
        const exists = await db.financeCategories
          .where("name")
          .equals(name)
          .first();
        if (exists) continue;
        await db.financeCategories.add({
          name,
          kind: "income",
          recurring: (
            STARTER_TEMPLATES.recurringIncome as readonly string[]
          ).includes(name),
        } as never);
      }

      for (const name of selection.expenseCategories) {
        const exists = await db.financeCategories
          .where("name")
          .equals(name)
          .first();
        if (exists) continue;
        await db.financeCategories.add({
          name,
          kind: "expense",
          recurring: false,
        } as never);
      }

      for (const title of selection.goals) {
        await db.goals.add({ title, status: "active" } as never);
      }

      await db.appSettings.update(1, { onboardingComplete: true });
    },
  );
}
