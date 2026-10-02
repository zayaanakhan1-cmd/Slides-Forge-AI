/**
 * Create-a-presentation experience.
 *
 * The user types a sentence, the application parses it into a structured
 * `PresentationGenerationRequest`, streams the AI pipeline and shows real
 * per-stage progress. On success the generated presentation is rendered inline
 * in the viewer. On failure the real error is shown — never a placeholder deck.
 */

"use client";

import { useCallback, useRef, useState } from "react";

import { GenerationProgress } from "@/components/generation/GenerationProgress";
import { PresentationViewer } from "@/components/presentation/PresentationViewer";
import { Button, Chip, Panel, PanelHeader } from "@/components/ui/primitives";
import { GenerationTransportError, streamGeneration } from "@/lib/api/client";
import { parsePrompt } from "@/lib/ai/prompt";
import { useGenerationStore } from "@/lib/store/generation-store";
import { usePresentationStore } from "@/lib/store/presentation-store";

const EXAMPLE_PROMPTS = [
  "Create a 10-slide presentation about the future of artificial intelligence",
  "Make an 8-slide lesson for Grade 9 biology explaining how mitosis works",
  "Build a 12-slide deck for university students on the causes of climate change",
];

const ERROR_LABELS: Record<string, string> = {
  provider_not_configured: "AI provider not configured",
  provider_not_found: "AI provider not registered",
  provider_unavailable: "Provider unavailable",
  invalid_response: "Invalid AI response",
  invalid_request: "Invalid request",
  timeout: "Generation timed out",
  rate_limited: "Rate limited",
  cancelled: "Cancelled",
  unknown: "Generation failed",
};

export function CreateForm() {
  const [prompt, setPrompt] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const status = useGenerationStore((state) => state.status);
  const error = useGenerationStore((state) => state.error);
  const presentation = useGenerationStore((state) => state.presentation);
  const pipeline = useGenerationStore((state) => state.pipeline);
  const begin = useGenerationStore((state) => state.begin);
  const applyEvent = useGenerationStore((state) => state.applyEvent);
  const succeed = useGenerationStore((state) => state.succeed);
  const fail = useGenerationStore((state) => state.fail);
  const reset = useGenerationStore((state) => state.reset);
  const clearPresentation = usePresentationStore((state) => state.clear);

  const running = status === "running";

  const submit = useCallback(async () => {
    const trimmed = prompt.trim();
    if (trimmed.length < 3) {
      setValidationError("Enter at least a few words describing the presentation you need.");
      return;
    }
    setValidationError(null);
    clearPresentation();
    begin(trimmed);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamGeneration(
        trimmed,
        {
          onEvent: applyEvent,
          onResult: (message) => succeed(message.presentation, message.pipeline),
          onError: fail,
        },
        controller.signal,
      );
    } catch (transportError) {
      fail({
        code:
          transportError instanceof GenerationTransportError
            ? transportError.code
            : "unknown",
        message:
          transportError instanceof Error ? transportError.message : "Generation failed.",
        retryable: true,
      });
    } finally {
      abortRef.current = null;
    }
  }, [prompt, begin, applyEvent, succeed, fail, clearPresentation]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    reset();
  }, [reset]);

  // A local preview of how the prompt will be parsed. This is the same parser
  // the API uses, so the preview cannot drift from the real request.
  const preview = prompt.trim().length >= 3 ? parsePrompt(prompt) : null;

  return (
    <div className="flex flex-col gap-5">
      <Panel>
        <PanelHeader
          title="Request"
          description="One sentence is enough. SlidesForge parses it into a structured generation request."
        />
        <form
          className="flex flex-col gap-4 px-5 py-5"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-[11.5px] font-medium text-[var(--sf-text-muted)]">
              What should the presentation cover?
            </span>
            <textarea
              className="w-full rounded-[var(--sf-radius-sm)] border bg-[rgba(255,255,255,0.02)] px-3 py-2.5 text-[13px] leading-relaxed outline-none placeholder:text-[var(--sf-text-subtle)] focus:border-[var(--sf-border-strong)]"
              style={{ borderColor: "var(--sf-border-strong)", minHeight: 92, resize: "vertical" }}
              value={prompt}
              disabled={running}
              placeholder="Create a 10-slide presentation about the future of artificial intelligence"
              onChange={(event) => {
                setPrompt(event.target.value);
                if (validationError) setValidationError(null);
              }}
            />
          </label>

          {validationError ? (
            <p className="text-[11.5px] text-[var(--sf-danger)]">{validationError}</p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-[var(--sf-text-subtle)]">Try:</span>
            {EXAMPLE_PROMPTS.map((example) => (
              <button
                key={example}
                type="button"
                disabled={running}
                onClick={() => setPrompt(example)}
                className="sf-chip transition-colors hover:text-[var(--sf-text)] disabled:opacity-50"
              >
                {example.length > 48 ? `${example.slice(0, 48)}…` : example}
              </button>
            ))}
          </div>

          {preview ? (
            <div className="rounded-[var(--sf-radius-sm)] border p-3" style={{ borderColor: "var(--sf-border)" }}>
              <p className="text-[10.5px] uppercase tracking-[0.14em] text-[var(--sf-text-subtle)]">
                Parsed request
              </p>
              <dl className="mt-2 grid gap-x-5 gap-y-1.5 text-[11.5px] sm:grid-cols-2">
                {[
                  ["Topic", preview.topic],
                  ["Subject", preview.subject.name],
                  ["Audience", preview.audience.label],
                  ["Grade level", preview.gradeLevel],
                  ["Slides", String(preview.slideCount)],
                  ["Aspect ratio", preview.aspectRatio ?? "16:9"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <dt className="text-[var(--sf-text-muted)]">{label}</dt>
                    <dd className="truncate text-right">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-[var(--sf-text-subtle)]">
              The AI provider must be configured for generation to run.
            </p>
            <div className="flex items-center gap-2">
              {running ? (
                <Button variant="secondary" onClick={cancel}>
                  Cancel
                </Button>
              ) : null}
              <Button variant="primary" type="submit" disabled={running}>
                {running ? "Generating…" : "Generate presentation"}
              </Button>
            </div>
          </div>
        </form>
      </Panel>

      {status !== "idle" ? (
        <Panel>
          <PanelHeader
            title="Pipeline"
            description="Each stage completes only when its output has been validated."
            action={
              <Chip tone={status === "succeeded" ? "accent" : "default"}>{status}</Chip>
            }
          />
          <GenerationProgress />
        </Panel>
      ) : null}

      {status === "failed" && error ? (
        <Panel className="border-l-2 p-5" >
          <div className="flex items-center gap-2">
            <Chip tone="planned">{ERROR_LABELS[error.code] ?? "Generation failed"}</Chip>
            <span className="font-mono text-[10.5px] text-[var(--sf-text-subtle)]">
              {error.code}
            </span>
          </div>
          <p className="mt-3 text-[12.5px] leading-relaxed">{error.message}</p>
          {error.issues?.length ? (
            <ul className="mt-3 flex flex-col gap-1">
              {error.issues.slice(0, 8).map((issue, index) => (
                <li key={`${issue.path}-${index}`} className="font-mono text-[10.5px] text-[var(--sf-text-muted)]">
                  {issue.path ? `${issue.path}: ` : ""}
                  {issue.message}
                </li>
              ))}
            </ul>
          ) : null}
          {error.code === "provider_not_configured" ? (
            <p className="mt-3 text-[11.5px] leading-relaxed text-[var(--sf-text-muted)]">
              Set <code className="font-mono">SLIDESFORGE_AI_API_KEY</code> in your
              environment and restart the server. The endpoint, model and timeout are
              configurable through <code className="font-mono">SLIDESFORGE_AI_BASE_URL</code>,{" "}
              <code className="font-mono">SLIDESFORGE_AI_MODEL</code> and{" "}
              <code className="font-mono">SLIDESFORGE_AI_TIMEOUT_MS</code>.
            </p>
          ) : null}
          <div className="mt-4">
            <Button variant="secondary" onClick={() => void submit()}>
              {error.retryable ? "Retry" : "Try again"}
            </Button>
          </div>
        </Panel>
      ) : null}

      {status === "succeeded" && presentation ? (
        <>
          {pipeline ? (
            <Panel>
              <PanelHeader
                title="What the pipeline produced"
                description="The structured output behind this deck."
              />
              <div className="grid gap-px sm:grid-cols-3" style={{ background: "var(--sf-border)" }}>
                {[
                  {
                    label: "Understanding",
                    value: `${pipeline.understanding.learningObjectives.length} objectives`,
                    detail: pipeline.understanding.objective,
                  },
                  {
                    label: "Research",
                    value: `${pipeline.research.findings.length} findings`,
                    detail: pipeline.research.summary,
                  },
                  {
                    label: "Narrative",
                    value: `${pipeline.narrative.beats.length} beats`,
                    detail: pipeline.narrative.thesis,
                  },
                ].map((item) => (
                  <div key={item.label} className="bg-[var(--sf-surface)] p-4">
                    <p className="text-[10.5px] uppercase tracking-[0.14em] text-[var(--sf-text-subtle)]">
                      {item.label}
                    </p>
                    <p className="mt-1 text-[12.5px] font-medium">{item.value}</p>
                    <p className="mt-1.5 line-clamp-3 text-[11px] leading-relaxed text-[var(--sf-text-muted)]">
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>
            </Panel>
          ) : null}
          <PresentationViewer presentation={presentation} />
        </>
      ) : null}
    </div>
  );
}
