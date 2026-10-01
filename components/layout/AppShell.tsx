/**
 * Workspace shell.
 *
 * The single application chrome shared by every route: sidebar, top bar, command
 * palette and a scrollable content region. Routes render inside `children`.
 */

import type { ReactNode } from "react";

import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { CommandPalette } from "./CommandPalette";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-5 py-7 md:px-8 md:py-9">{children}</div>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
