/**
 * OpenAI-compatible AI provider.
 *
 * Implements the `AIProvider` contract against any endpoint that speaks the
 * OpenAI `/chat/completions` shape: OpenAI itself, Groq, Together, OpenRouter
 * and self-hosted servers. The vendor-specific details live in this folder and
 * nowhere else, so the rest of the application keeps depending on `AIProvider`.
 *
 * The provider is configured entirely from the environment. No credential is
 * ever hard-coded, and `isConfigured()` reports honestly when the key is
 * missing so the orchestrator can raise `provider_not_configured` instead of
 * attempting a doomed request.
 */

import { nowIso } from "@/lib/utils/helpers";
import type {
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
import type { AIProvider, ProviderDescriptor } from "../../provider";
import { AIError, type ProviderCallOptions, type ProviderConfig } from "../../types";
import { buildSlideFromDraft } from "@/lib/presentation/builders";
import { DEFAULT_THEME } from "@/lib/presentation/defaults";
import {
  createChatCompletion,
  DEFAULT_TIMEOUT_MS,
  extractJsonObject,
  type ChatMessage,
} from "./http";
import {
  narrativePrompt,
  researchPrompt,
  slideContentPrompt,
  slidePlanPrompt,
  SYSTEM_PROMPT,
  understandPrompt,
} from "./prompts";

export const OPENAI_COMPATIBLE_PROVIDER_ID = "openai-compatible";

/** Environment variables this provider reads. */
export const ENV_KEYS = {
  apiKey: "SLIDESFORGE_AI_API_KEY",
  baseUrl: "SLIDESFORGE_AI_BASE_URL",
  model: "SLIDESFORGE_AI_MODEL",
  timeoutMs: "SLIDESFORGE_AI_TIMEOUT_MS",
} as const;

/** Default endpoint and model when the environment does not override them. */
export const DEFAULTS = {
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-4o-mini",
  timeoutMs: DEFAULT_TIMEOUT_MS,
} as const;

export const openAICompatibleDescriptor: ProviderDescriptor = {
  id: OPENAI_COMPATIBLE_PROVIDER_ID,
  label: "OpenAI-compatible",
  description:
    "Structured presentation generation through any OpenAI-compatible chat-completions endpoint.",
  capabilities: ["outline", "slides", "research"],
  defaultModel: DEFAULTS.model,
};

/** Read the provider configuration from the environment. */
export function readProviderConfigFromEnv(
  env: Record<string, string | undefined> = process.env,
): ProviderConfig {
  const timeoutRaw = env[ENV_KEYS.timeoutMs];
  const timeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : Number.NaN;
  return {
    apiKey: env[ENV_KEYS.apiKey]?.trim() || undefined,
    baseUrl: env[ENV_KEYS.baseUrl]?.trim() || DEFAULTS.baseUrl,
    defaultModel: env[ENV_KEYS.model]?.trim() || DEFAULTS.model,
    enabled: Boolean(env[ENV_KEYS.apiKey]?.trim()),
    timeoutMs: Number.isFinite(timeout) ? timeout : DEFAULTS.timeoutMs,
  };
}

/** Configuration accepted by the provider. */
export type OpenAICompatibleProviderConfig = ProviderConfig;

/**
 * The provider implementation.
 *
 * Each stage is a separate request. That costs a few more calls than one large
 * prompt, but it means every intermediate result can be validated on its own,
 * which is what makes honest per-stage progress possible.
 */
export class OpenAICompatibleProvider implements AIProvider {
  readonly descriptor = openAICompatibleDescriptor;
  private readonly config: OpenAICompatibleProviderConfig;

  constructor(config: OpenAICompatibleProviderConfig = {}) {
    this.config = config;
  }

  isConfigured(): boolean {
    return Boolean(this.config.apiKey && this.config.apiKey.trim().length > 0);
  }

  private get apiKey(): string {
    if (!this.isConfigured()) {
      throw new AIError(
        "provider_not_configured",
        `Set ${ENV_KEYS.apiKey} to enable AI generation.`,
        { providerId: this.descriptor.id, retryable: false },
      );
    }
    return this.config.apiKey as string;
  }

  private get model(): string {
    return this.config.defaultModel?.trim() || DEFAULTS.model;
  }

  private get timeoutMs(): number {
    return this.config.timeoutMs && this.config.timeoutMs > 0
      ? this.config.timeoutMs
      : DEFAULTS.timeoutMs;
  }

  /** Run one stage request and return the parsed JSON object. */
  private async callJson(
    userPrompt: string,
    options?: ProviderCallOptions,
  ): Promise<unknown> {
    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ];

    const result = await createChatCompletion(
      {
        apiKey: this.apiKey,
        baseUrl: this.config.baseUrl ?? DEFAULTS.baseUrl,
        providerId: this.descriptor.id,
        timeoutMs: options?.timeoutMs ?? this.timeoutMs,
      },
      {
        model: options?.model ?? this.model,
        messages,
        jsonObject: true,
        temperature: 0.4,
      },
      options?.signal,
    );

    return extractJsonObject(result.content);
  }

  async understand(
    request: OutlineGenerationRequest,
    options?: ProviderCallOptions,
  ): Promise<UnderstandingBrief> {
    return (await this.callJson(understandPrompt(request), options)) as UnderstandingBrief;
  }

  async research(
    request: OutlineGenerationRequest,
    understanding: UnderstandingBrief,
    options?: ProviderCallOptions,
  ): Promise<ResearchBrief> {
    return (await this.callJson(
      researchPrompt(request, understanding),
      options,
    )) as ResearchBrief;
  }

  async buildNarrative(
    request: OutlineGenerationRequest,
    understanding: UnderstandingBrief,
    research: ResearchBrief,
    options?: ProviderCallOptions,
  ): Promise<NarrativePlan> {
    return (await this.callJson(
      narrativePrompt(request, understanding, research),
      options,
    )) as NarrativePlan;
  }

  async planSlides(
    request: OutlineGenerationRequest,
    narrative: NarrativePlan,
    options?: ProviderCallOptions,
  ): Promise<PresentationOutline> {
    return (await this.callJson(
      slidePlanPrompt(request, narrative),
      options,
    )) as PresentationOutline;
  }

  async generateSlideDrafts(
    request: OutlineGenerationRequest,
    outline: PresentationOutline,
    options?: ProviderCallOptions,
  ): Promise<SlideDraft[]> {
    const raw = (await this.callJson(slideContentPrompt(request, outline), options)) as {
      slides?: SlideDraft[];
    };
    if (!raw || !Array.isArray(raw.slides)) {
      throw new AIError(
        "invalid_response",
        'The provider response did not contain a "slides" array.',
        { providerId: this.descriptor.id, retryable: true },
      );
    }
    return raw.slides;
  }

  /** Plan an outline by composing the understand → narrative → plan stages. */
  async generateOutline(
    request: OutlineGenerationRequest,
    options?: ProviderCallOptions,
  ): Promise<PresentationOutline> {
    const understanding = await this.understand(request, options);
    const research = await this.research(request, understanding, options);
    const narrative = await this.buildNarrative(request, understanding, research, options);
    return this.planSlides(request, narrative, options);
  }

  /** Expand an outline into canonical slides. */
  async generateSlides(
    request: SlideGenerationRequest,
    options?: ProviderCallOptions,
  ): Promise<Slide[]> {
    const drafts = await this.generateSlideDrafts(request.request, request.outline, options);
    return drafts.map((draft) => buildSlideFromDraft(draft, { theme: DEFAULT_THEME }));
  }

  /** Run every stage and return a complete result. */
  async generatePresentation(
    request: OutlineGenerationRequest,
    options?: ProviderCallOptions,
  ): Promise<PresentationGenerationResult> {
    const understanding = await this.understand(request, options);
    const research = await this.research(request, understanding, options);
    const narrative = await this.buildNarrative(request, understanding, research, options);
    const outline = await this.planSlides(request, narrative, options);
    const drafts = await this.generateSlideDrafts(request, outline, options);

    return {
      outline,
      slides: drafts.map((draft) => buildSlideFromDraft(draft, { theme: DEFAULT_THEME })),
      metadata: {
        providerId: this.descriptor.id,
        model: options?.model ?? this.model,
        latencyMs: 0,
        generatedAt: nowIso(),
      },
    };
  }
}
