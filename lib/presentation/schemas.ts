/**
 * Runtime schemas for the canonical presentation model.
 *
 * The TypeScript types in `types/` are the authoring contract; these Zod
 * schemas are the runtime contract. Keeping both means the model can be
 * validated at every boundary it crosses: AI generation, the editor, the web
 * renderer, the PowerPoint renderer, the Google Slides adapter and the PDF
 * renderer.
 *
 * The schemas deliberately mirror the types one-to-one. If a type changes, the
 * matching schema must change with it; the exported `assertSchemaMatches`
 * helpers and the presentation tests guard that relationship.
 */

import { z } from "zod";

import type { Slide, SlideElement } from "@/types/slide";
import type { JsonValue } from "@/types/json";
import type { Presentation } from "@/types/presentation";
import type { Theme } from "@/types/theme";
import type {
  DestinationExportRequest,
  DestinationExportResult,
} from "@/types/destination";
import type {
  PresentationGenerationRequest,
  PresentationGenerationResult,
  PresentationOutline,
} from "@/types/ai";

/* -------------------------------------------------------------------------- */
/* JSON                                                                       */
/* -------------------------------------------------------------------------- */

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
  ]),
);

export const jsonObjectSchema: z.ZodType<Record<string, JsonValue>> = z.record(
  jsonValueSchema,
);

/* -------------------------------------------------------------------------- */
/* Geometry                                                                   */
/* -------------------------------------------------------------------------- */

export const positionSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

export const sizeSchema = z.object({
  width: z.number().finite(),
  height: z.number().finite(),
});

export const rectSchema = positionSchema.merge(sizeSchema);

export const edgeInsetsSchema = z.object({
  top: z.number().finite(),
  right: z.number().finite(),
  bottom: z.number().finite(),
  left: z.number().finite(),
});

export const horizontalAlignmentSchema = z.enum(["left", "center", "right"]);
export const verticalAlignmentSchema = z.enum(["top", "middle", "bottom"]);

/* -------------------------------------------------------------------------- */
/* Theme                                                                      */
/* -------------------------------------------------------------------------- */

const hexColorSchema = z
  .string()
  .regex(
    /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/,
    "Expected a hex colour such as #0B0D12",
  );

export const aspectRatioSchema = z.enum(["16:9", "4:3", "1:1", "9:16"]);

export const themeColorsSchema = z.object({
  background: hexColorSchema,
  surface: hexColorSchema,
  text: hexColorSchema,
  textMuted: hexColorSchema,
  accent: hexColorSchema,
  accentSecondary: hexColorSchema,
  border: hexColorSchema,
});

export const typeScaleSchema = z.object({
  title: z.number().positive(),
  heading: z.number().positive(),
  body: z.number().positive(),
  caption: z.number().positive(),
});

export const themeTypographySchema = z.object({
  headingFont: z.string().min(1),
  bodyFont: z.string().min(1),
  monoFont: z.string().min(1),
  scale: typeScaleSchema,
});

export const themeSpacingSchema = z.object({
  unit: z.number().positive(),
  margin: z.number().nonnegative(),
  gap: z.number().nonnegative(),
});

export const themeSchema: z.ZodType<Theme> = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  aspectRatio: aspectRatioSchema,
  colors: themeColorsSchema,
  typography: themeTypographySchema,
  spacing: themeSpacingSchema,
  slideBackground: z.string().min(1),
  isDark: z.boolean(),
  tokens: jsonObjectSchema.optional(),
});

/* -------------------------------------------------------------------------- */
/* Slide elements                                                             */
/* -------------------------------------------------------------------------- */

export const narrativeRoleSchema = z.enum([
  "title",
  "agenda",
  "introduction",
  "context",
  "concept",
  "example",
  "evidence",
  "comparison",
  "process",
  "activity",
  "summary",
  "conclusion",
  "references",
  "custom",
]);

export const slideLayoutSchema = z.enum([
  "title",
  "section",
  "title-and-content",
  "two-column",
  "image-left",
  "image-right",
  "full-bleed-image",
  "quote",
  "comparison",
  "timeline",
  "data",
  "diagram",
  "blank",
  "custom",
]);

export const baseElementSchema = z.object({
  id: z.string().min(1),
  position: positionSchema,
  size: sizeSchema,
  zIndex: z.number().int(),
  rotation: z.number().finite().optional(),
  visible: z.boolean().optional(),
  opacity: z.number().min(0).max(1).optional(),
  name: z.string().optional(),
  metadata: jsonObjectSchema.optional(),
});

export const textRunSchema = z.object({
  text: z.string(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  underline: z.boolean().optional(),
  color: z.string().optional(),
  fontSize: z.number().positive().optional(),
  style: z.enum(["title", "heading", "body", "caption"]).optional(),
});

export const textElementSchema = baseElementSchema.extend({
  type: z.literal("text"),
  runs: z.array(textRunSchema),
  align: horizontalAlignmentSchema.optional(),
  verticalAlign: verticalAlignmentSchema.optional(),
  lineHeight: z.number().positive().optional(),
  letterSpacing: z.number().finite().optional(),
  bullets: z.boolean().optional(),
});

export const imageElementSchema = baseElementSchema.extend({
  type: z.literal("image"),
  src: z.string().min(1),
  alt: z.string(),
  crop: rectSchema.optional(),
  fit: z.enum(["cover", "contain", "fill"]).optional(),
  caption: z.string().optional(),
});

export const shapeKindSchema = z.enum([
  "rectangle",
  "rounded-rectangle",
  "ellipse",
  "triangle",
  "line",
  "arrow",
  "divider",
]);

export const shapeElementSchema = baseElementSchema.extend({
  type: z.literal("shape"),
  shape: shapeKindSchema,
  fill: z.string().optional(),
  stroke: z.string().optional(),
  strokeWidth: z.number().nonnegative().optional(),
  cornerRadius: z.number().nonnegative().optional(),
  text: z.array(textRunSchema).optional(),
});

export const chartKindSchema = z.enum([
  "bar",
  "line",
  "pie",
  "area",
  "scatter",
  "radar",
]);

export const chartSeriesSchema = z.object({
  name: z.string().min(1),
  values: z.array(z.number().finite()),
  color: z.string().optional(),
});

export const chartElementSchema = baseElementSchema.extend({
  type: z.literal("chart"),
  chart: chartKindSchema,
  title: z.string().optional(),
  categories: z.array(z.string()),
  series: z.array(chartSeriesSchema),
  legend: z.boolean().optional(),
  source: z.string().optional(),
});

export const diagramNodeSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  position: positionSchema,
  size: sizeSchema,
});

export const diagramEdgeSchema = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  label: z.string().optional(),
  directed: z.boolean().optional(),
});

export const diagramElementSchema = baseElementSchema.extend({
  type: z.literal("diagram"),
  diagram: z.enum(["flowchart", "mindmap", "hierarchy", "cycle", "timeline"]),
  nodes: z.array(diagramNodeSchema),
  edges: z.array(diagramEdgeSchema),
  title: z.string().optional(),
});

export const videoElementSchema = baseElementSchema.extend({
  type: z.literal("video"),
  src: z.string().min(1),
  poster: z.string().optional(),
  autoplay: z.boolean().optional(),
  loop: z.boolean().optional(),
  muted: z.boolean().optional(),
  controls: z.boolean().optional(),
  caption: z.string().optional(),
});

export const buttonActionSchema = z.object({
  kind: z.enum(["link", "next-slide", "previous-slide", "goto-slide", "none"]),
  href: z.string().optional(),
  slideIndex: z.number().int().nonnegative().optional(),
});

export const buttonElementSchema = baseElementSchema.extend({
  type: z.literal("button"),
  label: z.string(),
  action: buttonActionSchema,
  variant: z.enum(["primary", "secondary", "ghost"]).optional(),
});

// The group element is an eager object whose children are resolved lazily, so
// it can participate in the discriminated union below without a construction
// cycle.
export const groupElementSchema = baseElementSchema.extend({
  type: z.literal("group"),
  children: z.lazy(() => z.array(slideElementSchema)),
  padding: edgeInsetsSchema.optional(),
});

export const slideElementSchema: z.ZodType<SlideElement> = z.lazy(() =>
  z.discriminatedUnion("type", [
    textElementSchema,
    imageElementSchema,
    shapeElementSchema,
    chartElementSchema,
    diagramElementSchema,
    videoElementSchema,
    buttonElementSchema,
    groupElementSchema,
  ]),
);

/* -------------------------------------------------------------------------- */
/* Slide and presentation                                                     */
/* -------------------------------------------------------------------------- */

export const slideDimensionsSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
});

export const speakerNotesSchema = z.object({
  text: z.string(),
  cues: z.array(z.string()).optional(),
  durationSeconds: z.number().nonnegative().optional(),
});

export const slideMetadataSchema = z.object({
  dimensions: slideDimensionsSchema.optional(),
  source: z.enum(["user", "ai", "template", "import"]).optional(),
  schemaVersion: z.string().optional(),
  hidden: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  extra: jsonObjectSchema.optional(),
});

export const slideSchema: z.ZodType<Slide> = z.object({
  id: z.string().min(1),
  title: z.string(),
  narrativeRole: narrativeRoleSchema,
  layout: slideLayoutSchema,
  elements: z.array(slideElementSchema),
  speakerNotes: speakerNotesSchema,
  metadata: slideMetadataSchema,
});

export const presentationAudienceSchema = z.object({
  label: z.string().min(1),
  description: z.string().optional(),
  size: z.number().int().nonnegative().optional(),
});

export const presentationPurposeSchema = z.object({
  label: z.string().min(1),
  description: z.string().optional(),
  durationMinutes: z.number().positive().optional(),
});

export const presentationSubjectSchema = z.object({
  name: z.string().min(1),
  topic: z.string().optional(),
  gradeLevel: z.string().optional(),
  standards: z.array(z.string()).optional(),
});

export const presentationSourceSchema = z.object({
  kind: z.enum(["user", "ai", "template", "import"]),
  referenceId: z.string().optional(),
});

export const presentationSchema: z.ZodType<Presentation> = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  audience: presentationAudienceSchema,
  purpose: presentationPurposeSchema,
  subject: presentationSubjectSchema,
  gradeLevel: z.string(),
  theme: themeSchema,
  slides: z.array(slideSchema),
  version: z.number().int().nonnegative(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  source: presentationSourceSchema.optional(),
  language: z.string().optional(),
  metadata: jsonObjectSchema.optional(),
});

/**
 * Input schema for creating a presentation. Only `title` is required; every
 * other field is filled by the model utilities.
 */
export const presentationInputSchema = z.object({
  title: z.string().min(1),
});

/* -------------------------------------------------------------------------- */
/* AI                                                                         */
/* -------------------------------------------------------------------------- */

export const aiComplexitySchema = z.enum(["light", "standard", "deep"]);

export const slidePlanEntrySchema = z.object({
  title: z.string().min(1),
  narrativeRole: narrativeRoleSchema,
  layout: slideLayoutSchema,
  keyPoints: z.array(z.string()),
  research: z.array(z.string()).optional(),
});

export const presentationOutlineSchema: z.ZodType<PresentationOutline> = z.object({
  title: z.string().min(1),
  description: z.string(),
  slides: z.array(slidePlanEntrySchema),
});

export const presentationGenerationRequestSchema: z.ZodType<PresentationGenerationRequest> =
  z.object({
    topic: z.string().min(1),
    description: z.string().optional(),
    audience: z.object({
      label: z.string().min(1),
      description: z.string().optional(),
    }),
    purpose: z.object({
      label: z.string().min(1),
      description: z.string().optional(),
      durationMinutes: z.number().positive().optional(),
    }),
    subject: z.object({
      name: z.string().min(1),
      topic: z.string().optional(),
      gradeLevel: z.string().optional(),
      standards: z.array(z.string()).optional(),
    }),
    gradeLevel: z.string().min(1),
    slideCount: z.number().int().positive().optional(),
    aspectRatio: aspectRatioSchema.optional(),
    language: z.string().optional(),
    complexity: aiComplexitySchema.optional(),
    themeId: z.string().optional(),
    constraints: z.array(z.string()).optional(),
    targetDestinations: z.array(z.enum(["web", "powerpoint", "google-slides", "pdf"])).optional(),
    options: jsonObjectSchema.optional(),
  });

export const aiUsageSchema = z.object({
  inputTokens: z.number().nonnegative().optional(),
  outputTokens: z.number().nonnegative().optional(),
  totalTokens: z.number().nonnegative().optional(),
  estimatedCostUsd: z.number().nonnegative().optional(),
});

export const aiResponseMetadataSchema = z.object({
  providerId: z.string().min(1),
  model: z.string().min(1),
  latencyMs: z.number().nonnegative(),
  usage: aiUsageSchema.optional(),
  generatedAt: z.string().min(1),
});

export const presentationGenerationResultSchema: z.ZodType<PresentationGenerationResult> =
  z.object({
    outline: presentationOutlineSchema,
    slides: z.array(slideSchema),
    metadata: aiResponseMetadataSchema,
    warnings: z.array(z.string()).optional(),
  });

/* -------------------------------------------------------------------------- */
/* Destinations                                                               */
/* -------------------------------------------------------------------------- */

export const destinationKindSchema = z.enum([
  "web",
  "powerpoint",
  "google-slides",
  "pdf",
]);

export const destinationExportRequestSchema: z.ZodType<DestinationExportRequest> =
  z.object({
    presentationId: z.string().min(1),
    destination: destinationKindSchema,
    fileName: z.string().optional(),
    options: z.record(z.unknown()).optional(),
  });

export const destinationExportResultSchema: z.ZodType<DestinationExportResult> =
  z.object({
    destination: destinationKindSchema,
    status: z.enum(["succeeded", "failed"]),
    fileName: z.string().optional(),
    mimeType: z.string().optional(),
    url: z.string().optional(),
    byteSize: z.number().nonnegative().optional(),
    error: z.string().optional(),
  });
