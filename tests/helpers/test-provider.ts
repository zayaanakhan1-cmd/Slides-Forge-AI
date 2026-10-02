/**
 * Test provider.
 *
 * A deterministic in-memory `AIProvider` used to exercise the real pipeline
 * without calling an external API. It is a test double, not production code: it
 * exists so the orchestrator, validation and API error handling can be tested
 * end to end.
 *
 * It returns structured data that conforms to the model, so tests cover the
 * real code path — the same `runStage` validation and the same presentation
 * assembly that a real provider would go through.
 */

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
import type { AIProvider, ProviderDescriptor } from "@/lib/ai/provider";
import { AIError, type ProviderCallOptions, type ProviderConfig } from "@/lib/ai/types";
import { buildSlideFromDraft } from "@/lib/presentation/builders";
import { DEFAULT_THEME } from "@/lib/presentation/defaults";
import { nowIso } from "@/lib/utils/helpers";

export interface TestProviderBehaviour {
  /** Throw this error from the chosen stage. */
  failAt?: "understand" | "research" | "narrative" | "slidePlan" | "generate";
  /** Return malformed data from the chosen stage, to test validation. */
  corruptAt?: "understand" | "research" | "narrative" | "slidePlan" | "generate";
}

export class TestProvider implements AIProvider {
  readonly descriptor: ProviderDescriptor;

  readonly behaviour: TestProviderBehaviour;
  private readonly configured: boolean;

  constructor(
    config: ProviderConfig = {},
    behaviour: TestProviderBehaviour = {},
    id = "test",
  ) {
    this.configured = config.enabled ?? true;
    this.behaviour = behaviour;
    this.descriptor = {
      id,
      label: "Test provider",
      description: "Deterministic provider used by the test suite.",
      capabilities: ["outline", "slides", "research"],
      defaultModel: "test-model",
    };
  }

  isConfigured(): boolean {
    return this.configured;
  }

  private guard(stage: NonNullable<TestProviderBehaviour["failAt"]>): void {
    if (this.behaviour.failAt === stage) {
      throw new AIError("provider_unavailable", `Test provider failed at ${stage}.`, {
        providerId: this.descriptor.id,
        retryable: true,
      });
    }
  }

  async understand(
    request: OutlineGenerationRequest,
    _options?: ProviderCallOptions,
  ): Promise<UnderstandingBrief> {
    this.guard("understand");
    if (this.behaviour.corruptAt === "understand") {
      // Missing required fields, wrong types: must be rejected by validation.
      return { topic: request.topic } as unknown as UnderstandingBrief;
    }
    return {
      topic: request.topic,
      objective: `Explain ${request.topic} to ${request.audience.label}.`,
      learningObjectives: ["Objective one", "Objective two", "Objective three"],
      priorKnowledge: ["Basic familiarity with the topic"],
      assumptions: request.constraints ?? [],
      openQuestions: [],
    };
  }

  async research(
    _request: OutlineGenerationRequest,
    _understanding: UnderstandingBrief,
    _options?: ProviderCallOptions,
  ): Promise<ResearchBrief> {
    this.guard("research");
    if (this.behaviour.corruptAt === "research") {
      return { findings: "not-an-array" } as unknown as ResearchBrief;
    }
    return {
      summary: "Established background for the topic.",
      findings: [
        {
          id: "f1",
          topic: "Background",
          summary: "A well-established finding with no invented citation.",
          confidence: "established",
        },
      ],
      limitations: ["This test provider does not perform real research."],
    };
  }

  async buildNarrative(
    _request: OutlineGenerationRequest,
    _understanding: UnderstandingBrief,
    _research: ResearchBrief,
    _options?: ProviderCallOptions,
  ): Promise<NarrativePlan> {
    this.guard("narrative");
    if (this.behaviour.corruptAt === "narrative") {
      return { beats: [] } as unknown as NarrativePlan;
    }
    return {
      title: "Test presentation",
      description: "A deterministic test deck.",
      thesis: "Testing the pipeline end to end.",
      beats: [
        { id: "b1", role: "title", purpose: "Open", keyMessage: "Welcome" },
        { id: "b2", role: "concept", purpose: "Explain", keyMessage: "The core idea" },
        { id: "b3", role: "summary", purpose: "Close", keyMessage: "Recap" },
      ],
    };
  }

  async planSlides(
    _request: OutlineGenerationRequest,
    _narrative: NarrativePlan,
    _options?: ProviderCallOptions,
  ): Promise<PresentationOutline> {
    this.guard("slidePlan");
    if (this.behaviour.corruptAt === "slidePlan") {
      return { title: "x", description: "", slides: "nope" } as unknown as PresentationOutline;
    }
    return {
      title: "Test presentation",
      description: "A deterministic test deck.",
      slides: [
        { title: "Welcome", narrativeRole: "title", layout: "title", keyPoints: ["Intro"] },
        { title: "The idea", narrativeRole: "concept", layout: "title-and-content", keyPoints: ["A", "B"] },
        { title: "Recap", narrativeRole: "summary", layout: "title-and-content", keyPoints: ["Done"] },
      ],
    };
  }

  async generateSlideDrafts(
    _request: OutlineGenerationRequest,
    outline: PresentationOutline,
    _options?: ProviderCallOptions,
  ): Promise<SlideDraft[]> {
    this.guard("generate");
    if (this.behaviour.corruptAt === "generate") {
      return [{ title: 123 }] as unknown as SlideDraft[];
    }
    return outline.slides.map((slide) => ({
      title: slide.title,
      narrativeRole: slide.narrativeRole,
      layout: slide.layout,
      bullets: slide.keyPoints,
      speakerNotes: `Notes for ${slide.title}.`,
    }));
  }

  async generateOutline(
    request: OutlineGenerationRequest,
    options?: ProviderCallOptions,
  ): Promise<PresentationOutline> {
    const understanding = await this.understand(request, options);
    const research = await this.research(request, understanding, options);
    const narrative = await this.buildNarrative(request, understanding, research, options);
    return this.planSlides(request, narrative, options);
  }

  async generateSlides(
    request: SlideGenerationRequest,
    options?: ProviderCallOptions,
  ): Promise<Slide[]> {
    const drafts = await this.generateSlideDrafts(request.request, request.outline, options);
    return drafts.map((draft) => buildSlideFromDraft(draft, { theme: DEFAULT_THEME }));
  }

  async generatePresentation(
    request: OutlineGenerationRequest,
    options?: ProviderCallOptions,
  ): Promise<PresentationGenerationResult> {
    const outline = await this.generateOutline(request, options);
    const drafts = await this.generateSlideDrafts(request, outline, options);
    return {
      outline,
      slides: drafts.map((draft) => buildSlideFromDraft(draft, { theme: DEFAULT_THEME })),
      metadata: {
        providerId: this.descriptor.id,
        model: "test-model",
        latencyMs: 1,
        generatedAt: nowIso(),
      },
    };
  }
}

/** Build a structured request fixture for tests. */
export function testRequest(overrides: Partial<OutlineGenerationRequest> = {}): OutlineGenerationRequest {
  return {
    topic: "The water cycle",
    description: "Explain the water cycle.",
    audience: { label: "Grade 7 students" },
    purpose: { label: "Teach a lesson" },
    subject: { name: "Geography" },
    gradeLevel: "Grade 7",
    slideCount: 3,
    ...overrides,
  };
}
