/**
 * Slide and element model.
 *
 * A slide is a titled, positioned collection of elements plus the narrative
 * role it plays in the deck. Every element is a discriminated union member
 * keyed on `type`, which lets renderers exhaustively switch on the element
 * kind and lets the model stay extensible without `any`.
 */

import type { JsonObject, JsonValue } from "./json";
import type {
  EdgeInsets,
  HorizontalAlignment,
  Position,
  Rect,
  Rotation,
  Size,
  VerticalAlignment,
} from "./geometry";

/** The narrative function a slide serves inside the overall story. */
export type NarrativeRole =
  | "title"
  | "agenda"
  | "introduction"
  | "context"
  | "concept"
  | "example"
  | "evidence"
  | "comparison"
  | "process"
  | "activity"
  | "summary"
  | "conclusion"
  | "references"
  | "custom";

/** Semantic slide layouts. A layout is a hint, not a hard constraint. */
export type SlideLayout =
  | "title"
  | "section"
  | "title-and-content"
  | "two-column"
  | "image-left"
  | "image-right"
  | "full-bleed-image"
  | "quote"
  | "comparison"
  | "timeline"
  | "data"
  | "diagram"
  | "blank"
  | "custom";

export interface SlideDimensions {
  width: number;
  height: number;
}

/** Fields shared by every element, regardless of kind. */
export interface BaseElement {
  id: string;
  /** Normalized position on the slide canvas. */
  position: Position;
  /** Normalized size on the slide canvas. */
  size: Size;
  /** Stacking order; higher values render on top. */
  zIndex: number;
  rotation?: Rotation;
  /** Whether the element is visible. Hidden elements are preserved, not deleted. */
  visible?: boolean;
  /** Element opacity in the range 0..1. */
  opacity?: number;
  /** Human-readable label used by the editor layer tree. */
  name?: string;
  /** Non-rendering metadata for tooling, AI provenance and future features. */
  metadata?: JsonObject;
}

/** A run of styled text inside a text element. */
export interface TextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  /** Font size in points; falls back to the theme scale when omitted. */
  fontSize?: number;
  /** Semantic style hint resolved against the theme type scale. */
  style?: "title" | "heading" | "body" | "caption";
}

export interface TextElement extends BaseElement {
  type: "text";
  runs: TextRun[];
  align?: HorizontalAlignment;
  verticalAlign?: VerticalAlignment;
  lineHeight?: number;
  letterSpacing?: number;
  /** When true the text is treated as a bulleted list. */
  bullets?: boolean;
}

export interface ImageElement extends BaseElement {
  type: "image";
  /** Asset reference; resolves against the asset store or a remote URL. */
  src: string;
  alt: string;
  /** Crop rectangle in normalized source-image space, when the image is cropped. */
  crop?: Rect;
  fit?: "cover" | "contain" | "fill";
  caption?: string;
}

export type ShapeKind =
  | "rectangle"
  | "rounded-rectangle"
  | "ellipse"
  | "triangle"
  | "line"
  | "arrow"
  | "divider";

export interface ShapeElement extends BaseElement {
  type: "shape";
  shape: ShapeKind;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  /** Text rendered inside the shape, when present. */
  text?: TextRun[];
}

export type ChartKind = "bar" | "line" | "pie" | "area" | "scatter" | "radar";

export interface ChartSeries {
  name: string;
  values: number[];
  color?: string;
}

export interface ChartElement extends BaseElement {
  type: "chart";
  chart: ChartKind;
  title?: string;
  categories: string[];
  series: ChartSeries[];
  legend?: boolean;
  /** Source note rendered under the chart, e.g. a data citation. */
  source?: string;
}

export interface DiagramNode {
  id: string;
  label: string;
  position: Position;
  size: Size;
}

export interface DiagramEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  directed?: boolean;
}

export interface DiagramElement extends BaseElement {
  type: "diagram";
  diagram: "flowchart" | "mindmap" | "hierarchy" | "cycle" | "timeline";
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  title?: string;
}

export interface VideoElement extends BaseElement {
  type: "video";
  /** Video asset reference or remote URL. */
  src: string;
  poster?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  caption?: string;
}

export interface ButtonAction {
  /** What the button should do when activated. */
  kind: "link" | "next-slide" | "previous-slide" | "goto-slide" | "none";
  /** Target URL for `link` actions. */
  href?: string;
  /** Target slide index for `goto-slide` actions. */
  slideIndex?: number;
}

export interface ButtonElement extends BaseElement {
  type: "button";
  label: string;
  action: ButtonAction;
  variant?: "primary" | "secondary" | "ghost";
}

/**
 * A group element holds child elements. Children are positioned relative to
 * the group's own position and size, which keeps transforms composable.
 */
export interface GroupElement extends BaseElement {
  type: "group";
  children: SlideElement[];
  /** Padding applied inside the group bounds, in points. */
  padding?: EdgeInsets;
}

/**
 * Discriminated union of every element kind.
 *
 * Renderers switch on `element.type`; adding a new kind here forces every
 * exhaustive consumer to handle it, which is exactly what we want.
 */
export type SlideElement =
  | TextElement
  | ImageElement
  | ShapeElement
  | ChartElement
  | DiagramElement
  | VideoElement
  | ButtonElement
  | GroupElement;

export type SlideElementType = SlideElement["type"];

export interface SpeakerNotes {
  /** The narration the presenter should read or paraphrase. */
  text: string;
  /** Short cues shown in the presenter view. */
  cues?: string[];
  /** Estimated speaking time in seconds. */
  durationSeconds?: number;
}

export interface SlideMetadata {
  /** Canonical slide dimensions in points, derived from the theme aspect ratio. */
  dimensions?: SlideDimensions;
  /** Where the slide's content came from, for AI provenance and auditing. */
  source?: "user" | "ai" | "template" | "import";
  /** Version of the model the slide was authored against. */
  schemaVersion?: string;
  /** Whether the slide should be skipped during presentation. */
  hidden?: boolean;
  /** Free-form tags used for search and organisation. */
  tags?: string[];
  /** Forward-compatible metadata that is not yet first-class. */
  extra?: JsonObject;
}

export interface Slide {
  id: string;
  title: string;
  narrativeRole: NarrativeRole;
  layout: SlideLayout;
  elements: SlideElement[];
  speakerNotes: SpeakerNotes;
  metadata: SlideMetadata;
}

/** Convenience helper: the set of slide indices, used by reorder utilities. */
export type SlideIndex = number;

/** A JSON-serializable value used inside element metadata. */
export type ElementMetadataValue = JsonValue;
