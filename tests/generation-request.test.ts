import { describe, expect, it } from "vitest";

import { parseGenerationBody, errorResponse } from "@/lib/api/generation";
import { AIError } from "@/lib/ai/types";
import { presentationGenerationRequestSchema } from "@/lib/presentation/schemas";
import { parsePrompt } from "@/lib/ai/prompt";

describe("generation request validation", () => {
  it("accepts a valid structured request", () => {
    const result = parseGenerationBody({
      topic: "Photosynthesis",
      audience: { label: "Grade 8" },
      purpose: { label: "Teach" },
      subject: { name: "Biology" },
      gradeLevel: "Grade 8",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a non-object body", () => {
    const result = parseGenerationBody("not an object");
    expect(result.ok).toBe(false);
  });

  it("rejects a null body", () => {
    expect(parseGenerationBody(null).ok).toBe(false);
  });

  it("rejects an array body", () => {
    expect(parseGenerationBody([]).ok).toBe(false);
  });

  it("rejects a structured request with a missing topic", () => {
    const result = parseGenerationBody({
      audience: { label: "Grade 8" },
      purpose: { label: "Teach" },
      subject: { name: "Biology" },
      gradeLevel: "Grade 8",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a structured request with an empty topic", () => {
    const result = parseGenerationBody({
      topic: "",
      audience: { label: "Grade 8" },
      purpose: { label: "Teach" },
      subject: { name: "Biology" },
      gradeLevel: "Grade 8",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a prompt that is too short", () => {
    expect(parseGenerationBody({ prompt: "hi" }).ok).toBe(false);
  });

  it("parses a prompt into a full structured request", () => {
    const result = parseGenerationBody({
      prompt: "Create a 10-slide presentation about the future of artificial intelligence",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.request.slideCount).toBe(10);
    expect(result.request.topic.toLowerCase()).toContain("artificial intelligence");
    expect(presentationGenerationRequestSchema.safeParse(result.request).success).toBe(true);
  });

  it("lets overrides win over parsed values", () => {
    const result = parseGenerationBody({
      prompt: "Create a 10-slide presentation about volcanoes",
      overrides: { slideCount: 6, gradeLevel: "Grade 5" },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.request.slideCount).toBe(6);
    expect(result.request.gradeLevel).toBe("Grade 5");
  });
});

describe("prompt parsing", () => {
  it("extracts a slide count", () => {
    expect(parsePrompt("Make a 12-slide deck about the ocean").slideCount).toBe(12);
  });

  it("extracts a grade level", () => {
    expect(parsePrompt("A lesson for Grade 9 biology students").gradeLevel).toBe("Grade 9");
  });

  it("extracts a duration", () => {
    expect(parsePrompt("A 45 minute lesson about fractions").purpose.durationMinutes).toBe(45);
  });

  it("clamps an unreasonable slide count", () => {
    expect(parsePrompt("Make a 99-slide deck about nothing").slideCount).toBe(30);
  });

  it("records assumptions rather than guessing silently", () => {
    const request = parsePrompt("Present something about rivers");
    expect(request.constraints?.length).toBeGreaterThan(0);
  });

  it("extracts the topic rather than the audience", () => {
    const request = parsePrompt(
      "Create a 2-slide presentation about the water cycle for Grade 7",
    );
    expect(request.topic.toLowerCase()).toContain("water cycle");
    expect(request.topic.toLowerCase()).not.toContain("grade");
    expect(request.gradeLevel).toBe("Grade 7");
  });

  it("extracts the topic when the audience follows the topic", () => {
    const request = parsePrompt("Make an 8-slide lesson about mitosis for Grade 9 students");
    expect(request.topic.toLowerCase()).toContain("mitosis");
    expect(request.topic.toLowerCase()).not.toContain("grade 9");
  });

  it("does not treat a duration as an audience", () => {
    const request = parsePrompt("Create a 6-slide deck about fractions for 45 minutes");
    expect(request.purpose.durationMinutes).toBe(45);
    expect(request.audience.label).not.toMatch(/45/);
  });

  it("always yields a schema-valid request", () => {
    for (const prompt of [
      "Create a 10-slide presentation about the future of artificial intelligence",
      "Make an 8-slide lesson for Grade 9 biology explaining how mitosis works",
      "Build a 12-slide deck for university students on the causes of climate change",
      "Teach photosynthesis",
    ]) {
      const request = parsePrompt(prompt);
      expect(presentationGenerationRequestSchema.safeParse(request).success).toBe(true);
    }
  });
});

describe("API error mapping", () => {
  it("maps an unconfigured provider to 503", async () => {
    const response = errorResponse(new AIError("provider_not_configured", "no key"));
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error.code).toBe("provider_not_configured");
    expect(body.error.retryable).toBe(false);
  });

  it("maps a timeout to 504", async () => {
    const response = errorResponse(new AIError("timeout", "slow"));
    expect(response.status).toBe(504);
  });

  it("maps an invalid response to 502", async () => {
    const response = errorResponse(new AIError("invalid_response", "bad json"));
    expect(response.status).toBe(502);
  });

  it("maps rate limiting to 429", async () => {
    const response = errorResponse(new AIError("rate_limited", "slow down"));
    expect(response.status).toBe(429);
  });

  it("maps an unknown error to 500 without inventing a code", async () => {
    const response = errorResponse(new Error("boom"));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe("unknown");
  });

  it("maps a malformed request to 400", async () => {
    const result = parseGenerationBody({ prompt: "" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(400);
  });
});
