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

export function PlayIcon({ className = "", size = 14 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M7 4.8 15 10l-8 5.2V4.8Z" fill="currentColor" />
    </svg>
  );
}

export function StopIcon({ className = "", size = 14 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="5.5" y="5.5" width="9" height="9" rx="1.6" fill="currentColor" />
    </svg>
  );
}

export function CheckIcon({ className = "", size = 14 }: IconProps) {
  return (
    <svg {...base(size)} className={className} strokeWidth={2}>
      <path d="M4.5 10.5 8 14l7.5-8" />
    </svg>
  );
}

export function TrashIcon({ className = "", size = 14 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 6h12M8 6V4.5h4V6M6 6l.7 9.2A1.4 1.4 0 0 0 8.1 16.5h3.8a1.4 1.4 0 0 0 1.4-1.3L14 6" />
    </svg>
  );
}

export function MusicIcon({ className = "", size = 14 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M8 14.5V5.2l7-1.4v9.1" />
      <circle cx="6.2" cy="14.7" r="1.9" />
      <circle cx="13.2" cy="13" r="1.9" />
    </svg>
  );
}

export function SirenIcon({ className = "", size = 14 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M6.5 12a3.5 3.5 0 0 1 7 0" />
      <path d="M4 12h12M5.5 15.5h9" />
      <path d="M10 4v2M4.8 6.2l1.4 1.4M15.2 6.2l-1.4 1.4" />
    </svg>
  );
}
