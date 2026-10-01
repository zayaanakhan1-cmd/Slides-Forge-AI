/**
 * UI shell store.
 *
 * This store intentionally holds *shell* state only: which navigation section is
 * active and whether the command palette is open. It does not hold presentation
 * data. Presentation state will live in a dedicated store once the editor is
 * built, backed by the canonical model in `types/` and `lib/presentation/`.
 */

import { create } from "zustand";

export type ShellSection =
  | "dashboard"
  | "create"
  | "presentations"
  | "templates"
  | "assets"
  | "settings";

interface ShellState {
  /** The section highlighted in the sidebar. */
  activeSection: ShellSection;
  /** Whether the command palette overlay is open. */
  commandPaletteOpen: boolean;
  setActiveSection: (section: ShellSection) => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
}

export const useShellStore = create<ShellState>((set) => ({
  activeSection: "dashboard",
  commandPaletteOpen: false,
  setActiveSection: (section) => set({ activeSection: section }),
  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),
  toggleCommandPalette: () =>
    set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
}));
