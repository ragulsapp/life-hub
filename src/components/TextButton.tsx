import type { ButtonHTMLAttributes } from "react";

/**
 * A text-only action — "Record payment", "Show 12 months", "Pause".
 *
 * This existed as a copied class string, `text-xs font-semibold
 * text-cyan-500`, in a handful of places, and every copy was missing the one
 * thing a button needs most: a height. Measured with real data on screen they
 * were 16px tall — a third of the 44px minimum the rest of the app meets. A
 * previous touch-target audit never saw them, because it ran against a fresh
 * install and these only render once there is data.
 *
 * The box is 44px and the label keeps its visual size. Pass `-ml-3` where the
 * text should line up with the copy above it; the padding is what makes the
 * target bigger than the word.
 */
export function TextButton({
  tone = "accent",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  /** "accent" for the action itself, "muted" for a secondary one. */
  tone?: "accent" | "muted";
}) {
  const toneClass =
    tone === "accent"
      ? "text-cyan-500 hover:bg-cyan-500/10 dark:text-cyan-300"
      : "text-slate-500 hover:bg-slate-500/10 hover:text-cyan-500 dark:text-slate-400 dark:hover:text-cyan-300";
  return (
    <button
      type={type}
      className={`inline-flex h-11 min-w-11 items-center justify-center rounded-xl px-3 text-sm font-semibold transition-colors ${toneClass} ${className}`}
      {...props}
    />
  );
}
