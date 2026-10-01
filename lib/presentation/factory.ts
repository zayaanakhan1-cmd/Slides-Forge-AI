/**
 * Factories for the canonical presentation model.
 *
 * Every factory fills in defaults so callers never have to construct a partial
 * object by hand. Factories are pure: they take inputs, mint IDs and return new
 * objects. They are the recommended way for the editor and the AI orchestrator
 * to build model data.
 */

import { createId } from "@/lib/utils/id";
import { nowIso } from "@/lib/utils/helpers";
import type {
  ChartElement,
  ChartKind,
  DiagramElement,
  GroupElement,
  ImageElement,
  NarrativeRole,
  ShapeElement,
  ShapeKind,
  Slide,
  SlideElement,
  SlideLayout,
  TextElement,
  TextRun,
  VideoElement,
  ButtonElement,
} from "@/types/slide";
import type { Position, Size } from "@/types/geometry";
import type {
  Presentation,
  PresentationAudience,
  PresentationInput,
  PresentationPurpose,
  PresentationSubject,
  PresentationSummary,
} from "@/types/presentation";
import type { Theme } from "@/types/theme";
import { PRESENTATION_SCHEMA_VERSION } from "@/types/presentation";
import {
  DEFAULT_PRESENTATION_METADATA,
  DEFAULT_SLIDE_METADATA,
  DEFAULT_SPEAKER_NOTES,
  DEFAULT_THEME,
  dimensionsForAspectRatio,
} from "./defaults";

const DEFAULT_POSITION: Position = { x: 0.1, y: 0.15 };
const DEFAULT_SIZE: Size = { width: 0.8, height: 0.7 };

function baseElementDefaults(
  position: Position = DEFAULT_POSITION,
  size: Size = DEFAULT_SIZE,
  zIndex = 0,
) {
  return {
    id: createId("el"),
    position: { ...position },
    size: { ...size },
    zIndex,
  };
}

export function createTextElement(
  runs: TextRun[],
  overrides: Partial<Omit<TextElement, "type" | "runs">> = {},
): TextElement {
  const { position, size, zIndex, ...rest } = overrides;
  return {
    ...baseElementDefaults(position, size, zIndex),
    type: "text",
    runs,
    ...rest,
  };
}

export function createImageElement(
  src: string,
  alt: string,
  overrides: Partial<Omit<ImageElement, "type" | "src" | "alt">> = {},
): ImageElement {
  const { position, size, zIndex, ...rest } = overrides;
  return {
    ...baseElementDefaults(position, size, zIndex),
    type: "image",
    src,
    alt,
    ...rest,
  };
}

export function createShapeElement(
  shape: ShapeKind,
  overrides: Partial<Omit<ShapeElement, "type" | "shape">> = {},
): ShapeElement {
  const { position, size, zIndex, ...rest } = overrides;
  return {
    ...baseElementDefaults(position, size, zIndex),
    type: "shape",
    shape,
    ...rest,
  };
}

export function createChartElement(
  chart: ChartKind,
  categories: string[],
  overrides: Partial<Omit<ChartElement, "type" | "chart" | "categories">> = {},
): ChartElement {
  const { position, size, zIndex, ...rest } = overrides;
  return {
    ...baseElementDefaults(position, size, zIndex),
    type: "chart",
    chart,
    categories,
    series: [],
    ...rest,
  };
}

export function createDiagramElement(
  diagram: DiagramElement["diagram"],
  overrides: Partial<Omit<DiagramElement, "type" | "diagram">> = {},
): DiagramElement {
  const { position, size, zIndex, ...rest } = overrides;
  return {
    ...baseElementDefaults(position, size, zIndex),
    type: "diagram",
    diagram,
    nodes: [],
    edges: [],
    ...rest,
  };
}

export function createVideoElement(
  src: string,
  overrides: Partial<Omit<VideoElement, "type" | "src">> = {},
): VideoElement {
  const { position, size, zIndex, ...rest } = overrides;
  return {
    ...baseElementDefaults(position, size, zIndex),
    type: "video",
    src,
    controls: true,
    ...rest,
  };
}

export function createButtonElement(
  label: string,
  overrides: Partial<Omit<ButtonElement, "type" | "label">> = {},
): ButtonElement {
  const { position, size, zIndex, ...rest } = overrides;
  return {
    ...baseElementDefaults(position, size, zIndex),
    type: "button",
    label,
    action: { kind: "none" },
    ...rest,
  };
}

export function createGroupElement(
  children: SlideElement[] = [],
  overrides: Partial<Omit<GroupElement, "type" | "children">> = {},
): GroupElement {
  const { position, size, zIndex, ...rest } = overrides;
  return {
    ...baseElementDefaults(position, size, zIndex),
    type: "group",
    children,
    ...rest,
  };
}

export interface SlideInit {
  title?: string;
  narrativeRole?: NarrativeRole;
  layout?: SlideLayout;
  elements?: SlideElement[];
  theme?: Theme;
}

export function createSlide(init: SlideInit = {}): Slide {
  const theme = init.theme ?? DEFAULT_THEME;
  const dimensions = dimensionsForAspectRatio(theme.aspectRatio);
  return {
    id: createId("slide"),
    title: init.title ?? "",
    narrativeRole: init.narrativeRole ?? "custom",
    layout: init.layout ?? "blank",
    elements: init.elements ?? [],
    speakerNotes: { ...DEFAULT_SPEAKER_NOTES },
    metadata: {
      ...DEFAULT_SLIDE_METADATA,
      dimensions,
      schemaVersion: PRESENTATION_SCHEMA_VERSION,
    },
  };
}

export interface PresentationInit extends PresentationInput {
  theme?: Theme;
  slides?: Slide[];
  audience?: PresentationAudience;
  purpose?: PresentationPurpose;
  subject?: PresentationSubject;
}

/**
 * Create a complete, valid Presentation from minimal input.
 *
 * `title` is the only required field; everything else is defaulted so a new
 * presentation is always valid against `presentationSchema`.
 */
export function createPresentation(init: PresentationInit): Presentation {
  const theme = init.theme ?? DEFAULT_THEME;
  const timestamp = nowIso();
  return {
    id: createId("pres"),
    title: init.title,
    description: init.description ?? "",
    audience: init.audience ?? { label: "General audience" },
    purpose: init.purpose ?? { label: "Present" },
    subject: init.subject ?? { name: "General" },
    gradeLevel: init.gradeLevel ?? "",
    theme,
    slides: init.slides ?? [],
    version: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
    source: init.source ?? { kind: "user" },
    language: init.language ?? "en-US",
    metadata: { ...DEFAULT_PRESENTATION_METADATA, ...init.metadata },
  };
}

/** Project a full presentation down to a list-friendly summary. */
export function toPresentationSummary(presentation: Presentation): PresentationSummary {
  return {
    id: presentation.id,
    title: presentation.title,
    description: presentation.description,
    slideCount: presentation.slides.length,
    version: presentation.version,
    updatedAt: presentation.updatedAt,
  };
}
