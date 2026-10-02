/**
 * Presentation viewer.
 *
 * The first polished viewing surface: a slide rail, the selected slide on a
 * canvas, deck metadata and a lightweight editing panel. It reads the canonical
 * Presentation from the presentation store and never mutates it directly — all
 * edits go through the store, which applies the pure model helpers.
 */

"use client";

import { useEffect, useMemo } from "react";

import { Chip, Panel, PanelHeader } from "@/components/ui/primitives";
import { usePresentationStore } from "@/lib/store/presentation-store";
import { cn } from "@/lib/utils/helpers";
import type { Presentation } from "@/types/presentation";
import type { Slide } from "@/types/slide";
import { SlideCanvas } from "./SlideCanvas";
import { SlideEditor } from "./SlideEditor";

function Thumbnail({
  slide,
  index,
  presentation,
  selected,
  onSelect,
}: {
  slide: Slide;
  index: number;
  presentation: Presentation;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? "true" : undefined}
        className={cn(
          "group flex w-full gap-3 rounded-[var(--sf-radius-sm)] border p-2 text-left transition-colors",
          selected
            ? "border-[var(--sf-accent)] bg-[var(--sf-accent-soft)]"
            : "border-transparent hover:bg-[var(--sf-surface-hover)]",
        )}
      >
        <span className="w-7 shrink-0 pt-1 text-right font-mono text-[10px] text-[var(--sf-text-subtle)]">
          {index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className="block overflow-hidden rounded-[4px] border"
            style={{ borderColor: "var(--sf-border)" }}
          >
            <SlideCanvas slide={slide} theme={presentation.theme} />
          </span>
          <span className="mt-1.5 block truncate text-[11.5px] font-medium">
            {slide.title || "Untitled slide"}
          </span>
          <span className="mt-0.5 block truncate font-mono text-[10px] text-[var(--sf-text-subtle)]">
            {slide.narrativeRole} · {slide.layout}
          </span>
        </span>
      </button>
    </li>
  );
}

export function PresentationViewer({ presentation }: { presentation: Presentation }) {
  const load = usePresentationStore((state) => state.load);
  const selectedSlideId = usePresentationStore((state) => state.selectedSlideId);
  const selectSlideAt = usePresentationStore((state) => state.selectSlideAt);

  // Load the deck into the store whenever a different presentation arrives.
  useEffect(() => {
    load(presentation);
  }, [presentation, load]);

  const selectedIndex = useMemo(() => {
    const index = presentation.slides.findIndex((slide) => slide.id === selectedSlideId);
    return index === -1 ? 0 : index;
  }, [presentation.slides, selectedSlideId]);

  const selectedSlide = presentation.slides[selectedIndex];

  if (!selectedSlide) {
    return (
      <Panel className="p-6">
        <p className="text-[12.5px] text-[var(--sf-text-muted)]">
          The generated presentation contained no slides.
        </p>
      </Panel>
    );
  }

  const totalMinutes = presentation.purpose.durationMinutes;

  return (
    <div className="flex flex-col gap-5">
      <Panel>
        <PanelHeader
          title={presentation.title}
          description={presentation.description}
          action={
            <div className="flex items-center gap-2">
              <Chip tone="accent">{presentation.slides.length} slides</Chip>
              <Chip>{presentation.theme.name}</Chip>
            </div>
          }
        />
        <dl className="grid gap-px sm:grid-cols-2 lg:grid-cols-4" style={{ background: "var(--sf-border)" }}>
          {[
            { label: "Audience", value: presentation.audience.label },
            { label: "Subject", value: presentation.subject.name },
            { label: "Grade level", value: presentation.gradeLevel },
            { label: "Purpose", value: totalMinutes ? `${presentation.purpose.label} · ${totalMinutes} min` : presentation.purpose.label },
          ].map((item) => (
            <div key={item.label} className="bg-[var(--sf-surface)] px-5 py-3.5">
              <dt className="text-[10.5px] uppercase tracking-[0.14em] text-[var(--sf-text-subtle)]">
                {item.label}
              </dt>
              <dd className="mt-1 truncate text-[12.5px]">{item.value}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <Panel className="overflow-hidden">
          <PanelHeader title="Slides" description={`${presentation.slides.length} in this deck`} />
          <ol className="flex max-h-[560px] flex-col gap-1 overflow-y-auto p-2">
            {presentation.slides.map((slide, index) => (
              <Thumbnail
                key={slide.id}
                slide={slide}
                index={index}
                presentation={presentation}
                selected={index === selectedIndex}
                onSelect={() => selectSlideAt(index)}
              />
            ))}
          </ol>
        </Panel>

        <div className="flex min-w-0 flex-col gap-5">
          <Panel className="overflow-hidden">
            <PanelHeader
              title={`Slide ${selectedIndex + 1} of ${presentation.slides.length}`}
              description={selectedSlide.narrativeRole}
              action={<Chip>{selectedSlide.layout}</Chip>}
            />
            <div className="p-4">
              <div
                className="overflow-hidden rounded-[var(--sf-radius-sm)] border"
                style={{ borderColor: "var(--sf-border-strong)" }}
              >
                <SlideCanvas slide={selectedSlide} theme={presentation.theme} interactive />
              </div>
            </div>
          </Panel>

          <SlideEditor
            key={selectedSlide.id}
            presentation={presentation}
            slide={selectedSlide}
          />
        </div>
      </div>
    </div>
  );
}
