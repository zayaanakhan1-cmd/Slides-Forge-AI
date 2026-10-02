/**
 * Presentation builders.
 *
 * Providers return content-shaped `SlideDraft`s: what a slide should say. This
 * module decides how that content is laid out as canonical `SlideElement`s.
 *
 * Keeping layout policy here — rather than in the AI prompt — is what lets the
 * model stay destination-agnostic. The provider never emits geometry, element
 * ids or z-indices; the application owns those, so a draft can be re-laid-out
 * for a different theme or destination without asking the model again.
 *
 * All geometry is normalized (0..1) against the slide canvas, matching
 * `types/geometry.ts`.
 */

import { createId } from "@/lib/utils/id";
import type { SlideDraft } from "@/types/ai";
import type { Slide, SlideElement, TextElement, TextRun } from "@/types/slide";
import type { Theme } from "@/types/theme";
import { createShapeElement, createTextElement } from "./factory";
import { dimensionsForAspectRatio, DEFAULT_THEME } from "./defaults";
import { PRESENTATION_SCHEMA_VERSION } from "@/types/presentation";

/** Horizontal margin as a fraction of slide width. */
const MARGIN_X = 0.075;
/** Width available to content. */
const CONTENT_WIDTH = 1 - MARGIN_X * 2;

/** Vertical bands, as fractions of slide height. */
const BANDS = {
  title: { y: 0.085, height: 0.15 },
  subtitle: { y: 0.245, height: 0.08 },
  body: { y: 0.35, height: 0.44 },
  callout: { y: 0.82, height: 0.11 },
} as const;

interface BuildContext {
  theme: Theme;
}

function textRuns(values: readonly string[], style: TextRun["style"]): TextRun[] {
  return values
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .map((value) => ({ text: value, style }));
}

function textElement(
  runs: TextRun[],
  overrides: Partial<Omit<TextElement, "type" | "runs">>,
): TextElement {
  return createTextElement(runs, overrides);
}

function titleElement(draft: SlideDraft, zIndex: number): TextElement {
  const centered = draft.layout === "title" || draft.layout === "section" || draft.layout === "quote";
  return textElement([{ text: draft.title, style: "title", bold: true }], {
    position: { x: MARGIN_X, y: centered ? 0.36 : BANDS.title.y },
    size: { width: CONTENT_WIDTH, height: centered ? 0.2 : BANDS.title.height },
    zIndex,
    align: centered ? "center" : "left",
    verticalAlign: "middle",
    name: "Title",
  });
}

function subtitleElement(draft: SlideDraft, zIndex: number): TextElement | null {
  if (!draft.subtitle) return null;
  const centered = draft.layout === "title" || draft.layout === "section";
  return textElement([{ text: draft.subtitle, style: "heading" }], {
    position: { x: MARGIN_X, y: centered ? 0.58 : BANDS.subtitle.y },
    size: { width: CONTENT_WIDTH, height: BANDS.subtitle.height },
    zIndex,
    align: centered ? "center" : "left",
    verticalAlign: "middle",
  });
}

function bodyElements(draft: SlideDraft, zIndex: number): SlideElement[] {
  const bullets = textRuns(draft.bullets ?? [], "body");
  const paragraphs = textRuns(draft.paragraphs ?? [], "body");
  const hasBullets = bullets.length > 0;
  const content = hasBullets ? bullets : paragraphs;
  if (content.length === 0) return [];

  const twoColumn = draft.layout === "two-column";
  if (twoColumn && content.length > 2) {
    const mid = Math.ceil(content.length / 2);
    const columnWidth = (CONTENT_WIDTH - 0.04) / 2;
    return [
      textElement(content.slice(0, mid), {
        position: { x: MARGIN_X, y: BANDS.body.y },
        size: { width: columnWidth, height: BANDS.body.height },
        zIndex,
        bullets: hasBullets,
        lineHeight: 1.35,
      }),
      textElement(content.slice(mid), {
        position: { x: MARGIN_X + columnWidth + 0.04, y: BANDS.body.y },
        size: { width: columnWidth, height: BANDS.body.height },
        zIndex: zIndex + 1,
        bullets: hasBullets,
        lineHeight: 1.35,
      }),
    ];
  }

  return [
    textElement(content, {
      position: { x: MARGIN_X, y: BANDS.body.y },
      size: { width: CONTENT_WIDTH, height: BANDS.body.height },
      zIndex,
      bullets: hasBullets,
      lineHeight: 1.35,
    }),
  ];
}

function quoteElements(draft: SlideDraft, zIndex: number): SlideElement[] {
  if (!draft.quote) return [];
  const runs: TextRun[] = [{ text: `“${draft.quote.text}”`, style: "heading", italic: true }];
  const elements: SlideElement[] = [
    textElement(runs, {
      position: { x: MARGIN_X + 0.06, y: 0.3 },
      size: { width: CONTENT_WIDTH - 0.12, height: 0.32 },
      zIndex,
      align: "center",
      verticalAlign: "middle",
      lineHeight: 1.3,
    }),
  ];
  if (draft.quote.attribution) {
    elements.push(
      textElement([{ text: `— ${draft.quote.attribution}`, style: "caption" }], {
        position: { x: MARGIN_X, y: 0.64 },
        size: { width: CONTENT_WIDTH, height: 0.06 },
        zIndex: zIndex + 1,
        align: "center",
      }),
    );
  }
  return elements;
}

function calloutElement(draft: SlideDraft, zIndex: number): SlideElement | null {
  if (!draft.callout) return null;
  return createShapeElement("rounded-rectangle", {
    position: { x: MARGIN_X, y: BANDS.callout.y },
    size: { width: CONTENT_WIDTH, height: BANDS.callout.height },
    zIndex,
    fill: "rgba(109, 139, 255, 0.10)",
    stroke: "#2e3448",
    strokeWidth: 1,
    cornerRadius: 8,
    text: [{ text: draft.callout, style: "body" }],
    name: "Callout",
  });
}

/**
 * Build a canonical Slide from a provider draft.
 *
 * The slide is fully valid against `slideSchema`: ids, positions, sizes,
 * z-indices and metadata are all supplied here.
 */
export function buildSlideFromDraft(draft: SlideDraft, context: BuildContext): Slide {
  const theme = context.theme ?? DEFAULT_THEME;
  const dimensions = dimensionsForAspectRatio(theme.aspectRatio);

  const elements: SlideElement[] = [];
  let z = 0;

  const isQuote = draft.layout === "quote" || Boolean(draft.quote);
  const hasTitle = draft.title.trim().length > 0;

  if (hasTitle) {
    elements.push(titleElement(draft, z));
    z += 1;
  }

  const subtitle = subtitleElement(draft, z);
  if (subtitle) {
    elements.push(subtitle);
    z += 1;
  }

  if (isQuote) {
    for (const element of quoteElements(draft, z)) {
      elements.push(element);
      z += 1;
    }
  } else {
    for (const element of bodyElements(draft, z)) {
      elements.push(element);
      z += 1;
    }
  }

  const callout = calloutElement(draft, z);
  if (callout) {
    elements.push(callout);
    z += 1;
  }

  const notes = draft.speakerNotes?.trim();

  return {
    id: createId("slide"),
    title: draft.title,
    narrativeRole: draft.narrativeRole,
    layout: draft.layout,
    elements,
    speakerNotes: {
      text: notes ?? "",
      cues: draft.cues?.filter((cue) => cue.trim().length > 0) ?? [],
    },
    metadata: {
      dimensions,
      source: "ai",
      schemaVersion: PRESENTATION_SCHEMA_VERSION,
      hidden: false,
      tags: [],
    },
  };
}

/** Build canonical slides from a list of drafts, preserving order. */
export function buildSlidesFromDrafts(
  drafts: readonly SlideDraft[],
  context: BuildContext,
): Slide[] {
  return drafts.map((draft) => buildSlideFromDraft(draft, context));
}
