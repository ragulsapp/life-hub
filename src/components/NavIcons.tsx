import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { active?: boolean };

function base(props: IconProps) {
  const { active, ...rest } = props;
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: active ? 2.2 : 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...rest,
  };
}

export function HomeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V19a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

export function HabitsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="4" width="7" height="7" rx="1.8" />
      <path d="m5.5 7.5 1.3 1.3L9 6.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.8" opacity="0.35" />
      <rect x="4" y="13" width="7" height="7" rx="1.8" opacity="0.35" />
      <path d="M14.5 16.5h5M14.5 18.5h3.2" opacity="0.35" />
    </svg>
  );
}

export function HealthIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 20.2s-7.2-4.4-9.4-9.1C1.2 8 2.6 4.8 5.7 4.1c2-.4 3.7.5 4.9 2.1a.5.5 0 0 0 .8 0c1.2-1.6 2.9-2.5 4.9-2.1 3.1.7 4.5 3.9 3.1 7-2.2 4.7-9.4 9.1-9.4 9.1Z" />
      <path d="M4.5 12h2.4l1.4-2.6 2 4.6 1.3-2.6h2.2" />
    </svg>
  );
}

export function FinanceIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="6.5" width="18" height="13" rx="2.2" />
      <path d="M3 10.5h18" />
      <path d="M16 15h2.5" />
      <path d="M7 3.5c1.6 1.3 3.3 2.4 5 3M17 3.5c-1.6 1.3-3.3 2.4-5 3" opacity="0.5" />
    </svg>
  );
}

export function NotesIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 3.5h9l4.5 4.5V19a1.3 1.3 0 0 1-1.3 1.3H6A1.3 1.3 0 0 1 4.7 19V4.8A1.3 1.3 0 0 1 6 3.5Z" />
      <path d="M14.5 3.5V8h4.5" opacity="0.5" />
      <path d="M8 12.5h8M8 15.7h5.5" />
    </svg>
  );
}

export function GoalsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.3" />
      <circle cx="12" cy="12" r="4.6" opacity="0.6" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function AlarmIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 9.5V13.5l2.5 1.6" />
      <path d="M4.5 4.5 7 6.5M19.5 4.5 17 6.5" opacity="0.7" />
    </svg>
  );
}
