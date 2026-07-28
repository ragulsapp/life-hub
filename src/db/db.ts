import Dexie, { type EntityTable } from "dexie";

export type HealthMetricType = "weight" | "energy-level";

export interface HealthMetric {
  id: number;
  date: string; // YYYY-MM-DD
  metricType: HealthMetricType;
  value: number; // booleans stored as 1/0
  note?: string;
}

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
  soundId?: number; // custom sound; undefined = generated siren
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
}

/** A milestone unlocked exactly once; `key` is a stable id like "streak-365". */
export interface Achievement {
  id: number;
  key: string;
  unlockedAt: number; // epoch ms
}

/** Target value for a numeric health metric (e.g. reach 62 kg). */
export interface MetricGoal {
  id: number;
  metricType: HealthMetricType;
  target: number;
  direction: "decrease" | "increase";
}

/** A fasting window, live while endedAt is undefined. */
export interface FastingSession {
  id: number;
  startedAt: number; // epoch ms
  endedAt?: number; // epoch ms
  targetHours: number;
  /** Set once the "time to end your fast" notification has fired, so the
   *  scheduler doesn't repeat it every tick. */
  targetNotified?: boolean;
}

export const FAST_TARGET_PRESETS = [12, 14, 15, 15.5, 16, 18, 20];

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
}

export const DEFAULT_FAST_HOURS = 15.5;

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
 */
export const STARTER_TEMPLATES = {
  habits: [
    { name: "Drink Water", icon: "💧", color: "#22d3ee", identity: "Healthy Person" },
    { name: "Exercise", icon: "💪", color: "#fb7185", identity: "Athlete" },
    { name: "Read", icon: "📚", color: "#a78bfa", identity: "Reader" },
    { name: "Meditate", icon: "🧘", color: "#34d399", identity: "Healthy Person" },
    { name: "Walk 10k Steps", icon: "🏃", color: "#4ade80", identity: "Runner" },
    { name: "Deep Work", icon: "🎯", color: "#60a5fa", identity: "Deep Worker" },
    { name: "Sleep Early", icon: "🛌", color: "#f472b6", identity: "Healthy Person" },
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

export const WEIGHT_BASELINE_KG = 70;

class LifeHubDB extends Dexie {
  healthMetrics!: EntityTable<HealthMetric, "id">;
  habitLogs!: EntityTable<HabitLog, "id">;
  habits!: EntityTable<Habit, "id">;
  financeCategories!: EntityTable<FinanceCategory, "id">;
  transactions!: EntityTable<Transaction, "id">;
  budgets!: EntityTable<Budget, "id">;
  notes!: EntityTable<Note, "id">;
  goals!: EntityTable<Goal, "id">;
  metricGoals!: EntityTable<MetricGoal, "id">;
  fastingSessions!: EntityTable<FastingSession, "id">;
  tasks!: EntityTable<Task, "id">;
  alarms!: EntityTable<Alarm, "id">;
  sounds!: EntityTable<Sound, "id">;
  achievements!: EntityTable<Achievement, "id">;
  appSettings!: EntityTable<AppSettings, "id">;

  constructor() {
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

/** Applies the user's onboarding choices, then marks onboarding done. */
export async function applyOnboardingSelections(selection: {
  habits: string[];
  incomeCategories: string[];
  expenseCategories: string[];
  goals: string[];
}): Promise<void> {
  await db.transaction(
    "rw",
    [db.habits, db.financeCategories, db.goals, db.appSettings],
    async () => {
      for (const [i, name] of selection.habits.entries()) {
        const tpl = STARTER_TEMPLATES.habits.find((h) => h.name === name);
        const exists = await db.habits.where("name").equals(name).first();
        if (exists) continue;
        await db.habits.add({
          name,
          color: tpl?.color ?? HABIT_COLORS[i % HABIT_COLORS.length],
          icon: tpl?.icon ?? "🎯",
          schedule: { type: "daily" },
          category: tpl?.identity,
          archived: false,
          // Pin the first two picks so the Dashboard isn't empty on day one.
          pinned: i < 2,
          createdAt: Date.now(),
        } as never);
      }

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
