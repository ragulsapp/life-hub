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

export function XIcon({ className = "", size = 14 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" />
    </svg>
  );
}

export function SearchIcon({ className = "", size = 14 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="9" cy="9" r="5" />
      <path d="M12.8 12.8 16.5 16.5" />
    </svg>
  );
}

export function SettingsIcon({ className = "", size = 14 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="10" cy="10" r="2.6" />
      <path d="M10 2.6v1.8M10 15.6v1.8M17.4 10h-1.8M4.4 10H2.6M15.2 4.8l-1.3 1.3M6.1 13.9l-1.3 1.3M15.2 15.2l-1.3-1.3M6.1 6.1 4.8 4.8" />
    </svg>
  );
}

export function PinIcon({ className = "", size = 14, on = false }: IconProps & { on?: boolean }) {
  return (
    <svg {...base(size)} className={className}>
      <path
        d="M12.4 2.8 17.2 7.6l-2.3.6a2 2 0 0 0-1 .6l-2.6 3-3.1-3.1 3-2.6a2 2 0 0 0 .6-1l.6-2.3Z"
        fill={on ? "currentColor" : "none"}
      />
      <path d="m8.2 11.8-5 5.4" />
    </svg>
  );
}

export function FlameIcon({ className = "", size = 14 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M10 2.6c2.4 2.5 4.6 4.3 4.6 7.6a4.6 4.6 0 0 1-9.2 0c0-1.5.6-2.7 1.6-3.8.2 1 .7 1.7 1.5 2.1-.1-2.2.4-4 1.5-5.9Z" />
    </svg>
  );
}

export function TrophyIcon({ className = "", size = 14 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M6 3.4h8v3.4a4 4 0 0 1-8 0V3.4Z" />
      <path d="M6 4.6H3.8v1a2.6 2.6 0 0 0 2.4 2.6M14 4.6h2.2v1a2.6 2.6 0 0 1-2.4 2.6" />
      <path d="M10 10.8v2.8M7 16.6h6M8.4 13.6h3.2v3H8.4Z" />
    </svg>
  );
}

export function AlertIcon({ className = "", size = 14 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M10 3.6 17.4 16H2.6L10 3.6Z" />
      <path d="M10 8.2v3.2" />
      <circle cx="10" cy="13.6" r=".9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function PencilIcon({ className = "", size = 14 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="m13.2 3.6 3.2 3.2-9 9H4.2v-3.2l9-9Z" />
    </svg>
  );
}

export function SunIcon({ className = "", size = 14 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="10" cy="10" r="3.4" />
      <path d="M10 2.4v1.6M10 16v1.6M17.6 10H16M4 10H2.4M15.4 4.6l-1.2 1.2M5.8 14.2l-1.2 1.2M15.4 15.4l-1.2-1.2M5.8 5.8 4.6 4.6" />
    </svg>
  );
}

export function MoonIcon({ className = "", size = 14 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M16 11.6A6.6 6.6 0 0 1 8.4 4a6.6 6.6 0 1 0 7.6 7.6Z" />
    </svg>
  );
}

export function SunriseIcon({ className = "", size = 14 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M6.2 12.4a3.8 3.8 0 0 1 7.6 0" />
      <path d="M2.8 15.4h14.4M10 2.6v2.8M4.4 6.4l1.4 1.4M15.6 6.4l-1.4 1.4" />
    </svg>
  );
}

export function VolumeIcon({ className = "", size = 14 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M9 4.4 5.6 7.4H3v5.2h2.6L9 15.6V4.4Z" />
      <path d="M12.2 7.6a3.4 3.4 0 0 1 0 4.8M14.6 5.4a6.6 6.6 0 0 1 0 9.2" />
    </svg>
  );
}

export function DownloadIcon({ className = "", size = 14 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M10 3v8.6M6.4 8.4 10 12l3.6-3.6M3.6 15.4h12.8" />
    </svg>
  );
}

export function UploadIcon({ className = "", size = 14 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M10 12.6V4M6.4 7.6 10 4l3.6 3.6M3.6 15.4h12.8" />
    </svg>
  );
}

export function TargetIcon({ className = "", size = 14 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="10" cy="10" r="6.6" />
      <circle cx="10" cy="10" r="3" />
      <circle cx="10" cy="10" r=".9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CheckSquareIcon({ className = "", size = 14 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="3.4" y="3.4" width="13.2" height="13.2" rx="3.2" />
      <path d="m6.8 10.2 2.3 2.3 4.1-4.6" />
    </svg>
  );
}

export function NoteIcon({ className = "", size = 14 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4.4 3.6h11.2v12.8H4.4z" />
      <path d="M7.2 7.2h5.6M7.2 10h5.6M7.2 12.8h3.2" />
    </svg>
  );
}

export function WalletIcon({ className = "", size = 14 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="2.8" y="5.2" width="14.4" height="10" rx="2.6" />
      <path d="M2.8 8.6h14.4" />
      <circle cx="13.6" cy="12" r=".9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ScaleIcon({ className = "", size = 14 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="3" y="3.4" width="14" height="13.2" rx="3.4" />
      <path d="M7.4 9.4 10 6.6l2.6 2.8" />
      <path d="M6.4 12.8h7.2" />
    </svg>
  );
}

export function BulbIcon({ className = "", size = 14 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M7.2 12.4a4.4 4.4 0 1 1 5.6 0c-.6.5-.8 1-.8 1.8H8c0-.8-.2-1.3-.8-1.8Z" />
      <path d="M8.4 16.4h3.2" />
    </svg>
  );
}

export function ArrowRightIcon({ className = "", size = 14 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M3.6 10h12.8M11.6 5.4 16.4 10l-4.8 4.6" />
    </svg>
  );
}

export function CircleIcon({ className = "", size = 14 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="10" cy="10" r="6.4" />
    </svg>
  );
}

export function ChevronRightIcon({ className = "", size = 14 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="m8 5 5 5-5 5" />
    </svg>
  );
}
