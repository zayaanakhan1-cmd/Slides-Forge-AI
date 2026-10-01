/**
 * Geometry primitives shared by every element in the presentation model.
 *
 * All spatial values are expressed in a normalized 0..1 coordinate space
 * relative to the slide canvas. Keeping geometry normalized means the same
 * model can be rendered to web, PowerPoint, Google Slides and PDF without the
 * model itself knowing anything about a specific canvas size.
 */

export interface Position {
  /** Horizontal offset from the left edge, normalized to the slide width (0..1). */
  x: number;
  /** Vertical offset from the top edge, normalized to the slide height (0..1). */
  y: number;
}

export interface Size {
  /** Width as a fraction of the slide width (0..1). */
  width: number;
  /** Height as a fraction of the slide height (0..1). */
  height: number;
}

export interface Rect extends Position, Size {}

export interface EdgeInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type HorizontalAlignment = "left" | "center" | "right";
export type VerticalAlignment = "top" | "middle" | "bottom";
export type Rotation = number;
