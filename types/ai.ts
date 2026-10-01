/**
 * AI model.
 *
 * These types describe the contract between the application and any AI
 * provider. The application sends a structured generation request and expects
 * structured presentation data back. Providers are never referenced by name in
 * application logic; they are resolved through the provider registry.
 */

import type { JsonObject } from "./json";
import type { NarrativeRole, SlideLayout } from "./slide";
import type { AspectRatio } from "./theme";
import type { DestinationKind } from "./destination";

/** A provider the orchestrator can use to generate presentations. */
export type AIProviderId = string;

/** How demanding a generation request is, used for model selection. */
export type AIComplexity = "light" | "standard" | "deep";

/** A single outline entry requested from the AI. */
export interface SlidePlanEntry {
  /** Working title for the slide. */
  title: string;
  /** The narrative function this slide should serve. */
  narrativeRole: NarrativeRole;
  /** Preferred layout for the slide. */
  layout: SlideLayout;
  /** Key points the slide must cover. */
  keyPoints: string[];
  /** Optional research or evidence the slide should draw on. */
  research?: string[];
}

/** A structured request to generate a presentation. */
export interface PresentationGenerationRequest {
  /** What the presentation should teach or communicate. */
  topic: string;
  /** Short description of the desired outcome. */
  description?: string;
  audience: {
    label: string;
    description?: string;
  };
  purpose: {
    label: string;
    description?: string;
    durationMinutes?: number;
  };
  subject: {
    name: string;
    topic?: string;
    gradeLevel?: string;
    standards?: string[];
  };
  gradeLevel: string;
  /** Preferred slide count; the AI may adjust within a small tolerance. */
  slideCount?: number;
  /** Preferred aspect ratio for the deck. */
  aspectRatio?: AspectRatio;
  /** Language tag for generated content, e.g. "en-US". */
  language?: string;
  /** How much depth to invest in the response. */
  complexity?: AIComplexity;
  /** Theme identifier to apply; the orchestrator falls back to a default. */
  themeId?: string;
  /** Free-form constraints or instructions to respect. */
  constraints?: string[];
  /** Optional target destinations the output should be optimised for. */
  targetDestinations?: DestinationKind[];
  /** Additional provider-agnostic options. */
  options?: JsonObject;
}

/** The result of planning a presentation outline. */
export interface PresentationOutline {
  title: string;
  description: string;
  /** One entry per planned slide, in presentation order. */
  slides: SlidePlanEntry[];
}

/** Token and cost accounting reported by a provider, when available. */
export interface AIUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCostUsd?: number;
}

/** Metadata about a single provider call. */
export interface AIResponseMetadata {
  providerId: AIProviderId;
  model: string;
  /** Wall-clock latency in milliseconds. */
  latencyMs: number;
  usage?: AIUsage;
  /** ISO-8601 timestamp of when the response was produced. */
  generatedAt: string;
}

/**
 * The structured output of a generation request.
 *
 * `outline` is always present so a caller can inspect the plan even when slide
 * body generation is not yet implemented.
 */
export interface PresentationGenerationResult {
  outline: PresentationOutline;
  /** Draft slides. Empty until a provider implements slide body generation. */
  slides: import("./slide").Slide[];
  metadata: AIResponseMetadata;
  /** Non-fatal warnings, e.g. an outline longer than requested. */
  warnings?: string[];
}

/** A structured request to plan a presentation outline only. */
export type OutlineGenerationRequest = PresentationGenerationRequest;

/** A structured request to expand an outline into full slides. */
export interface SlideGenerationRequest {
  request: PresentationGenerationRequest;
  outline: PresentationOutline;
}

/** A provider-agnostic error raised by a provider call. */
export interface AIProviderError {
  providerId: AIProviderId;
  code: string;
  message: string;
  /** Whether retrying the same request could succeed. */
  retryable: boolean;
}
