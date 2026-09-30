/**
 * Shared UI icons.
 *
 * Emoji were doing this job — 🔔, ⏰, 📅 — at whatever size and colour the
 * host font decided, which is most of what made the app read as unfinished.
 * These inherit `currentColor` and scale with the surrounding text, so a
 * control's icon and its label always match.
 *
 * Stroke-based and deliberately plain, to sit with the Aura surfaces rather
 * than compete with them.
 */
type IconProps = { className?: string; size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 20 20",
  fill: "none" as const,
  stroke: "currentColor" as const,
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export function BellIcon({ className = "", size = 14, on = false }: IconProps & { on?: boolean }) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M5 8a5 5 0 0 1 10 0c0 3.2.8 4.6 1.4 5.3.3.3.1.9-.4.9H4c-.5 0-.7-.6-.4-.9C4.2 12.6 5 11.2 5 8Z" />
      <path d="M8.2 16.6a2 2 0 0 0 3.6 0" />
      {/* A filled clapper reads as "ringing" without needing a second icon. */}
      {on && <circle cx="10" cy="8.4" r="1.7" fill="currentColor" stroke="none" />}
    </svg>
  );
}

export function ClockIcon({ className = "", size = 14 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6.2V10l2.6 1.6" />
    </svg>
  );
}

export function CalendarIcon({ className = "", size = 14 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="3" y="5" width="14" height="12" rx="2.5" />
      <path d="M3 8.6h14M7 3.2v3M13 3.2v3" />
    </svg>
  );
}

export function PlusIcon({ className = "", size = 14 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M10 4.5v11M4.5 10h11" />
    </svg>
  );
}
