import Dexie, { type EntityTable } from "dexie";
import { localDateStr } from "../lib/dates";

export type HealthMetricType =
  | "15.5h-fast"
  | "titan-powder"
  | "weight"
  | "energy-level";

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
  category?: string;
  archived: boolean;
  createdAt: number;
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

export const NOTE_TAGS = [
  "Meta-Ads-1-1-2",
  "Content-Scripts",
  "Tamil-Poetry",
  "Academic-Stats",
  "Meeting-Minutes",
] as const;

export type NoteTag = (typeof NOTE_TAGS)[number];

export interface Note {
  id: number;
  title: string;
  body: string;
  tags: string[];
  pinned: boolean;
  createdAt: number; // epoch ms
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
}

export interface AppSettings {
  id: number; // fixed at 1
  darkMode: boolean;
  seeded: boolean;
  lastBackupAt?: number;
  /** Alarm currently ringing — persisted so a page refresh can't skip the mission. */
  ringingAlarmId?: number;
}

export const DEFAULT_FAST_HOURS = 15.5;

interface DefaultHabit {
  name: string;
  color: string;
  icon: string;
  schedule: HabitSchedule;
  category: string;
}

export const DEFAULT_HABIT_DEFS: DefaultHabit[] = [
  {
    name: "Vault 1 Framework Active",
    color: "#22d3ee",
    icon: "🧩",
    schedule: { type: "daily" },
    category: "System",
  },
  {
    name: "Deep Work (Agency Scaling)",
    color: "#a78bfa",
    icon: "🎯",
    schedule: { type: "weekdays", days: [1, 2, 3, 4, 5] },
    category: "Work",
  },
];

export const DEFAULT_HABITS = DEFAULT_HABIT_DEFS.map((h) => h.name);

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

export const DEFAULT_INCOME_CATEGORIES = [
  "Agency Retainers (day1to1day)",
  "Career Consulting (CCC)",
  "Digital Course Sales",
];

export const DEFAULT_EXPENSE_CATEGORIES = [
  "Meta Ad Spend",
  "Software Subscriptions",
  "Operations",
];

export const DEFAULT_GOALS = [
  "Launch Digital Marketing Course",
  "Scale Meta Ads 1-1-2 Structure",
  "Clear Statistics Exam",
];

export const WEIGHT_BASELINE_KG = 66;

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
    const def = DEFAULT_HABIT_DEFS.find((d) => d.name === name);
    await db.habits.add({
      name,
      color: def?.color ?? HABIT_COLORS[colorIdx % HABIT_COLORS.length],
      icon: def?.icon ?? "🎯",
      schedule: def?.schedule ?? { type: "daily" },
      category: def?.category,
      archived: false,
      createdAt: Date.now(),
    } as never);
    colorIdx += 1;
  }
}

export async function ensureSeeded(): Promise<void> {
  const existing = await db.appSettings.get(1);

  if (!existing?.seeded) {
    await db.transaction(
      "rw",
      [db.habitLogs, db.habits, db.financeCategories, db.goals, db.appSettings],
      async () => {
        const today = localDateStr();

        const habitDefCount = await db.habits.count();
        if (habitDefCount === 0) {
          await db.habits.bulkAdd(
            DEFAULT_HABIT_DEFS.map((h) => ({
              ...h,
              archived: false,
              createdAt: Date.now(),
            })) as Habit[],
          );
        }

        const habitCount = await db.habitLogs
          .where("date")
          .equals(today)
          .count();
        if (habitCount === 0) {
          await db.habitLogs.bulkAdd(
            DEFAULT_HABITS.map((habitName) => ({
              date: today,
              habitName,
              completed: false,
            })) as HabitLog[],
          );
        }

        const categoryCount = await db.financeCategories.count();
        if (categoryCount === 0) {
          await db.financeCategories.bulkAdd([
            ...DEFAULT_INCOME_CATEGORIES.map((name) => ({
              name,
              kind: "income" as const,
            })),
            ...DEFAULT_EXPENSE_CATEGORIES.map((name) => ({
              name,
              kind: "expense" as const,
            })),
          ] as FinanceCategory[]);
        }

        const goalCount = await db.goals.count();
        if (goalCount === 0) {
          await db.goals.bulkAdd(
            DEFAULT_GOALS.map((title) => ({
              title,
              status: "active" as const,
            })) as Goal[],
          );
        }

        await db.appSettings.put({
          id: 1,
          darkMode: existing?.darkMode ?? true,
          seeded: true,
          lastBackupAt: existing?.lastBackupAt,
        });
      },
    );
  }

  // Always reconcile habit definitions with any names present in logs
  // (covers data created before the habits table existed).
  await backfillHabits();
}
