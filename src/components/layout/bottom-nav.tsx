"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { HistoryIcon, HomeIcon, PlusIcon, SettingsIcon, TrendsIcon } from "@/components/icons";
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

function isActive(pathname: string, item: NavItem): boolean {
  if (item.href === "/") return pathname === "/";
  if (item.primary) return pathname === "/log" || pathname.startsWith("/readings/");
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function BottomNav() {
  const pathname = usePathname() ?? "/";

  return (
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
                  <Link
                    href={item.href}
                    aria-label="Add a reading"
                    aria-current={active ? "page" : undefined}
                    className="-mt-7 flex flex-col items-center"
                  >
                    <span
                      className={cn(
                        "flex size-14 items-center justify-center rounded-full border-4 border-bg-elevated shadow-lg transition-transform duration-150 active:scale-95",
                        active ? "bg-brand text-brand-contrast" : "bg-brand text-brand-contrast",
                      )}
                    >
                      <Icon className="size-7" />
                    </span>
                  </Link>
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
  );
}