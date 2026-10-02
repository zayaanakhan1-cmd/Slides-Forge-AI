/**
 * Slide editor.
 *
 * A deliberately small editing surface: rename the slide, edit its body text
 * and edit the speaker notes. Everything it does goes through the presentation
 * store, which applies the pure model helpers, so the canonical Presentation
 * stays valid after every edit.
 *
 * Larger editing (moving elements, resizing, reordering) is left out on
 * purpose: a reliable small editor is worth more than a broad broken one.
 */

"use client";

import { useState } from "react";

import { Button, Panel, PanelHeader } from "@/components/ui/primitives";
import { usePresentationStore } from "@/lib/store/presentation-store";
import type { Presentation } from "@/types/presentation";
import type { Slide } from "@/types/slide";

const fieldClass =
  "w-full rounded-[var(--sf-radius-sm)] border bg-[rgba(255,255,255,0.02)] px-3 py-2 text-[12.5px] outline-none placeholder:text-[var(--sf-text-subtle)] focus:border-[var(--sf-border-strong)]";

/** Extract the editable body text from a slide, one entry per text run. */
function bodyLines(slide: Slide): string[] {
  const element = slide.elements.find(
    (candidate) => candidate.type === "text" && candidate.name !== "Title",
  );
  if (!element || element.type !== "text") return [];
  return element.runs.map((run) => run.text);
}

export function SlideEditor({
  presentation,
  slide,
}: {
  presentation: Presentation;
  slide: Slide;
}) {
  const patchSlide = usePresentationStore((state) => state.patchSlide);
  const setSlideBodyText = usePresentationStore((state) => state.setSlideBodyText);
  const dirty = usePresentationStore((state) => state.dirty);

  // The parent keys this component on the slide id, so the fields reinitialise
  // whenever a different slide is selected without an effect.
  const [title, setTitle] = useState(slide.title);
  const [body, setBody] = useState(() => bodyLines(slide).join("\n"));
  const [notes, setNotes] = useState(slide.speakerNotes.text);

  const hasBodyElement = bodyLines(slide).length > 0;

  function applyTitle() {
    const next = title.trim();
    if (next === slide.title) return;
    patchSlide(slide.id, { title: next });
  }

  function applyBody() {
    const lines = body.split("\n");
    setSlideBodyText(slide.id, lines);
  }

  function applyNotes() {
    if (notes === slide.speakerNotes.text) return;
    patchSlide(slide.id, { speakerNotes: { ...slide.speakerNotes, text: notes } });
  }

  return (
    <Panel>
      <PanelHeader
        title="Edit slide"
        description="Edits apply to the canonical presentation model."
        action={dirty ? <span className="sf-chip sf-chip-accent">edited</span> : null}
      />
      <div className="flex flex-col gap-4 px-5 py-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11.5px] font-medium text-[var(--sf-text-muted)]">
            Slide title
          </span>
          <input
            className={fieldClass}
            style={{ borderColor: "var(--sf-border-strong)" }}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={applyTitle}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="flex items-center justify-between text-[11.5px] font-medium text-[var(--sf-text-muted)]">
            Body content
            <span className="font-mono text-[10px] text-[var(--sf-text-subtle)]">
              one line per bullet
            </span>
          </span>
          <textarea
            className={fieldClass}
            style={{
              borderColor: "var(--sf-border-strong)",
              minHeight: 96,
              resize: "vertical",
            }}
            value={body}
            disabled={!hasBodyElement}
            placeholder={hasBodyElement ? "" : "This slide has no editable body text."}
            onChange={(event) => setBody(event.target.value)}
            onBlur={applyBody}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11.5px] font-medium text-[var(--sf-text-muted)]">
            Speaker notes
          </span>
          <textarea
            className={fieldClass}
            style={{
              borderColor: "var(--sf-border-strong)",
              minHeight: 80,
              resize: "vertical",
            }}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            onBlur={applyNotes}
          />
        </label>

        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-[var(--sf-text-subtle)]">
            Version {presentation.version} · {presentation.slides.length} slides
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              setTitle(slide.title);
              setBody(bodyLines(slide).join("\n"));
              setNotes(slide.speakerNotes.text);
            }}
          >
            Revert fields
          </Button>
        </div>
      </div>
    </Panel>
  );
}
