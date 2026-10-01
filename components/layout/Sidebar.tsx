"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/brand/Logo";
import { NAV_ITEMS } from "./nav";
import { cn } from "@/lib/utils/helpers";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="hidden shrink-0 flex-col border-r md:flex"
      style={{
        width: "var(--sf-sidebar-width)",
        borderColor: "var(--sf-border)",
        background: "var(--sf-bg-elevated)",
      }}
    >
      <div
        className="flex items-center border-b px-4"
        style={{ height: "var(--sf-topbar-height)", borderColor: "var(--sf-border)" }}
      >
        <Link href="/" className="rounded-[var(--sf-radius-sm)]">
          <Logo />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <p className="px-2 pb-2 text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--sf-text-subtle)]">
          Workspace
        </p>
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.section}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-[var(--sf-radius-sm)] px-2.5 py-2 text-[12.5px] transition-colors",
                    active
                      ? "bg-[var(--sf-accent-soft)] text-[var(--sf-text)]"
                      : "text-[var(--sf-text-muted)] hover:bg-[var(--sf-surface-hover)] hover:text-[var(--sf-text)]",
                  )}
                >
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      background: active ? "var(--sf-accent)" : "var(--sf-border-strong)",
                    }}
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div
        className="border-t px-4 py-3 text-[10.5px] leading-relaxed text-[var(--sf-text-subtle)]"
        style={{ borderColor: "var(--sf-border)" }}
      >
        <p className="font-medium text-[var(--sf-text-muted)]">Phase 1 foundation</p>
        <p className="mt-0.5">Model, shell and architecture. Generators are planned.</p>
      </div>
    </aside>
  );
}
