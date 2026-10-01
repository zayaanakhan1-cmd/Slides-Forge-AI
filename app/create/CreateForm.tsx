/**
 * Create-a-presentation form.
 *
 * The fields map directly onto the canonical `PresentationGenerationRequest`
 * model, so the UI already speaks the same language as the orchestrator. The
 * form does not submit anywhere yet: no AI provider is registered in Phase 1, so
 * the submit action is disabled and the reason is stated plainly.
 */

"use client";

import { useState } from "react";

import { Button, Chip, Panel, PanelHeader } from "@/components/ui/primitives";

interface CreateFormState {
  topic: string;
  description: string;
  audienceLabel: string;
  purposeLabel: string;
  subjectName: string;
  gradeLevel: string;
  slideCount: string;
  complexity: "light" | "standard" | "deep";
}

const INITIAL: CreateFormState = {
  topic: "",
  description: "",
  audienceLabel: "",
  purposeLabel: "",
  subjectName: "",
  gradeLevel: "",
  slideCount: "10",
  complexity: "standard",
};

const fieldClass =
  "w-full rounded-[var(--sf-radius-sm)] border bg-[rgba(255,255,255,0.02)] px-3 py-2 text-[12.5px] outline-none placeholder:text-[var(--sf-text-subtle)] focus:border-[var(--sf-border-strong)]";

export function CreateForm() {
  const [form, setForm] = useState<CreateFormState>(INITIAL);
  const [submitted, setSubmitted] = useState(false);

  function update<K extends keyof CreateFormState>(key: K, value: CreateFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);
      }}
    >
      <Panel>
        <PanelHeader
          title="Request"
          description="These fields become a PresentationGenerationRequest for the AI orchestrator."
        />
        <div className="grid gap-4 px-5 py-5 md:grid-cols-2">
          <label className="flex flex-col gap-1.5 md:col-span-2">
            <span className="text-[11.5px] font-medium text-[var(--sf-text-muted)]">Topic</span>
            <input
              className={fieldClass}
              style={{ borderColor: "var(--sf-border-strong)" }}
              value={form.topic}
              onChange={(event) => update("topic", event.target.value)}
              placeholder="e.g. How mitosis works"
            />
          </label>

          <label className="flex flex-col gap-1.5 md:col-span-2">
            <span className="text-[11.5px] font-medium text-[var(--sf-text-muted)]">
              Description
            </span>
            <textarea
              className={fieldClass}
              style={{ borderColor: "var(--sf-border-strong)", minHeight: 72, resize: "vertical" }}
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
              placeholder="What should students walk away understanding?"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11.5px] font-medium text-[var(--sf-text-muted)]">Audience</span>
            <input
              className={fieldClass}
              style={{ borderColor: "var(--sf-border-strong)" }}
              value={form.audienceLabel}
              onChange={(event) => update("audienceLabel", event.target.value)}
              placeholder="Grade 9 biology students"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11.5px] font-medium text-[var(--sf-text-muted)]">Purpose</span>
            <input
              className={fieldClass}
              style={{ borderColor: "var(--sf-border-strong)" }}
              value={form.purposeLabel}
              onChange={(event) => update("purposeLabel", event.target.value)}
              placeholder="Teach a 45-minute lesson"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11.5px] font-medium text-[var(--sf-text-muted)]">Subject</span>
            <input
              className={fieldClass}
              style={{ borderColor: "var(--sf-border-strong)" }}
              value={form.subjectName}
              onChange={(event) => update("subjectName", event.target.value)}
              placeholder="Biology"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11.5px] font-medium text-[var(--sf-text-muted)]">
              Grade level
            </span>
            <input
              className={fieldClass}
              style={{ borderColor: "var(--sf-border-strong)" }}
              value={form.gradeLevel}
              onChange={(event) => update("gradeLevel", event.target.value)}
              placeholder="Grade 9"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11.5px] font-medium text-[var(--sf-text-muted)]">
              Slide count
            </span>
            <input
              className={fieldClass}
              style={{ borderColor: "var(--sf-border-strong)" }}
              inputMode="numeric"
              value={form.slideCount}
              onChange={(event) => update("slideCount", event.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11.5px] font-medium text-[var(--sf-text-muted)]">
              Complexity
            </span>
            <select
              className={fieldClass}
              style={{ borderColor: "var(--sf-border-strong)" }}
              value={form.complexity}
              onChange={(event) =>
                update("complexity", event.target.value as CreateFormState["complexity"])
              }
            >
              <option value="light">Light</option>
              <option value="standard">Standard</option>
              <option value="deep">Deep</option>
            </select>
          </label>
        </div>
        <div
          className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4"
          style={{ borderColor: "var(--sf-border)" }}
        >
          <div className="flex items-center gap-2">
            <Chip tone="planned">Generation unavailable</Chip>
            <span className="text-[11.5px] text-[var(--sf-text-muted)]">
              No AI provider is registered in Phase 1.
            </span>
          </div>
          <Button variant="primary" type="submit">
            Generate presentation
          </Button>
        </div>
      </Panel>

      {submitted ? (
        <Panel className="p-5">
          <p className="text-[12.5px] font-medium">Nothing was generated.</p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--sf-text-muted)]">
            The request above is shaped correctly, but there is no provider to send it to.
            Register a provider through the AI registry and implement it, and this form will
            be able to submit a real <code className="font-mono">PresentationGenerationRequest</code>.
          </p>
        </Panel>
      ) : null}
    </form>
  );
}
