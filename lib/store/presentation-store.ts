/**
 * Presentation store.
 *
 * Holds the canonical Presentation currently open in the viewer and the
 * editing state around it. All mutations go through the pure helpers in
 * `lib/presentation/model.ts`, so the store can never produce a slide that the
 * model utilities would not, and the canonical shape is preserved.
 *
 * Editing is deliberately limited to the operations that are reliable today:
 * selecting a slide, renaming a slide, editing its text content, editing
 * speaker notes and toggling visibility. Anything larger is left out rather
 * than shipped half-working.
 */

import { create } from "zustand";

import {
  findSlide,
  removeSlide as removeSlideFromModel,
  updatePresentation,
  updateSlide as updateSlideInModel,
} from "@/lib/presentation/model";
import type { Presentation } from "@/types/presentation";
import type { Slide } from "@/types/slide";

export interface PresentationState {
  presentation: Presentation | null;
  /** Id of the slide currently shown in the canvas. */
  selectedSlideId: string | null;
  /** Whether the current presentation has unsaved edits. */
  dirty: boolean;

  load: (presentation: Presentation) => void;
  clear: () => void;
  selectSlide: (slideId: string) => void;
  selectSlideAt: (index: number) => void;
  /** Patch a slide's top-level fields (title, layout, narrativeRole, notes). */
  patchSlide: (slideId: string, patch: Partial<Omit<Slide, "id">>) => void;
  /** Replace the text content of a slide's primary text element. */
  setSlideBodyText: (slideId: string, lines: string[]) => void;
  removeSlide: (slideId: string) => void;
}

/** Index of the first text element that is not the title, if any. */
function findBodyTextElementIndex(slide: Slide): number {
  const index = slide.elements.findIndex(
    (element) => element.type === "text" && element.name !== "Title",
  );
  return index;
}

export const usePresentationStore = create<PresentationState>((set, get) => ({
  presentation: null,
  selectedSlideId: null,
  dirty: false,

  load: (presentation) =>
    set({
      presentation,
      selectedSlideId: presentation.slides[0]?.id ?? null,
      dirty: false,
    }),

  clear: () => set({ presentation: null, selectedSlideId: null, dirty: false }),

  selectSlide: (slideId) => set({ selectedSlideId: slideId }),

  selectSlideAt: (index) => {
    const { presentation } = get();
    const slide = presentation?.slides[index];
    if (slide) set({ selectedSlideId: slide.id });
  },

  patchSlide: (slideId, patch) => {
    const { presentation } = get();
    if (!presentation) return;
    set({
      presentation: updateSlideInModel(presentation, slideId, patch),
      dirty: true,
    });
  },

  setSlideBodyText: (slideId, lines) => {
    const { presentation } = get();
    if (!presentation) return;
    const slide = findSlide(presentation, slideId);
    if (!slide) return;

    const index = findBodyTextElementIndex(slide);
    if (index === -1) return;

    const target = slide.elements[index];
    if (target.type !== "text") return;

    const runs = lines
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => ({ text: line, style: "body" as const }));

    const elements = slide.elements.slice();
    elements[index] = { ...target, runs };

    set({
      presentation: updateSlideInModel(presentation, slideId, { elements }),
      dirty: true,
    });
  },

  removeSlide: (slideId) => {
    const { presentation, selectedSlideId } = get();
    if (!presentation) return;
    const next = removeSlideFromModel(presentation, slideId);
    const stillExists = next.slides.some((slide) => slide.id === selectedSlideId);
    set({
      presentation: next,
      selectedSlideId: stillExists ? selectedSlideId : (next.slides[0]?.id ?? null),
      dirty: true,
    });
  },
}));

/** Refresh `updatedAt` on the open presentation, e.g. after an edit. */
export function touchPresentation(presentation: Presentation): Presentation {
  return updatePresentation(presentation, {});
}
