import {
  Ban,
  Bed,
  BookOpen,
  Brain,
  CalendarDays,
  CircleCheck,
  Coins,
  Droplet,
  Dumbbell,
  Flame,
  Flower2,
  Footprints,
  Leaf,
  Moon,
  PenLine,
  PiggyBank,
  Puzzle,
  Rocket,
  Salad,
  Sparkles,
  Soup,
  Sunrise,
  Target,
  TrendingUp,
  Trophy,
  Wind,
  type LucideIcon,
} from "lucide-react";

/**
 * Icons for things the user picks or the app awards — habits, identities,
 * achievements.
 *
 * These were the last emoji in the app, and they were the ones that mattered
 * most: a habit icon is the biggest, most repeated glyph on the Habits and
 * Today screens. Emoji render at whatever size, weight and colour the host
 * font decides, so they never matched the stroke icons around them, and on
 * iOS they pulled Apple's full-colour artwork into a monochrome interface.
 *
 * What is stored changed with them. The database used to hold the glyph
 * itself ("💪"), which is a rendering decision baked into the data. It now
 * holds a NAME ("dumbbell"), and this module is the only place that decides
 * what a name looks like — so the icon set can be changed again later
 * without a second migration.
 */

const REGISTRY: Record<string, LucideIcon> = {
  target: Target,
  puzzle: Puzzle,
  dumbbell: Dumbbell,
  book: BookOpen,
  meditate: Flower2,
  water: Droplet,
  run: Footprints,
  eat: Salad,
  sunrise: Sunrise,
  sleep: Bed,
  write: PenLine,
  brain: Brain,
  invest: TrendingUp,
  save: PiggyBank,
  minimal: Leaf,
  launch: Rocket,
  streak: Flame,
  done: CircleCheck,
  money: Coins,
  trophy: Trophy,
  calendar: CalendarDays,
  spark: Sparkles,
  moon: Moon,
  calm: Wind,
  avoid: Ban,
  cook: Soup,
};

export type AppIconName = keyof typeof REGISTRY;

/**
 * Rows written before this change still hold an emoji. Rather than rewrite
 * every habit in a migration — which would be a destructive edit of the
 * user's own data to fix a presentation problem — the old glyphs resolve
 * through this table. A habit created in 2026 keeps working untouched.
 */
const LEGACY_EMOJI: Record<string, AppIconName> = {
  "🎯": "target",
  "🧩": "puzzle",
  "💪": "dumbbell",
  "📚": "book",
  "🧘": "meditate",
  "🕉️": "calm",
  "🕉": "calm",
  "🚫": "avoid",
  "💧": "water",
  "🏃": "run",
  "🥗": "eat",
  "🌅": "sunrise",
  "🛌": "sleep",
  "✍️": "write",
  "✍": "write",
  "🧠": "brain",
  "📈": "invest",
  "🏦": "save",
  "🍃": "minimal",
  "🚀": "launch",
  "🔥": "streak",
  "✅": "done",
  "💰": "money",
  "🏆": "trophy",
  "📅": "calendar",
};

/** The palette offered in the habit picker, in the order it is shown. */
export const HABIT_ICON_NAMES: AppIconName[] = [
  "target",
  "puzzle",
  "dumbbell",
  "book",
  "meditate",
  "water",
  "run",
  "eat",
  "sunrise",
  "sleep",
  "write",
  "brain",
];

/**
 * Anything stored, old or new, becomes a component. Falls back to the
 * generic target rather than rendering nothing, so an unknown value from a
 * restored backup degrades to a plain icon instead of a hole in the layout.
 */
export function iconFor(stored: string | undefined | null): LucideIcon {
  if (!stored) return Target;
  return REGISTRY[stored] ?? REGISTRY[LEGACY_EMOJI[stored] ?? ""] ?? Target;
}

/** Renders a stored icon value. `stored` may be a name or a legacy emoji. */
export function AppIcon({
  name,
  size = 18,
  className = "",
  strokeWidth = 1.8,
}: {
  name: string | undefined | null;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  const Icon = iconFor(name);
  return (
    <Icon size={size} strokeWidth={strokeWidth} className={className} aria-hidden />
  );
}
