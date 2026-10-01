/**
 * Navigation configuration for the workspace shell.
 *
 * Kept in one place so the sidebar, the top bar and the command palette all
 * agree on the same sections and labels.
 */

import type { ShellSection } from "@/lib/store/shell-store";

export interface NavItem {
  section: ShellSection;
  label: string;
  href: string;
  /** Short description shown in the command palette. */
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    section: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    description: "Overview of your workspace",
  },
  {
    section: "create",
    label: "Create",
    href: "/create",
    description: "Start a new AI-assisted presentation",
  },
  {
    section: "presentations",
    label: "Presentations",
    href: "/presentations",
    description: "Browse and manage your presentations",
  },
  {
    section: "templates",
    label: "Templates",
    href: "/templates",
    description: "Reusable narrative and design templates",
  },
  {
    section: "assets",
    label: "Assets",
    href: "/assets",
    description: "Images, diagrams and media used across decks",
  },
  {
    section: "settings",
    label: "Settings",
    href: "/settings",
    description: "Workspace, providers and destinations",
  },
];
