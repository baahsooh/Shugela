import type { SVGProps } from "react";

import type { MeasurementIconKey } from "@/lib/types";

type IconProps = SVGProps<SVGSVGElement>;

function Glyph({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
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

/** Wake up — the sun. */
function SunGlyph(props: IconProps) {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
    </Glyph>
  );
}

/** Before breakfast — sun just above the horizon. */
function SunriseGlyph(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M7 17a5 5 0 0 1 10 0" />
      <path d="M3.5 17h17" />
      <path d="M12 7.5V5M5.6 10.2 4.4 9M18.4 10.2 19.6 9" />
    </Glyph>
  );
}

/** 2h after breakfast — a slice of toast. */
function ToastGlyph(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M4.8 11.6c0-2.2 1.7-3.6 4-3.6h6.4c2.3 0 4 1.4 4 3.6 0 2.6-1.8 4.4-4.4 4.4H9.2c-2.6 0-4.4-1.8-4.4-4.4Z" />
      <path d="M9.2 16v3.2M14.8 16v3.2" />
      <path d="M4.6 19.4h14.8" />
    </Glyph>
  );
}

/** Before lunch — a clock at midday. */
function NoonGlyph(props: IconProps) {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M12 7.2V12l3.4 2" />
    </Glyph>
  );
}

/** 2h after lunch — a bowl of food. */
function BowlGlyph(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M3.8 11.2h16.4a8.2 8.2 0 0 1-8.2 8 8.2 8.2 0 0 1-8.2-8Z" />
      <path d="M2.6 19.4h18.8" />
      <path d="M9.2 8.4c0-1.6 1.4-1.8 1.4-3.2M13 8.4c0-1.6 1.4-1.8 1.4-3.2" />
    </Glyph>
  );
}

/** Before supper — a clock in the evening. */
function EveningGlyph(props: IconProps) {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M12 12V7.4M12 12l-3.2 1.9" />
      <path d="M12 2.6v1.4M21.4 12H20M2.6 12h1.4" />
    </Glyph>
  );
}

/** 2h after supper — the moon, end of the day. */
function MoonGlyph(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M20 13.4A8.2 8.2 0 0 1 10.6 4a8.4 8.4 0 1 0 9.4 9.4Z" />
    </Glyph>
  );
}

const GLYPHS: Record<MeasurementIconKey, (props: IconProps) => React.JSX.Element> = {
  sun: SunGlyph,
  sunrise: SunriseGlyph,
  toast: ToastGlyph,
  noon: NoonGlyph,
  bowl: BowlGlyph,
  evening: EveningGlyph,
  moon: MoonGlyph,
};

/** Resolves a measurement type to its icon. Falls back to the sun. */
export function MeasurementIcon({
  icon,
  className,
}: {
  icon: MeasurementIconKey;
  className?: string;
}) {
  const GlyphComponent = GLYPHS[icon] ?? SunGlyph;
  return <GlyphComponent className={className} />;
}