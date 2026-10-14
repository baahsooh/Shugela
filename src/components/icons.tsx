import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function DropletIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.2s6 6.1 6 10.1a6 6 0 1 1-12 0c0-4 6-10.1 6-10.1Z" />
      <path d="M9.2 14.2a2.9 2.9 0 0 0 2.4 2.6" />
    </Icon>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 10.6 12 4l8.5 6.6" />
      <path d="M5.6 12v6.2a1.2 1.2 0 0 0 1.2 1.2h10.4a1.2 1.2 0 0 0 1.2-1.2V12" />
      <path d="M10 19.4v-4.2h4v4.2" />
    </Icon>
  );
}

export function HistoryIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.6 12a8.4 8.4 0 1 0 2.5-6" />
      <path d="M3.4 4.6V9h4.4" />
      <path d="M12 8v4.4l2.8 1.6" />
    </Icon>
  );
}

export function TrendsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 19.5h17" />
      <path d="M4.5 15.5 9 11l3.2 3.2L19.5 7" />
      <path d="M15.6 7h3.9v3.9" />
    </Icon>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M19.4 14.2a1.6 1.6 0 0 0 .32 1.76l.06.06a1.9 1.9 0 1 1-2.7 2.7l-.05-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-.97 1.47V20a1.9 1.9 0 1 1-3.8 0v-.1a1.6 1.6 0 0 0-1.05-1.46 1.6 1.6 0 0 0-1.76.32l-.06.06a1.9 1.9 0 1 1-2.7-2.7l.06-.06a1.6 1.6 0 0 0 .32-1.76 1.6 1.6 0 0 0-1.47-.98H4a1.9 1.9 0 1 1 0-3.8h.1a1.6 1.6 0 0 0 1.46-1.05 1.6 1.6 0 0 0-.32-1.76l-.06-.06a1.9 1.9 0 1 1 2.7-2.7l.06.06a1.6 1.6 0 0 0 1.76.32H9.8a1.6 1.6 0 0 0 .97-1.47V4a1.9 1.9 0 1 1 3.8 0v.1a1.6 1.6 0 0 0 .97 1.47 1.6 1.6 0 0 0 1.77-.32l.05-.06a1.9 1.9 0 1 1 2.7 2.7l-.06.06a1.6 1.6 0 0 0-.32 1.76v.09a1.6 1.6 0 0 0 1.47.97H20a1.9 1.9 0 1 1 0 3.8h-.1a1.6 1.6 0 0 0-1.47.97Z" />
    </Icon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5.5v13M5.5 12h13" />
    </Icon>
  );
}

export function MinusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5.5 12h13" />
    </Icon>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14.8 5.5 8.3 12l6.5 6.5" />
    </Icon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12.8 9.6 17.4 19 7" />
    </Icon>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.8 6.8h14.4" />
      <path d="M9.4 6.8V5.2a1 1 0 0 1 1-1h3.2a1 1 0 0 1 1 1v1.6" />
      <path d="M6.6 6.8 7.4 19a1.2 1.2 0 0 0 1.2 1.1h6.8a1.2 1.2 0 0 0 1.2-1.1l.8-12.2" />
      <path d="M10.6 10.4v6M13.4 10.4v6" />
    </Icon>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v1.8M12 19.2V21M3 12h1.8M19.2 12H21M5.6 5.6l1.3 1.3M17.1 17.1l1.3 1.3M18.4 5.6l-1.3 1.3M6.9 17.1l-1.3 1.3" />
    </Icon>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 13.4A8.2 8.2 0 0 1 10.6 4a8.4 8.4 0 1 0 9.4 9.4Z" />
    </Icon>
  );
}

export function SystemIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.2" y="4.6" width="17.6" height="11.6" rx="1.8" />
      <path d="M9 19.8h6M12 16.6v3.2" />
    </Icon>
  );
}

export function WifiOffIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 4.5 20.5 20.5" />
      <path d="M5.3 10.2a11 11 0 0 1 3.3-1.9M2.2 7a15.6 15.6 0 0 1 4.1-2.4M15.6 8.9a11 11 0 0 1 3.1 1.6M18.6 6.6a15.6 15.6 0 0 1 3.2 2.1" />
      <path d="M8.7 13.7a6.4 6.4 0 0 1 6.6-.3M12 18.4h.01" />
    </Icon>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 4v10.4" />
      <path d="M8.2 11l3.8 3.8 3.8-3.8" />
      <path d="M4.8 17.6v1.2a1.4 1.4 0 0 0 1.4 1.4h11.6a1.4 1.4 0 0 0 1.4-1.4v-1.2" />
    </Icon>
  );
}

export function UploadIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 19.2V8.8" />
      <path d="M8.2 12.6 12 8.8l3.8 3.8" />
      <path d="M4.8 6.4V5.2a1.4 1.4 0 0 1 1.4-1.4h11.6a1.4 1.4 0 0 1 1.4 1.4v1.2" />
    </Icon>
  );
}

export function SparkleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 4.2 13.6 9l4.8 1.6-4.8 1.6L12 17l-1.6-4.8L5.6 10.6 10.4 9Z" />
      <path d="M18.4 4.2v2.6M20.5 6.7h-2.6" />
    </Icon>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.6" y="5.4" width="16.8" height="15" rx="2.2" />
      <path d="M3.6 10h16.8M8.4 3.4v3.4M15.6 3.4v3.4" />
    </Icon>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 7.4V12l3 1.8" />
    </Icon>
  );
}

export function TrendUpIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 16.4 9.4 11l3.2 3.2L20 6.8" />
      <path d="M15.6 6.8H20v4.4" />
    </Icon>
  );
}

export function TrendDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7.6 9.4 13l3.2-3.2L20 17.2" />
      <path d="M15.6 17.2H20v-4.4" />
    </Icon>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.6 19 6v6c0 4-2.9 7.1-7 8.4-4.1-1.3-7-4.4-7-8.4V6Z" />
      <path d="M9.4 12.2 11.2 14l3.6-3.8" />
    </Icon>
  );
}

export function CloudIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 18.5a4 4 0 0 1-.4-8A5.5 5.5 0 0 1 17.4 10a3.8 3.8 0 0 1 .6 7.5" />
      <path d="M12 12.5v5.5M9.8 14.6 12 12.4l2.2 2.2" />
    </Icon>
  );
}

export function SignOutIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14.4 4.6H17a1.6 1.6 0 0 1 1.6 1.6v11.6A1.6 1.6 0 0 1 17 19.4h-2.6" />
      <path d="M10.4 8.4 6.8 12l3.6 3.6" />
      <path d="M6.8 12H15" />
    </Icon>
  );
}

/** Magnifier — search. */
export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="10.8" cy="10.8" r="6.4" />
      <path d="m15.6 15.6 4 4" />
    </Icon>
  );
}

/** A capsule — medication. */
export function PillIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8.2 4.9 4.9 8.2a4.7 4.7 0 0 0 6.6 6.6l3.3-3.3a4.7 4.7 0 0 0-6.6-6.6Z" />
      <path d="M7 13.4 13.4 7" />
      <path d="M16.4 12.6h4.2M18.5 10.5v4.2" />
    </Icon>
  );
}

/** A plate and cutlery — a meal. */
export function MealIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="11.4" cy="11.4" r="6.9" />
      <circle cx="11.4" cy="11.4" r="3.1" />
      <path d="M17.6 5.2v5.2M20.2 5.2v5.2M17.6 8.4h2.6M17.6 10.4V19" />
    </Icon>
  );
}

/** Calendar with a tick — adherence history. */
export function CalendarCheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.6" y="5.4" width="16.8" height="15" rx="2.2" />
      <path d="M3.6 10h16.8M8.4 3.4v3.4M15.6 3.4v3.4" />
      <path d="M8.8 15.2 11 17.4l4-4.2" />
    </Icon>
  );
}