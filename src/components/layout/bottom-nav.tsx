"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { HistoryIcon, HomeIcon, MealIcon, PillIcon, PlusIcon, TrendsIcon, SettingsIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  Icon: (props: { className?: string }) => React.JSX.Element;
  primary?: boolean;
}

const ITEMS: NavItem[] = [
  { href: "/", label: "Home", Icon: HomeIcon },
  { href: "/history", label: "History", Icon: HistoryIcon },
  { href: "/log", label: "Log", Icon: PlusIcon, primary: true },
  { href: "/trends", label: "Trends", Icon: TrendsIcon },
  { href: "/settings", label: "Settings", Icon: SettingsIcon },
];

const SHEET_OPTIONS = [
  {
    href: "/log",
    title: "Glucose reading",
    description: "Type the number from your meter",
    Icon: PlusIcon,
    active: (path: string) => path === "/log" || path.startsWith("/readings/"),
  },
  {
    href: "/pills",
    title: "Pill",
    description: "Tick off today's medication",
    Icon: PillIcon,
    active: (path: string) => path === "/pills",
  },
  {
    href: "/log/meal",
    title: "Meal",
    description: "What you ate, and the carbs",
    Icon: MealIcon,
    active: (path: string) => path === "/log/meal" || path === "/meals",
  },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.href === "/") return pathname === "/";
  if (item.primary) return SHEET_OPTIONS[0].active(pathname);
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function BottomNav() {
  const pathname = usePathname() ?? "/";
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = sheetRef.current;
    if (!dialog) return;
    if (sheetOpen && !dialog.open) dialog.showModal();
    else if (!sheetOpen && dialog.open) dialog.close();
  }, [sheetOpen]);

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg-elevated/95 shadow-nav backdrop-blur-xl"
      >
        <div className="px-safe pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5">
          <ul className="mx-auto flex max-w-md items-end justify-between">
            {ITEMS.map((item) => {
              const active = isActive(pathname, item);
              const { Icon } = item;

              if (item.primary) {
                return (
                  <li key={item.href} className="flex flex-1 justify-center">
                    <button
                      type="button"
                      onClick={() => setSheetOpen(true)}
                      aria-label="Add a glucose reading, pill or meal"
                      aria-haspopup="dialog"
                      className="-mt-7 flex flex-col items-center"
                    >
                      <span className="flex size-14 items-center justify-center rounded-full border-4 border-bg-elevated bg-brand text-brand-contrast shadow-lg transition-transform duration-150 active:scale-95">
                        <Icon className="size-7" />
                      </span>
                    </button>
                  </li>
                );
              }

              return (
                <li key={item.href} className="flex-1">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[0.65rem] font-semibold transition-colors",
                      active ? "text-brand" : "text-ink-faint",
                    )}
                  >
                    <Icon className="size-[1.35rem]" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      <dialog
        ref={sheetRef}
        onCancel={(event) => {
          event.preventDefault();
          setSheetOpen(false);
        }}
        onClick={(event) => {
          if (event.target === sheetRef.current) setSheetOpen(false);
        }}
        className="mb-0 mt-auto w-full max-w-md self-end rounded-t-3xl border-0 bg-bg-elevated p-0 text-ink backdrop:bg-black/50 sm:mb-0"
      >
        <div className="open:animate-sheet p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line-strong" />

          <p className="px-1 pb-1 text-xs font-semibold uppercase tracking-wider text-ink-faint">
            What are you logging?
          </p>

          <div className="flex flex-col gap-2">
            {SHEET_OPTIONS.map((option) => {
              const active = option.active(pathname);
              return (
                <Link
                  key={option.href}
                  href={option.href}
                  onClick={() => setSheetOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border p-3.5 transition-colors active:bg-surface-muted",
                    active ? "border-brand bg-brand-soft" : "border-line bg-surface",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-2xl",
                      active ? "bg-surface text-brand" : "bg-surface-muted text-ink-soft",
                    )}
                  >
                    <option.Icon className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink">{option.title}</span>
                    <span className="block truncate text-xs text-ink-faint">{option.description}</span>
                  </span>
                </Link>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setSheetOpen(false)}
            className="mt-3 h-11 w-full rounded-2xl text-sm font-semibold text-ink-faint active:bg-surface-muted"
          >
            Cancel
          </button>
        </div>
      </dialog>
    </>
  );
}