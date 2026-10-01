/**
 * Theme model.
 *
 * A theme is presentation-wide design intent: colour tokens, typography,
 * spacing and a slide aspect ratio. Themes never contain content. Renderers
 * (web, PowerPoint, Google Slides, PDF) translate the same theme into their
 * own native styling.
 */

import type { JsonObject } from "./json";

/** Aspect ratios the product supports today, plus room for custom ones. */
export type AspectRatio = "16:9" | "4:3" | "1:1" | "9:16";

export interface ThemeColors {
  /** Page/background colour as a CSS-compatible hex string, e.g. "#0B0D12". */
  background: string;
  /** Primary surface colour used for cards and panels. */
  surface: string;
  /** Primary text colour. */
  text: string;
  /** Muted/secondary text colour. */
  textMuted: string;
  /** Primary accent colour. */
  accent: string;
  /** Secondary accent colour, used sparingly. */
  accentSecondary: string;
  /** Hairline border colour. */
  border: string;
}

export interface TypeScale {
  /** Font size in points for the slide title. */
  title: number;
  /** Font size in points for slide headings. */
  heading: number;
  /** Font size in points for body copy. */
  body: number;
  /** Font size in points for captions and labels. */
  caption: number;
}

export interface ThemeTypography {
  /** Font family used for headings. */
  headingFont: string;
  /** Font family used for body copy. */
  bodyFont: string;
  /** Font family used for code and data. */
  monoFont: string;
  /** Type scale in points. */
  scale: TypeScale;
}

export interface ThemeSpacing {
  /** Base spacing unit in points. */
  unit: number;
  /** Slide margin in points. */
  margin: number;
  /** Gap between stacked elements in points. */
  gap: number;
}

export interface Theme {
  id: string;
  name: string;
  /** Free-form description of the theme's intent. */
  description?: string;
  aspectRatio: AspectRatio;
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  /** Presentation-level default slide background, as a CSS-compatible value. */
  slideBackground: string;
  /** Whether the theme is dark. Renderers may use this for contrast decisions. */
  isDark: boolean;
  /** Forward-compatible design tokens not yet first-class in the model. */
  tokens?: JsonObject;
}
