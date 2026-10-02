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

/**
 * The ordered stages of the generation pipeline.
 *
 * The orchestrator runs these in sequence and reports progress per stage. The
 * names are stable so the UI, the API and the logs agree on what "stage 3"
 * means.
 */
export type GenerationStage =
  | "understand"
  | "research"
  | "narrative"
  | "slidePlan"
  | "generate"
  | "validate";

export const GENERATION_STAGES: readonly GenerationStage[] = [
  "understand",
  "research",
  "narrative",
  "slidePlan",
  "generate",
  "validate",
] as const;

/** Lifecycle of a single pipeline stage. */
export type GenerationStageStatus = "pending" | "running" | "succeeded" | "failed";

/** Human-readable label and description for each stage. */
export interface GenerationStageDescriptor {
  stage: GenerationStage;
  label: string;
  description: string;
}

/**
 * A progress event emitted by the orchestrator as the pipeline advances.
 *
 * Events describe real application state. A stage only reports `succeeded`
 * after its work has completed and its output has been validated.
 */
export interface GenerationEvent {
  stage: GenerationStage;
  status: GenerationStageStatus;
  /** ISO-8601 timestamp of when the event was produced. */
  at: string;
  /** Present when a stage fails. */
  error?: SerializedAIError;
  /** Optional non-fatal detail, e.g. "planned 10 slides". */
  detail?: string;
}

/** What the pipeline understood about the request before generating. */
export interface UnderstandingBrief {
  /** The topic restated precisely, as the model understood it. */
  topic: string;
  /** One-sentence statement of what the presentation must achieve. */
  objective: string;
  /** Concrete learning objectives the deck should satisfy. */
  learningObjectives: string[];
  /** What the audience is assumed to already know. */
  priorKnowledge: string[];
  /** Assumptions made when the request was ambiguous. */
  assumptions: string[];
  /** Questions that could not be resolved from the request alone. */
  openQuestions: string[];
}

/** How well established a research finding is. */
export type ResearchConfidence = "established" | "emerging" | "uncertain";

/**
 * A single research finding.
 *
 * `source` is optional on purpose: the provider is instructed never to invent a
 * citation, URL or statistic. When it cannot attribute a finding to a real,
 * well-known source it must omit `source` rather than fabricate one.
 */
export interface ResearchFinding {
  id: string;
  /** Short label for the finding. */
  topic: string;
  /** One or two sentences stating the finding. */
  summary: string;
  confidence: ResearchConfidence;
  /** A real source, only when the provider can name one without inventing it. */
  source?: string;
}

/** The research stage output. */
export interface ResearchBrief {
  summary: string;
  findings: ResearchFinding[];
  /** Explicit note about what the research could not establish. */
  limitations: string[];
}

/** A beat in the presentation narrative. */
export interface NarrativeBeat {
  id: string;
  /** The narrative function this beat serves. */
  role: NarrativeRole;
  /** Why this beat exists in the story. */
  purpose: string;
  /** The single idea the audience should take from this beat. */
  keyMessage: string;
}

/** The narrative stage output: the story before it becomes slides. */
export interface NarrativePlan {
  title: string;
  description: string;
  /** The through-line the whole deck argues. */
  thesis: string;
  /** The ordered beats of the story. */
  beats: NarrativeBeat[];
}

/**
 * A structured draft of a single slide, as produced by a provider.
 *
 * Drafts are deliberately content-shaped rather than element-shaped: the model
 * decides what a slide says, and `lib/presentation/builders.ts` decides how it
 * is laid out as canonical `SlideElement`s. This keeps layout policy in the
 * application instead of in the AI.
 */
export interface SlideDraft {
  title: string;
  narrativeRole: NarrativeRole;
  layout: SlideLayout;
  /** Optional deck-position subtitle. */
  subtitle?: string;
  /** Body paragraphs, rendered as a text element. */
  paragraphs?: string[];
  /** Bullet items, rendered as a bulleted text element. */
  bullets?: string[];
  /** A highlighted callout, rendered as a shape with text. */
  callout?: string;
  /** A pull quote with optional attribution. */
  quote?: {
    text: string;
    attribution?: string;
  };
  /** Presenter narration for this slide. */
  speakerNotes?: string;
  /** Short presenter cues. */
  cues?: string[];
}

/** A provider-agnostic error, serializable across the API boundary. */
export interface SerializedAIError {
  code: string;
  message: string;
  retryable: boolean;
  providerId?: AIProviderId;
  /** Validation issues, when the failure was a schema mismatch. */
  issues?: Array<{ path: string; message: string; code: string }>;
}

/** Everything the pipeline produced, in order. */
export interface GenerationPipelineOutput {
  understanding: UnderstandingBrief;
  research: ResearchBrief;
  narrative: NarrativePlan;
  outline: PresentationOutline;
  drafts: SlideDraft[];
}

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

/**
 * The short prompt a user types into `/create`.
 *
 * This is the human-facing entry point: a single sentence such as
 * "Create a 10-slide presentation about the future of artificial
 * intelligence". The application turns it into a full
 * `PresentationGenerationRequest` using `parsePrompt` so the model is never
 * asked to guess the structure of its own input.
 */
export interface PromptGenerationRequest {
  /** The free-form prompt the user typed. */
  prompt: string;
  /** Optional overrides that take precedence over values parsed from the prompt. */
  overrides?: Partial<PresentationGenerationRequest>;
}

/** Human-readable descriptors for the pipeline stages, in order. */
export const GENERATION_STAGE_DESCRIPTORS: readonly GenerationStageDescriptor[] = [
  {
    stage: "understand",
    label: "Understanding",
    description: "Reading the request, audience and constraints.",
  },
  {
    stage: "research",
    label: "Researching",
    description: "Gathering well-established background and noting what is uncertain.",
  },
  {
    stage: "narrative",
    label: "Building narrative",
    description: "Deciding the story the deck will tell.",
  },
  {
    stage: "slidePlan",
    label: "Planning slides",
    description: "Turning the narrative into a slide-by-slide plan.",
  },
  {
    stage: "generate",
    label: "Generating",
    description: "Writing the content for every planned slide.",
  },
  {
    stage: "validate",
    label: "Validating",
    description: "Checking the result against the canonical presentation model.",
  },
] as const;
