import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "subtle" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand text-brand-contrast shadow-sm active:bg-brand-hover disabled:bg-brand/40",
  secondary:
    "bg-surface text-ink border border-line-strong active:bg-surface-muted disabled:opacity-50",
  subtle: "bg-surface-muted text-ink-soft active:bg-surface-sunken disabled:opacity-50",
  danger: "bg-danger-soft text-danger active:bg-danger/20 disabled:opacity-50",
  ghost: "text-ink-soft active:bg-surface-muted disabled:opacity-50",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-sm rounded-xl gap-1.5",
  md: "h-11 px-4 text-[0.95rem] rounded-2xl gap-2",
  lg: "h-14 px-5 text-base rounded-2xl gap-2",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  children?: ReactNode;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  fullWidth,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex select-none items-center justify-center font-semibold transition-colors duration-150",
        "disabled:cursor-not-allowed disabled:opacity-60",
        VARIANTS[variant],
        SIZES[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    />
  );
}