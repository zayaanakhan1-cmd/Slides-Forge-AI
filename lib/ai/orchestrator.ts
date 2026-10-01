/**
 * AI orchestrator.
 *
 * The orchestrator is the only place that sequences AI work. It accepts a
 * structured generation request, resolves a provider through the registry,
 * plans an outline, expands it into slides and assembles a canonical
 * Presentation that conforms to the model.
 *
 * It never fabricates content. When no provider is configured it raises
 * `AIProviderUnavailableError` so the caller can show an honest empty state.
 */

import { nowIso } from "@/lib/utils/helpers";
import {
  createPresentation,
  createSlide,
  dimensionsForAspectRatio,
  DEFAULT_THEME,
  normalizePresentation,
  validatePresentation,
} from "@/lib/presentation";
import { PRESENTATION_SCHEMA_VERSION } from "@/types/presentation";
import type { Presentation } from "@/types/presentation";
import type {
  OutlineGenerationRequest,
  PresentationGenerationRequest,
  PresentationGenerationResult,
  PresentationOutline,
} from "@/types/ai";
import type { AIProvider } from "./provider";
import type { ProviderCallOptions } from "./types";
import { AIProviderUnavailableError } from "./types";
import { getConfiguredProvider, getProvider } from "./providers/registry";

export interface OrchestratorOptions {
  /** Explicit provider to use; otherwise the first configured provider wins. */
  providerId?: string;
  /** Per-call options forwarded to the provider. */
  call?: ProviderCallOptions;
}

export interface OrchestrationResult {
  presentation: Presentation;
  outline: PresentationOutline;
  result: PresentationGenerationResult;
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

/** Plan an outline for a generation request. */
export async function planOutline(
  request: OutlineGenerationRequest,
  options: OrchestratorOptions = {},
): Promise<PresentationOutline> {
  const provider = resolveProvider(options);
  return provider.generateOutline(request, options.call);
}

/**
 * Generate a complete presentation.
 *
 * The returned Presentation is validated against the canonical schema before it
 * is handed back, so downstream renderers can rely on its shape.
 */
export async function generatePresentation(
  request: PresentationGenerationRequest,
  options: OrchestratorOptions = {},
): Promise<OrchestrationResult> {
  const provider = resolveProvider(options);
  const result = await provider.generatePresentation(request, options.call);

  const presentation = assemblePresentation(request, result);

  const validation = validatePresentation(presentation);
  if (!validation.success) {
    throw new Error(
      `AI provider "${provider.descriptor.id}" returned a presentation that does not match the model: ` +
        validation.issues.map((issue) => `${issue.path} ${issue.message}`).join("; "),
    );
  }

  return { presentation: validation.data, outline: result.outline, result };
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

/**
 * Assemble a canonical Presentation from a generation request and provider
 * result. The theme is resolved from the request, falling back to the default
 * workspace theme. Slide metadata records AI provenance and the schema version.
 */
export function assemblePresentation(
  request: PresentationGenerationRequest,
  result: PresentationGenerationResult,
): Presentation {
  const theme = DEFAULT_THEME;
  const dimensions = dimensionsForAspectRatio(
    request.aspectRatio ?? theme.aspectRatio,
  );

  const slides =
    result.slides.length > 0
      ? result.slides.map((slide) => ({
          ...slide,
          metadata: {
            ...slide.metadata,
            source: "ai" as const,
            schemaVersion: PRESENTATION_SCHEMA_VERSION,
            dimensions: slide.metadata.dimensions ?? dimensions,
          },
        }))
      : result.outline.slides.map((entry) =>
          createSlide({
            title: entry.title,
            narrativeRole: entry.narrativeRole,
            layout: entry.layout,
            theme,
          }),
        );

  const presentation = createPresentation({
    title: result.outline.title,
    description: result.outline.description,
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
      providerId: result.metadata.providerId,
      model: result.metadata.model,
      generatedAt: result.metadata.generatedAt ?? nowIso(),
    },
  });

  return normalizePresentation(presentation);
}
