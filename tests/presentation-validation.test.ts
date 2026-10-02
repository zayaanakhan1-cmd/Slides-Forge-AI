import { describe, expect, it } from "vitest";

import { parsePrompt } from "@/lib/ai/prompt";
import { buildSlideFromDraft } from "@/lib/presentation/builders";
import { DEFAULT_THEME } from "@/lib/presentation/defaults";
import { createPresentation } from "@/lib/presentation/factory";
import {
  deserializePresentation,
  serializePresentation,
} from "@/lib/presentation/serialization";
import { validatePresentation, validateSlide } from "@/lib/presentation/validation";
import { generatePresentation } from "@/lib/ai/orchestrator";
import { clearProviders, registerProvider } from "@/lib/ai/providers/registry";
import { TestProvider } from "./helpers/test-provider";
import { afterEach } from "vitest";

afterEach(() => clearProviders());

describe("canonical presentation validation", () => {
  it("accepts a presentation produced by the pipeline", async () => {
    registerProvider("test", () => new TestProvider());
    const { presentation } = await generatePresentation(parsePrompt("Teach the water cycle"));
    expect(validatePresentation(presentation).success).toBe(true);
  });

  it("rejects a presentation with no id", () => {
    const presentation = createPresentation({ title: "Valid" });
    const broken = { ...presentation, id: "" };
    expect(validatePresentation(broken).success).toBe(false);
  });

  it("rejects a presentation with an empty title", () => {
    const presentation = createPresentation({ title: "Valid" });
    expect(validatePresentation({ ...presentation, title: "" }).success).toBe(false);
  });

  it("rejects a presentation with an invalid theme colour", () => {
    const presentation = createPresentation({ title: "Valid" });
    const broken = {
      ...presentation,
      theme: {
        ...presentation.theme,
        colors: { ...presentation.theme.colors, accent: "not-a-colour" },
      },
    };
    expect(validatePresentation(broken).success).toBe(false);
  });

  it("reports the path of each validation issue", () => {
    const presentation = createPresentation({ title: "Valid" });
    const result = validatePresentation({ ...presentation, title: "" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.issues.some((issue) => issue.path === "title")).toBe(true);
  });
});

describe("slide validation", () => {
  it("accepts a slide built from a draft", () => {
    const slide = buildSlideFromDraft(
      {
        title: "Concept",
        narrativeRole: "concept",
        layout: "title-and-content",
        bullets: ["One", "Two"],
      },
      { theme: DEFAULT_THEME },
    );
    expect(validateSlide(slide).success).toBe(true);
  });

  it("rejects an element with an unknown type", () => {
    const slide = buildSlideFromDraft(
      { title: "X", narrativeRole: "custom", layout: "blank" },
      { theme: DEFAULT_THEME },
    );
    const broken = {
      ...slide,
      elements: [{ id: "e1", type: "hologram", position: { x: 0, y: 0 }, size: { width: 1, height: 1 }, zIndex: 0 }],
    };
    expect(validateSlide(broken).success).toBe(false);
  });

  it("rejects a slide whose narrative role is not in the union", () => {
    const slide = buildSlideFromDraft(
      { title: "X", narrativeRole: "custom", layout: "blank" },
      { theme: DEFAULT_THEME },
    );
    expect(validateSlide({ ...slide, narrativeRole: "intermission" }).success).toBe(false);
  });
});

describe("serialization round trip", () => {
  it("serializes and deserializes without losing the model", async () => {
    registerProvider("test", () => new TestProvider());
    const { presentation } = await generatePresentation(parsePrompt("Teach volcanoes"));

    const serialized = serializePresentation(presentation);
    const restored = deserializePresentation(serialized);

    expect(restored.success).toBe(true);
    if (!restored.success) return;
    expect(restored.data.id).toBe(presentation.id);
    expect(restored.data.slides).toHaveLength(presentation.slides.length);
    expect(restored.data.slides[0].elements).toEqual(presentation.slides[0].elements);
  });

  it("returns structured issues for invalid JSON", () => {
    const result = deserializePresentation("{ not json");
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.issues[0].code).toBe("invalid_json");
  });

  it("returns structured issues for JSON that is not a presentation", () => {
    const result = deserializePresentation(JSON.stringify({ hello: "world" }));
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.issues.length).toBeGreaterThan(0);
  });
});

describe("slide builders", () => {
  it("preserves bullet content as text runs", () => {
    const slide = buildSlideFromDraft(
      {
        title: "Steps",
        narrativeRole: "process",
        layout: "title-and-content",
        bullets: ["First", "Second", "Third"],
      },
      { theme: DEFAULT_THEME },
    );
    const text = slide.elements.find((element) => element.type === "text" && element.name !== "Title");
    expect(text?.type).toBe("text");
    if (text?.type !== "text") return;
    expect(text.runs.map((run) => run.text)).toEqual(["First", "Second", "Third"]);
    expect(text.bullets).toBe(true);
  });

  it("renders a quote layout as a quote element", () => {
    const slide = buildSlideFromDraft(
      {
        title: "A quote",
        narrativeRole: "evidence",
        layout: "quote",
        quote: { text: "To be or not to be", attribution: "Shakespeare" },
      },
      { theme: DEFAULT_THEME },
    );
    const hasAttribution = slide.elements.some(
      (element) =>
        element.type === "text" &&
        element.runs.some((run) => run.text.includes("Shakespeare")),
    );
    expect(hasAttribution).toBe(true);
  });

  it("produces a slide with no elements for an empty draft", () => {
    const slide = buildSlideFromDraft(
      { title: "", narrativeRole: "custom", layout: "blank" },
      { theme: DEFAULT_THEME },
    );
    expect(slide.elements).toEqual([]);
    expect(validateSlide(slide).success).toBe(true);
  });
});
