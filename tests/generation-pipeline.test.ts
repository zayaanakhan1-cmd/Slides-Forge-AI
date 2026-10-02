import { afterEach, describe, expect, it, vi } from "vitest";

import { generatePresentation } from "@/lib/ai/orchestrator";
import { clearProviders, registerProvider } from "@/lib/ai/providers/registry";
import { AIError, AIProviderUnavailableError } from "@/lib/ai/types";
import { validatePresentation } from "@/lib/presentation/validation";
import { GENERATION_STAGES } from "@/types/ai";
import type { GenerationEvent } from "@/types/ai";
import { TestProvider, testRequest } from "./helpers/test-provider";

afterEach(() => {
  clearProviders();
  vi.restoreAllMocks();
});

describe("generation pipeline", () => {
  it("runs every stage in order and returns a valid presentation", async () => {
    registerProvider("test", () => new TestProvider());
    const events: GenerationEvent[] = [];

    const { presentation, pipeline } = await generatePresentation(testRequest(), {
      onProgress: (event) => events.push(event),
    });

    const started = events
      .filter((event) => event.status === "running")
      .map((event) => event.stage);
    expect(started).toEqual([...GENERATION_STAGES]);

    const succeeded = events
      .filter((event) => event.status === "succeeded")
      .map((event) => event.stage);
    expect(succeeded).toEqual([...GENERATION_STAGES]);

    expect(validatePresentation(presentation).success).toBe(true);
    expect(presentation.slides).toHaveLength(3);
    expect(presentation.source?.kind).toBe("ai");
    expect(pipeline.understanding.learningObjectives).toHaveLength(3);
    expect(pipeline.research.findings).toHaveLength(1);
    expect(pipeline.narrative.beats).toHaveLength(3);
    expect(pipeline.outline.slides).toHaveLength(3);
    expect(pipeline.drafts).toHaveLength(3);
  });

  it("builds slides whose elements are real canonical elements", async () => {
    registerProvider("test", () => new TestProvider());
    const { presentation } = await generatePresentation(testRequest());

    const firstSlide = presentation.slides[0];
    expect(firstSlide.elements.length).toBeGreaterThan(0);
    for (const element of firstSlide.elements) {
      expect(typeof element.id).toBe("string");
      expect(element.position.x).toBeGreaterThanOrEqual(0);
      expect(element.size.width).toBeGreaterThan(0);
    }
    expect(firstSlide.metadata.source).toBe("ai");
  });

  it("reports per-stage detail describing what actually happened", async () => {
    registerProvider("test", () => new TestProvider());
    const events: GenerationEvent[] = [];
    await generatePresentation(testRequest(), { onProgress: (event) => events.push(event) });

    const slidePlan = events.find(
      (event) => event.stage === "slidePlan" && event.status === "succeeded",
    );
    expect(slidePlan?.detail).toContain("3");
  });

  it("fails with provider_not_configured when nothing is registered", async () => {
    await expect(generatePresentation(testRequest())).rejects.toBeInstanceOf(
      AIProviderUnavailableError,
    );
  });

  it("fails when the only provider is registered but unconfigured", async () => {
    registerProvider("test", () => new TestProvider({ enabled: false }));
    await expect(generatePresentation(testRequest())).rejects.toBeInstanceOf(
      AIProviderUnavailableError,
    );
  });

  it("stops at the failing stage and emits a failed event", async () => {
    registerProvider("test", () => new TestProvider({}, { failAt: "narrative" }));
    const events: GenerationEvent[] = [];

    await expect(
      generatePresentation(testRequest(), { onProgress: (event) => events.push(event) }),
    ).rejects.toBeInstanceOf(AIError);

    const failed = events.filter((event) => event.status === "failed");
    expect(failed).toHaveLength(1);
    expect(failed[0].stage).toBe("narrative");
    expect(failed[0].error?.code).toBe("provider_unavailable");

    // Later stages must never have run.
    const runningStages = events.filter((e) => e.status === "running").map((e) => e.stage);
    expect(runningStages).not.toContain("slidePlan");
    expect(runningStages).not.toContain("generate");
  });

  it.each(["understand", "research", "narrative", "slidePlan", "generate"] as const)(
    "rejects malformed output from the %s stage",
    async (stage) => {
      registerProvider("test", () => new TestProvider({}, { corruptAt: stage }));
      const events: GenerationEvent[] = [];

      await expect(
        generatePresentation(testRequest(), { onProgress: (event) => events.push(event) }),
      ).rejects.toMatchObject({ code: "invalid_response" });

      const failed = events.find((event) => event.status === "failed");
      expect(failed?.stage).toBe(stage);
      expect(failed?.error?.issues?.length).toBeGreaterThan(0);
    },
  );

  it("rejects a presentation that fails canonical validation", async () => {
    registerProvider("test", () => new TestProvider());
    const { presentation } = await generatePresentation(testRequest());
    // The canonical schema requires a non-empty title.
    const result = validatePresentation({ ...presentation, title: "" });
    expect(result.success).toBe(false);
  });
});
