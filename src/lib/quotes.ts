/**
 * Short, generic motivational lines — public-domain/commonly-attributed,
 * nothing copyrighted. Picked deterministically by day-of-year so the same
 * quote shows all day and the app never needs a network call or randomness.
 */
const QUOTES = [
  "Small steps, every day.",
  "Discipline is choosing what you want most over what you want now.",
  "Done is better than perfect.",
  "You don't have to see the whole staircase, just take the first step.",
  "Progress, not perfection.",
  "The secret of getting ahead is getting started.",
  "A little progress each day adds up to big results.",
  "Focus on the step in front of you, not the whole staircase.",
  "What you do today can improve all your tomorrows.",
  "Consistency beats intensity.",
  "Start where you are. Use what you have. Do what you can.",
  "The best time to start was yesterday. The next best time is now.",
  "Habits are the compound interest of self-improvement.",
  "Action cures fear.",
  "You are what you do repeatedly.",
  "One day or day one — you decide.",
  "Slow progress is still progress.",
  "Make today count.",
  "Energy and persistence conquer all things.",
  "Well begun is half done.",
  "Little by little, a little becomes a lot.",
  "The only bad workout is the one that didn't happen.",
  "Every accomplishment starts with the decision to try.",
  "Show up for yourself today.",
  "Your future is created by what you do today, not tomorrow.",
  "Success is the sum of small efforts repeated daily.",
  "Take care of today, and tomorrow will take care of itself.",
  "Believe you can, and you're halfway there.",
  "Great things are done by a series of small things brought together.",
  "The journey of a thousand miles begins with a single step.",
];

function dayOfYear(now: Date): number {
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

/** Today's quote — stable all day, changes daily, fully offline. */
export function quoteForDay(now: Date = new Date()): string {
  return QUOTES[dayOfYear(now) % QUOTES.length];
}
