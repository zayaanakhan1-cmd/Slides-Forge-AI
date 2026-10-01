/**
 * Command palette.
 *
 * Navigation-only for Phase 1. It lists real routes and states plainly that
 * generation commands are not available yet, rather than offering buttons that
 * do nothing.
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { useShellStore } from "@/lib/store/shell-store";
import { NAV_ITEMS } from "./nav";

export function CommandPalette() {
  const open = useShellStore((state) => state.commandPaletteOpen);
  const close = useShellStore((state) => state.closeCommandPalette);
  const toggle = useShellStore((state) => state.toggleCommandPalette);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        toggle();
      }
      if (event.key === "Escape" && open) {
        close();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, open, toggle]);

  if (!open) return null;

  const results = NAV_ITEMS.filter((item) =>
    `${item.label} ${item.description}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]"
      style={{ background: "rgba(4, 6, 10, 0.62)" }}
      onClick={close}
    >
      <div
        className="sf-panel-elevated w-full max-w-lg overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Jump to a section…"
          className="w-full border-b bg-transparent px-4 py-3 text-[13px] outline-none placeholder:text-[var(--sf-text-subtle)]"
          style={{ borderColor: "var(--sf-border)" }}
        />
        <ul className="max-h-72 overflow-y-auto p-2">
          {results.map((item) => (
            <li key={item.section}>
              <Link
                href={item.href}
                onClick={close}
                className="flex flex-col rounded-[var(--sf-radius-sm)] px-3 py-2 hover:bg-[var(--sf-surface-hover)]"
              >
                <span className="text-[12.5px] font-medium">{item.label}</span>
                <span className="text-[11px] text-[var(--sf-text-muted)]">
                  {item.description}
                </span>
              </Link>
            </li>
          ))}
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center text-[12px] text-[var(--sf-text-muted)]">
              No sections match “{query}”.
            </li>
          ) : null}
        </ul>
        <div
          className="flex items-center justify-between border-t px-4 py-2 text-[10.5px] text-[var(--sf-text-subtle)]"
          style={{ borderColor: "var(--sf-border)" }}
        >
          <span>Navigation only. Generation commands are planned.</span>
          <span className="sf-kbd">esc</span>
        </div>
      </div>
    </div>
  );
}
