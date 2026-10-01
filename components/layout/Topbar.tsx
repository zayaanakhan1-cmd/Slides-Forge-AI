"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS } from "./nav";

export function Topbar() {
  const pathname = usePathname();
  const current =
    NAV_ITEMS.find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    ) ?? NAV_ITEMS[0];

  return (
    <header
      className="flex shrink-0 items-center justify-between gap-4 border-b px-5"
      style={{ height: "var(--sf-topbar-height)", borderColor: "var(--sf-border)" }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="truncate text-[12.5px] font-medium">{current.label}</span>
        <span className="hidden text-[11px] text-[var(--sf-text-subtle)] sm:inline">
          {current.description}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="sf-kbd hidden sm:inline-flex">⌘K</span>
        <Link
          href="/create"
          className="rounded-[var(--sf-radius-sm)] border px-3 py-1.5 text-[12px] font-medium text-[var(--sf-text)] transition-colors hover:bg-[var(--sf-surface-hover)]"
          style={{ borderColor: "var(--sf-border-strong)" }}
        >
          New presentation
        </Link>
      </div>
    </header>
  );
}
