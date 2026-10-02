/**
 * AI provider abstraction.
 *
 * The application never imports Gemini, Groq or OpenAI directly. Instead it
 * depends on this interface and resolves a concrete provider through the
 * registry in `providers/registry.ts`. Swapping or adding a provider is a
 * registration change, not an application change.
 *
 * Phase 1 ships the interface and registry only. No network calls are made and
 * no provider is registered by default.
 */

import type {
  AIProviderId,
  NarrativePlan,
  OutlineGenerationRequest,
  PresentationGenerationResult,
  PresentationOutline,
  ResearchBrief,
  SlideDraft,
  SlideGenerationRequest,
  UnderstandingBrief,
} from "@/types/ai";
import type { Slide } from "@/types/slide";
import type { ProviderCallOptions, ProviderConfig } from "./types";

/** A capability a provider may or may not support. */
export type ProviderCapability =
  | "outline"
  | "slides"
  | "research"
  | "quality"
  | "streaming";

/** Static description of a provider, safe to render in the UI. */
export interface ProviderDescriptor {
  id: AIProviderId;
  /** Display name, e.g. "Google Gemini". */
  label: string;
  /** One-line description of the provider. */
  description: string;
  /** Capabilities the provider implements. */
  capabilities: ProviderCapability[];
  /** Default model id used when a call does not specify one. */
  defaultModel?: string;
}

/**
 * The contract every AI provider must satisfy.
 *
 * Implementations are responsible for translating between the provider-agnostic
 * request/response types and their own SDK. They must return structured
 * presentation data, never UI instructions.
 *
 * The five stage methods mirror the product pipeline (understand, research,
 * narrative, slide plan, generate). Each stage takes the previous stage's
 * validated output, so a provider cannot skip ahead or invent its own context.
 * The aggregate methods remain for callers that want a single call.
 */
export interface AIProvider {
  readonly descriptor: ProviderDescriptor;
  /** Whether the provider has the credentials it needs to run. */
  isConfigured(): boolean;

  /** Stage 1 — interpret the request into an explicit brief. */
  understand(
    request: OutlineGenerationRequest,
    options?: ProviderCallOptions,
  ): Promise<UnderstandingBrief>;

  /** Stage 2 — gather well-established background for the brief. */
  research(
    request: OutlineGenerationRequest,
    understanding: UnderstandingBrief,
    options?: ProviderCallOptions,
  ): Promise<ResearchBrief>;

  /** Stage 3 — decide the story the deck will tell. */
  buildNarrative(
    request: OutlineGenerationRequest,
    understanding: UnderstandingBrief,
    research: ResearchBrief,
    options?: ProviderCallOptions,
  ): Promise<NarrativePlan>;

  /** Stage 4 — turn the narrative into a slide-by-slide plan. */
  planSlides(
    request: OutlineGenerationRequest,
    narrative: NarrativePlan,
    options?: ProviderCallOptions,
  ): Promise<PresentationOutline>;

  /** Stage 5 — write the content for every planned slide. */
  generateSlideDrafts(
    request: OutlineGenerationRequest,
    outline: PresentationOutline,
    options?: ProviderCallOptions,
  ): Promise<SlideDraft[]>;

  /** Plan a presentation outline. */
  generateOutline(
    request: OutlineGenerationRequest,
    options?: ProviderCallOptions,
  ): Promise<PresentationOutline>;
  /** Expand an outline into structured slides. */
  generateSlides(
    request: SlideGenerationRequest,
    options?: ProviderCallOptions,
  ): Promise<Slide[]>;
  /** Generate a complete result in one call, when the provider supports it. */
  generatePresentation(
    request: OutlineGenerationRequest,
    options?: ProviderCallOptions,
  ): Promise<PresentationGenerationResult>;
}

/** Factory signature used by the registry to construct providers lazily. */
export type AIProviderFactory = (config: ProviderConfig) => AIProvider;
