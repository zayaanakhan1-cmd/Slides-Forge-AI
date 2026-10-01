/**
 * Default values for the canonical presentation model.
 *
 * Defaults live in one place so factories, the editor and the AI orchestrator
 * all agree on what a "blank" presentation looks like. The default theme is a
 * dark, restrained workspace theme rather than a bright education template.
 */

import type { Theme, ThemeColors, ThemeTypography, TypeScale } from "@/types/theme";
import type { Slide, SlideMetadata, SpeakerNotes } from "@/types/slide";
import { PRESENTATION_SCHEMA_VERSION } from "@/types/presentation";
import type { PresentationMetadata } from "@/types/presentation";

export const DEFAULT_THEME_COLORS: ThemeColors = {
  background: "#0B0D12",
  surface: "#14171F",
  text: "#F4F6FB",
  textMuted: "#9AA3B2",
  accent: "#6D8BFF",
  accentSecondary: "#A78BFA",
  border: "#232838",
};

export const DEFAULT_TYPE_SCALE: TypeScale = {
  title: 40,
  heading: 28,
  body: 18,
  caption: 13,
};

export const DEFAULT_TYPOGRAPHY: ThemeTypography = {
  headingFont: "var(--font-sans)",
  bodyFont: "var(--font-sans)",
  monoFont: "var(--font-mono)",
  scale: DEFAULT_TYPE_SCALE,
};

export const DEFAULT_THEME: Theme = {
  id: "workspace-dark",
  name: "Workspace Dark",
  description: "Deep charcoal workspace with restrained blue and violet accents.",
  aspectRatio: "16:9",
  colors: DEFAULT_THEME_COLORS,
  typography: DEFAULT_TYPOGRAPHY,
  spacing: { unit: 8, margin: 48, gap: 16 },
  slideBackground: DEFAULT_THEME_COLORS.background,
  isDark: true,
};

export const DEFAULT_SPEAKER_NOTES: SpeakerNotes = {
  text: "",
  cues: [],
};

export const DEFAULT_SLIDE_METADATA: SlideMetadata = {
  source: "user",
  schemaVersion: PRESENTATION_SCHEMA_VERSION,
  hidden: false,
  tags: [],
};

export const DEFAULT_PRESENTATION_METADATA: PresentationMetadata = {
  schemaVersion: PRESENTATION_SCHEMA_VERSION,
};

/** Canonical slide dimensions in points for each supported aspect ratio. */
export const ASPECT_RATIO_DIMENSIONS: Record<Theme["aspectRatio"], { width: number; height: number }> = {
  "16:9": { width: 960, height: 540 },
  "4:3": { width: 960, height: 720 },
  "1:1": { width: 720, height: 720 },
  "9:16": { width: 540, height: 960 },
};

/** Resolve slide dimensions in points for a theme's aspect ratio. */
export function dimensionsForAspectRatio(
  aspectRatio: Theme["aspectRatio"],
): { width: number; height: number } {
  return ASPECT_RATIO_DIMENSIONS[aspectRatio];
}

/** Return a fresh slide with no elements. */
export function emptySlide(): Slide {
  return {
    id: "",
    title: "",
    narrativeRole: "custom",
    layout: "blank",
    elements: [],
    speakerNotes: { ...DEFAULT_SPEAKER_NOTES },
    metadata: { ...DEFAULT_SLIDE_METADATA },
  };
}
