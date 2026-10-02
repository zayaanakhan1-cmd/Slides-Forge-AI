/**
 * AI orchestrator.
 *
 * The orchestrator is the only place that sequences AI work. It accepts a
 * structured generation request, resolves a provider through the registry and
 * runs the product pipeline stage by stage:
 *
 *   understand → research → narrative → slide plan → generate → validate
 *
 * Each stage receives the previous stage's *validated* output, so a provider
 * cannot skip ahead or invent its own context. The orchestrator emits a
 * `GenerationEvent` as each stage starts, succeeds or fails, and those events
 * describe real application state — a stage only reports success once its work
 * is done and its output has passed runtime validation.
 *
 * It never fabricates content. When no provider is configured it raises
 * `AIProviderUnavailableError` so the caller can show an honest empty state.
 */

import { nowIso } from "@/lib/utils/helpers";
import {
  buildSlidesFromDrafts,
  createPresentation,
  createSlide,
  dimensionsForAspectRatio,
  DEFAULT_THEME,
  normalizePresentation,
  validatePresentation,
  validateWith,
} from "@/lib/presentation";
import {
  narrativePlanSchema,
  presentationOutlineSchema,
  researchBriefSchema,
  slideDraftSchema,
  understandingBriefSchema,
} from "@/lib/presentation/schemas";
import { PRESENTATION_SCHEMA_VERSION } from "@/types/presentation";
import type { Presentation } from "@/types/presentation";
import type {
  GenerationEvent,
  GenerationPipelineOutput,
  GenerationStage,
  OutlineGenerationRequest,
  PresentationGenerationRequest,
  PresentationGenerationResult,
  PresentationOutline,
  SlideDraft,
} from "@/types/ai";
import type { AIProvider } from "./provider";
import type { ProviderCallOptions } from "./types";
import {
  AIError,
  AIProviderUnavailableError,
  toSerializedAIError,
} from "./types";
import { getConfiguredProvider, getProvider } from "./providers/registry";

export interface OrchestratorOptions {
  /** Explicit provider to use; otherwise the first configured provider wins. */
  providerId?: string;
  /** Per-call options forwarded to the provider. */
  call?: ProviderCallOptions;
  /** Called as each stage starts, succeeds or fails. */
  onProgress?: (event: GenerationEvent) => void;
}

export interface OrchestrationResult {
  presentation: Presentation;
  outline: PresentationOutline;
  result: PresentationGenerationResult;
  pipeline: GenerationPipelineOutput;
}

function resolveProvider(options: OrchestratorOptions = {}): AIProvider {
  const provider = options.providerId
    ? getProvider(options.providerId)
    : getConfiguredProvider();

  if (!provider) {
    throw new AIProviderUnavailableError();
  }
  if (!provider.isConfigured()) {
    throw new AIProviderUnavailableError(
      `AI provider "${provider.descriptor.id}" is registered but not configured.`,
      provider.descriptor.id,
    );
  }
  return provider;
}

type StageValidator<T> = (
  input: unknown,
) =>
  | { success: true; data: T }
  | { success: false; issues: Array<{ path: string; message: string; code: string }> };

/**
 * Run one pipeline stage, emitting progress events and validating its output.
 *
 * A stage is reported as `succeeded` only after the validator accepts its
 * result. If the provider returns something that does not match the model, the
 * stage fails with an `invalid_response` error carrying the validation issues.
 */
async function runStage<T>(
  stage: GenerationStage,
  providerId: string,
  emit: (event: GenerationEvent) => void,
  work: () => Promise<T>,
  validate: StageValidator<T>,
  detail?: (value: T) => string,
): Promise<T> {
  emit({ stage, status: "running", at: nowIso() });

  let raw: T;
  try {
    raw = await work();
  } catch (error) {
    emit({
      stage,
      status: "failed",
      at: nowIso(),
      error: toSerializedAIError(error, providerId),
    });
    throw error;
  }

  const checked = validate(raw);
  if (!checked.success) {
    const error = new AIError(
      "invalid_response",
      `The provider returned ${stage} output that does not match the model.`,
      { providerId, retryable: true },
    );
    emit({
      stage,
      status: "failed",
      at: nowIso(),
      error: { ...toSerializedAIError(error, providerId), issues: checked.issues },
    });
    throw error;
  }

  emit({
    stage,
    status: "succeeded",
    at: nowIso(),
    detail: detail ? detail(checked.data) : undefined,
  });
  return checked.data;
}

/** Validate a list of slide drafts, reporting per-slide issues. */
function validateDrafts(input: unknown): ReturnType<StageValidator<SlideDraft[]>> {
  if (!Array.isArray(input)) {
    return {
      success: false,
      issues: [{ path: "", message: "Expected an array of slide drafts.", code: "invalid_type" }],
    };
  }
  const parsed: SlideDraft[] = [];
  const issues: Array<{ path: string; message: string; code: string }> = [];
  input.forEach((draft, index) => {
    const result = slideDraftSchema.safeParse(draft);
    if (result.success) {
      parsed.push(result.data);
    } else {
      for (const issue of result.error.issues) {
        issues.push({
          path: `slides.${index}.${issue.path.join(".")}`,
          message: issue.message,
          code: issue.code,
        });
      }
    }
  });
  if (issues.length > 0) {
    return { success: false, issues };
  }
  return { success: true, data: parsed };
}

/**
 * Run the full generation pipeline and assemble a canonical Presentation.
 *
 * The returned Presentation is validated against the canonical schema before it
 * is handed back, so downstream renderers can rely on its shape.
 */
export async function generatePresentation(
  request: PresentationGenerationRequest,
  options: OrchestratorOptions = {},
): Promise<OrchestrationResult> {
  const provider = resolveProvider(options);
  const providerId = provider.descriptor.id;
  const emit = (event: GenerationEvent) => options.onProgress?.(event);
  const call = options.call;

  const understanding = await runStage(
    "understand",
    providerId,
    emit,
    () => provider.understand(request, call),
    (input) => validateWith(understandingBriefSchema, input),
    (value) => `${value.learningObjectives.length} learning objectives`,
  );

  const research = await runStage(
    "research",
    providerId,
    emit,
    () => provider.research(request, understanding, call),
    (input) => validateWith(researchBriefSchema, input),
    (value) => `${value.findings.length} findings`,
  );

  const narrative = await runStage(
    "narrative",
    providerId,
    emit,
    () => provider.buildNarrative(request, understanding, research, call),
    (input) => validateWith(narrativePlanSchema, input),
    (value) => `${value.beats.length} narrative beats`,
  );

  const outline = await runStage(
    "slidePlan",
    providerId,
    emit,
    () => provider.planSlides(request, narrative, call),
    (input) => validateWith(presentationOutlineSchema, input),
    (value) => `${value.slides.length} slides planned`,
  );

  const drafts = await runStage(
    "generate",
    providerId,
    emit,
    () => provider.generateSlideDrafts(request, outline, call),
    validateDrafts,
    (value) => `${value.length} slides written`,
  );

  const theme = DEFAULT_THEME;
  const slides = buildSlidesFromDrafts(drafts, { theme });

  const assembled = assemblePresentation(request, {
    outline,
    slides,
    metadata: {
      providerId,
      model: provider.descriptor.defaultModel ?? providerId,
      latencyMs: 0,
      generatedAt: nowIso(),
    },
  });

  const presentation = await runStage(
    "validate",
    providerId,
    emit,
    async () => assembled,
    (input) => {
      const result = validatePresentation(input);
      return result.success
        ? { success: true as const, data: result.data }
        : { success: false as const, issues: result.issues };
    },
    (value) => `${value.slides.length} slides validated`,
  );

  const pipeline: GenerationPipelineOutput = {
    understanding,
    research,
    narrative,
    outline,
    drafts,
  };

  const result: PresentationGenerationResult = {
    outline,
    slides: presentation.slides,
    metadata: {
      providerId,
      model: provider.descriptor.defaultModel ?? providerId,
      latencyMs: 0,
      generatedAt: nowIso(),
    },
  };

  return { presentation, outline, result, pipeline };
}

/** Plan an outline for a generation request. */
export async function planOutline(
  request: OutlineGenerationRequest,
  options: OrchestratorOptions = {},
): Promise<PresentationOutline> {
  const provider = resolveProvider(options);
  return provider.generateOutline(request, options.call);
}

/** Generate slides for an existing outline. */
export async function generateSlidesForOutline(
  request: PresentationGenerationRequest,
  outline: PresentationOutline,
  options: OrchestratorOptions = {},
) {
  const provider = resolveProvider(options);
  return provider.generateSlides({ request, outline }, options.call);
}

export interface AssembleInput {
  outline: PresentationOutline;
  slides: Presentation["slides"];
  metadata: PresentationGenerationResult["metadata"];
}

/**
 * Assemble a canonical Presentation from a generation request and pipeline
 * output. The theme is resolved from the request, falling back to the default
 * workspace theme. Slide metadata records AI provenance and the schema version.
 */
export function assemblePresentation(
  request: PresentationGenerationRequest,
  input: AssembleInput,
): Presentation {
  const theme = DEFAULT_THEME;
  const dimensions = dimensionsForAspectRatio(request.aspectRatio ?? theme.aspectRatio);

  const slides =
    input.slides.length > 0
      ? input.slides.map((slide) => ({
          ...slide,
          metadata: {
            ...slide.metadata,
            source: "ai" as const,
            schemaVersion: PRESENTATION_SCHEMA_VERSION,
            dimensions: slide.metadata.dimensions ?? dimensions,
          },
        }))
      : input.outline.slides.map((entry) =>
          createSlide({
            title: entry.title,
            narrativeRole: entry.narrativeRole,
            layout: entry.layout,
            theme,
          }),
        );

  const presentation = createPresentation({
    title: input.outline.title,
    description: input.outline.description,
    audience: {
      label: request.audience.label,
      description: request.audience.description,
    },
    purpose: {
      label: request.purpose.label,
      description: request.purpose.description,
      durationMinutes: request.purpose.durationMinutes,
    },
    subject: {
      name: request.subject.name,
      topic: request.subject.topic,
      gradeLevel: request.subject.gradeLevel ?? request.gradeLevel,
      standards: request.subject.standards,
    },
    gradeLevel: request.gradeLevel,
    language: request.language ?? "en-US",
    theme,
    slides,
    source: { kind: "ai" },
    metadata: {
      schemaVersion: PRESENTATION_SCHEMA_VERSION,
      providerId: input.metadata.providerId,
      model: input.metadata.model,
      generatedAt: input.metadata.generatedAt ?? nowIso(),
    },
  });

  return normalizePresentation(presentation);
}
