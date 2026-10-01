/**
 * Model utilities for the canonical presentation model.
 *
 * These are pure helpers that operate on a Presentation without mutating it.
 * They are deliberately framework-free so the same operations can run in the
 * editor, in a server action and inside the Python-parity tests.
 */

import { createId } from "@/lib/utils/id";
import { moveItem, nowIso } from "@/lib/utils/helpers";
import type { Presentation, PresentationSummary } from "@/types/presentation";
import type { Slide, SlideElement } from "@/types/slide";

/** Return a presentation with `updatedAt` refreshed. */
function touch(presentation: Presentation): Presentation {
  return { ...presentation, updatedAt: nowIso() };
}

/** Bump the presentation version and refresh `updatedAt`. */
export function bumpVersion(presentation: Presentation): Presentation {
  return {
    ...presentation,
    version: presentation.version + 1,
    updatedAt: nowIso(),
  };
}

/** Update presentation-level fields immutably. */
export function updatePresentation(
  presentation: Presentation,
  patch: Partial<Omit<Presentation, "id" | "createdAt">>,
): Presentation {
  return touch({ ...presentation, ...patch });
}

/** Append a slide to the end of the deck. */
export function addSlide(presentation: Presentation, slide: Slide): Presentation {
  return touch({ ...presentation, slides: [...presentation.slides, slide] });
}

/** Insert a slide at a specific index, clamped to the deck bounds. */
export function insertSlide(
  presentation: Presentation,
  slide: Slide,
  index: number,
): Presentation {
  const slides = presentation.slides.slice();
  const clamped = Math.max(0, Math.min(index, slides.length));
  slides.splice(clamped, 0, slide);
  return touch({ ...presentation, slides });
}

/** Remove a slide by id. Returns the presentation unchanged when not found. */
export function removeSlide(presentation: Presentation, slideId: string): Presentation {
  const slides = presentation.slides.filter((slide) => slide.id !== slideId);
  if (slides.length === presentation.slides.length) return presentation;
  return touch({ ...presentation, slides });
}

/** Replace a slide by id, preserving order. */
export function replaceSlide(presentation: Presentation, slide: Slide): Presentation {
  const index = presentation.slides.findIndex((existing) => existing.id === slide.id);
  if (index === -1) return presentation;
  const slides = presentation.slides.slice();
  slides[index] = slide;
  return touch({ ...presentation, slides });
}

/** Apply a patch to a slide by id. */
export function updateSlide(
  presentation: Presentation,
  slideId: string,
  patch: Partial<Omit<Slide, "id">>,
): Presentation {
  const index = presentation.slides.findIndex((slide) => slide.id === slideId);
  if (index === -1) return presentation;
  const slides = presentation.slides.slice();
  slides[index] = { ...slides[index], ...patch };
  return touch({ ...presentation, slides });
}

/** Move a slide from one index to another. */
export function moveSlide(
  presentation: Presentation,
  from: number,
  to: number,
): Presentation {
  const slides = moveItem(presentation.slides, from, to);
  return touch({ ...presentation, slides });
}

/** Duplicate a slide, giving the copy a fresh id and "(copy)" title. */
export function duplicateSlide(presentation: Presentation, slideId: string): Presentation {
  const index = presentation.slides.findIndex((slide) => slide.id === slideId);
  if (index === -1) return presentation;
  const source = presentation.slides[index];
  const copy: Slide = {
    ...source,
    id: createId("slide"),
    title: source.title ? `${source.title} (copy)` : source.title,
    elements: source.elements.map(cloneElement),
    speakerNotes: { ...source.speakerNotes, cues: source.speakerNotes.cues?.slice() },
    metadata: { ...source.metadata, tags: source.metadata.tags?.slice() },
  };
  return insertSlide(presentation, copy, index + 1);
}

/** Deep-clone a single element, minting a fresh id. */
export function cloneElement(element: SlideElement): SlideElement {
  const copy = JSON.parse(JSON.stringify(element)) as SlideElement;
  copy.id = createId("el");
  if (copy.type === "group") {
    copy.children = copy.children.map(cloneElement);
  }
  return copy;
}

/** Find a slide by id. */
export function findSlide(presentation: Presentation, slideId: string): Slide | undefined {
  return presentation.slides.find((slide) => slide.id === slideId);
}

/** Flatten every element in the deck, including elements nested in groups. */
export function flattenElements(slides: readonly Slide[]): SlideElement[] {
  const out: SlideElement[] = [];
  const walk = (elements: readonly SlideElement[]) => {
    for (const element of elements) {
      out.push(element);
      if (element.type === "group") {
        walk(element.children);
      }
    }
  };
  for (const slide of slides) {
    walk(slide.elements);
  }
  return out;
}

/** Sum the estimated speaking time across a deck, in seconds. */
export function estimateDurationSeconds(presentation: Presentation): number {
  return presentation.slides.reduce(
    (total, slide) => total + (slide.speakerNotes.durationSeconds ?? 0),
    0,
  );
}

/** Count visible slides (slides not marked hidden). */
export function visibleSlideCount(presentation: Presentation): number {
  return presentation.slides.filter((slide) => !slide.metadata.hidden).length;
}

/** Extract all plain text from a slide, in reading order. */
export function extractSlideText(slide: Slide): string {
  const parts: string[] = [slide.title];
  const walk = (elements: readonly SlideElement[]) => {
    for (const element of elements) {
      if (element.type === "text") {
        parts.push(element.runs.map((run) => run.text).join(""));
      } else if (element.type === "shape" && element.text) {
        parts.push(element.text.map((run) => run.text).join(""));
      } else if (element.type === "chart" && element.title) {
        parts.push(element.title);
      } else if (element.type === "diagram" && element.title) {
        parts.push(element.title);
      } else if (element.type === "group") {
        walk(element.children);
      }
    }
  };
  walk(slide.elements);
  return parts.filter(Boolean).join("\n");
}

/** Project a presentation to a list-friendly summary. */
export function summarize(presentation: Presentation): PresentationSummary {
  return {
    id: presentation.id,
    title: presentation.title,
    description: presentation.description,
    slideCount: presentation.slides.length,
    version: presentation.version,
    updatedAt: presentation.updatedAt,
  };
}
