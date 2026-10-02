import { afterEach, describe, expect, it } from "vitest";

import { useGenerationStore } from "@/lib/store/generation-store";
import { usePresentationStore } from "@/lib/store/presentation-store";
import { parsePrompt } from "@/lib/ai/prompt";
import { generatePresentation } from "@/lib/ai/orchestrator";
import { clearProviders, registerProvider } from "@/lib/ai/providers/registry";
import { GENERATION_STAGES } from "@/types/ai";
import { TestProvider } from "./helpers/test-provider";

afterEach(() => {
  useGenerationStore.getState().reset();
  usePresentationStore.getState().clear();
  clearProviders();
});

describe("generation store", () => {
  it("starts idle with every stage pending", () => {
    const state = useGenerationStore.getState();
    expect(state.status).toBe("idle");
    expect(Object.values(state.stages).every((s) => s === "pending")).toBe(true);
  });

  it("advances a stage only when its event arrives", () => {
    const store = useGenerationStore.getState();
    store.begin("a topic");
    expect(useGenerationStore.getState().status).toBe("running");

    store.applyEvent({ stage: "understand", status: "running", at: "t1" });
    let state = useGenerationStore.getState();
    expect(state.stages.understand).toBe("running");
    expect(state.stages.research).toBe("pending");

    store.applyEvent({
      stage: "understand",
      status: "succeeded",
      at: "t2",
      detail: "3 learning objectives",
    });
    state = useGenerationStore.getState();
    expect(state.stages.understand).toBe("succeeded");
    expect(state.details.understand).toBe("3 learning objectives");
    expect(state.events).toHaveLength(2);
  });

  it("records a failure without inventing a presentation", () => {
    const store = useGenerationStore.getState();
    store.begin("a topic");
    store.fail({ code: "provider_not_configured", message: "no key", retryable: false });
    const state = useGenerationStore.getState();
    expect(state.status).toBe("failed");
    expect(state.presentation).toBeNull();
    expect(state.error?.code).toBe("provider_not_configured");
  });

  it("reset clears everything", () => {
    const store = useGenerationStore.getState();
    store.begin("a topic");
    store.fail({ code: "timeout", message: "slow", retryable: true });
    store.reset();
    const state = useGenerationStore.getState();
    expect(state.status).toBe("idle");
    expect(state.error).toBeNull();
    expect(state.events).toEqual([]);
  });
});

describe("presentation store", () => {
  async function makePresentation() {
    registerProvider("test", () => new TestProvider());
    const { presentation } = await generatePresentation(
      parsePrompt("Create a 3-slide presentation about the water cycle"),
    );
    return presentation;
  }

  it("loads a presentation and selects its first slide", async () => {
    const presentation = await makePresentation();
    const store = usePresentationStore.getState();
    store.load(presentation);
    const state = usePresentationStore.getState();
    expect(state.presentation?.id).toBe(presentation.id);
    expect(state.selectedSlideId).toBe(presentation.slides[0].id);
    expect(state.dirty).toBe(false);
  });

  it("edits a slide title through the model helpers", async () => {
    const presentation = await makePresentation();
    const store = usePresentationStore.getState();
    store.load(presentation);
    const slideId = presentation.slides[0].id;

    store.patchSlide(slideId, { title: "A new title" });
    const state = usePresentationStore.getState();
    expect(state.presentation?.slides[0].title).toBe("A new title");
    expect(state.dirty).toBe(true);
  });

  it("edits body text without touching the title", async () => {
    const presentation = await makePresentation();
    const store = usePresentationStore.getState();
    store.load(presentation);
    const slide = presentation.slides[1];
    const originalTitle = slide.title;

    store.setSlideBodyText(slide.id, ["New line one", "New line two"]);
    const updated = usePresentationStore
      .getState()
      .presentation?.slides.find((s) => s.id === slide.id);
    expect(updated?.title).toBe(originalTitle);
  });

  it("selects a slide by id", async () => {
    const presentation = await makePresentation();
    const store = usePresentationStore.getState();
    store.load(presentation);
    const target = presentation.slides[1].id;
    store.selectSlide(target);
    expect(usePresentationStore.getState().selectedSlideId).toBe(target);
  });
});

describe("pipeline stage coverage", () => {
  it("runs stages in the canonical order", () => {
    expect(GENERATION_STAGES[0]).toBe("understand");
    expect(GENERATION_STAGES.at(-1)).toBe("validate");
  });
});
