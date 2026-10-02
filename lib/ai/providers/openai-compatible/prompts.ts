/**
 * Prompts for the OpenAI-compatible provider.
 *
 * Every stage asks for a JSON object with an explicit shape, and every prompt
 * carries the same honesty rules: do not invent statistics, citations or URLs.
 * The provider never asks the model to produce geometry or element ids — the
 * application owns layout, so the model only decides content.
 */

import type {
  NarrativePlan,
  PresentationGenerationRequest,
  PresentationOutline,
  ResearchBrief,
  UnderstandingBrief,
} from "@/types/ai";

/** Rules that apply to every stage. */
const INTEGRITY_RULES = `Rules you must always follow:
- Return a single JSON object. No prose, no markdown fences, no commentary.
- Never invent statistics, dates, quotes, citations, URLs or source names.
  If you cannot attribute a claim to a source you actually know, omit the
  "source" field entirely rather than making one up.
- Prefer well-established, broadly accepted facts. If a topic is contested or
  rapidly changing, say so instead of presenting a guess as settled.
- Write for the stated audience and grade level. Keep language concrete.
- Do not include layout coordinates, element ids, colours or fonts; the
  application handles all design.`;

function requestContext(request: PresentationGenerationRequest): string {
  const lines = [
    `Topic: ${request.topic}`,
    `Description: ${request.description ?? "(none provided)"}`,
    `Audience: ${request.audience.label}${request.audience.description ? ` — ${request.audience.description}` : ""}`,
    `Purpose: ${request.purpose.label}${request.purpose.durationMinutes ? ` (${request.purpose.durationMinutes} minutes)` : ""}`,
    `Subject: ${request.subject.name}${request.subject.topic ? ` — ${request.subject.topic}` : ""}`,
    `Grade level: ${request.gradeLevel}`,
    `Target slide count: ${request.slideCount ?? 10}`,
    `Language: ${request.language ?? "en-US"}`,
    `Depth: ${request.complexity ?? "standard"}`,
  ];
  if (request.constraints?.length) {
    lines.push(`Constraints:\n${request.constraints.map((c) => `- ${c}`).join("\n")}`);
  }
  return lines.join("\n");
}

export const SYSTEM_PROMPT = `You are the presentation intelligence engine inside SlidesForge AI, a platform used by educators.
You produce structured, accurate, teachable content. You are rigorous about what you do and do not know.
${INTEGRITY_RULES}`;

export function understandPrompt(request: PresentationGenerationRequest): string {
  return `Interpret this presentation request and return your understanding as JSON.

${requestContext(request)}

Return exactly this shape:
{
  "topic": "the topic, restated precisely",
  "objective": "one sentence describing what this presentation must achieve",
  "learningObjectives": ["3-6 concrete things the audience should be able to do or explain afterwards"],
  "priorKnowledge": ["what the audience is assumed to already know"],
  "assumptions": ["assumptions you made because the request was ambiguous"],
  "openQuestions": ["questions the request did not answer; use an empty array if none"]
}`;
}

export function researchPrompt(
  request: PresentationGenerationRequest,
  understanding: UnderstandingBrief,
): string {
  return `Assemble the well-established background this presentation needs.

${requestContext(request)}

Your understanding of the request:
- Objective: ${understanding.objective}
- Learning objectives: ${understanding.learningObjectives.join("; ")}

Return exactly this shape:
{
  "summary": "a short paragraph of grounded background",
  "findings": [
    {
      "id": "f1",
      "topic": "short label",
      "summary": "one or two sentences stating the finding",
      "confidence": "established" | "emerging" | "uncertain",
      "source": "only include this when you can name a real source you are certain of"
    }
  ],
  "limitations": ["what this research could not establish, or where the topic is uncertain"]
}

Provide 4-8 findings. Mark anything you are not confident about as "uncertain" and
explain the uncertainty in "limitations".`;
}

export function narrativePrompt(
  request: PresentationGenerationRequest,
  understanding: UnderstandingBrief,
  research: ResearchBrief,
): string {
  return `Design the narrative arc for this presentation.

${requestContext(request)}

Objective: ${understanding.objective}
Research summary: ${research.summary}
Limitations to respect: ${research.limitations.join("; ") || "none noted"}

Return exactly this shape:
{
  "title": "the presentation title",
  "description": "one or two sentences describing the deck",
  "thesis": "the single through-line the whole deck argues",
  "beats": [
    {
      "id": "b1",
      "role": "one of: title, agenda, introduction, context, concept, example, evidence, comparison, process, activity, summary, conclusion, references, custom",
      "purpose": "why this beat exists in the story",
      "keyMessage": "the one idea the audience should take from this beat"
    }
  ]
}

Use about ${request.slideCount ?? 10} beats. The first beat should be the title,
and the arc should build: opening, context, core concepts, examples or evidence,
then a summary or conclusion.`;
}

export function slidePlanPrompt(
  request: PresentationGenerationRequest,
  narrative: NarrativePlan,
): string {
  return `Turn this narrative into a slide-by-slide plan.

${requestContext(request)}

Thesis: ${narrative.thesis}
Beats:
${narrative.beats.map((beat, index) => `${index + 1}. [${beat.role}] ${beat.keyMessage}`).join("\n")}

Return exactly this shape:
{
  "title": "${narrative.title}",
  "description": "${narrative.description}",
  "slides": [
    {
      "title": "slide title",
      "narrativeRole": "the beat's role",
      "layout": "one of: title, section, title-and-content, two-column, image-left, image-right, full-bleed-image, quote, comparison, timeline, data, diagram, blank, custom",
      "keyPoints": ["2-5 points this slide must cover"],
      "research": ["optional: relevant findings this slide should draw on"]
    }
  ]
}

One slide per beat, in order.`;
}

export function slideContentPrompt(
  request: PresentationGenerationRequest,
  outline: PresentationOutline,
): string {
  return `Write the content for every slide in this plan.

${requestContext(request)}

Plan:
${outline.slides
  .map(
    (slide, index) =>
      `${index + 1}. "${slide.title}" [${slide.narrativeRole}/${slide.layout}]\n   Points: ${slide.keyPoints.join("; ")}`,
  )
  .join("\n")}

Return exactly this shape:
{
  "slides": [
    {
      "title": "slide title, matching the plan",
      "narrativeRole": "the planned role",
      "layout": "the planned layout",
      "subtitle": "optional short subtitle",
      "paragraphs": ["optional short paragraph"],
      "bullets": ["concise bullet points, 2-5 per slide"],
      "callout": "optional single highlighted takeaway",
      "quote": { "text": "optional pull quote", "attribution": "optional, only if real" },
      "speakerNotes": "what the presenter should say, 2-4 sentences",
      "cues": ["optional short presenter cues"]
    }
  ]
}

Produce exactly ${outline.slides.length} slides, in the same order as the plan.
Use "bullets" for most slides, "paragraphs" for prose, and "quote" only for a
quote slide. Keep bullet text under about 120 characters.`;
}
