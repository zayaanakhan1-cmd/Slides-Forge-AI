/**
 * Prompt parsing.
 *
 * `/create` accepts a single sentence, for example:
 *
 *   "Create a 10-slide presentation about the future of artificial intelligence"
 *
 * Rather than asking an AI to interpret its own input, the application parses
 * that sentence deterministically into a structured
 * `PresentationGenerationRequest`. This keeps the request shape under our
 * control: the provider receives a well-formed request and cannot invent the
 * audience, slide count or grade level on a whim.
 *
 * The parser is deliberately conservative. Anything it cannot determine with
 * confidence is left at a clearly-stated default rather than guessed at
 * silently, and the assumptions are recorded on the request so they can be
 * surfaced to the user.
 */

import type { AspectRatio } from "@/types/theme";
import type { PresentationGenerationRequest } from "@/types/ai";

/** Defaults applied when a prompt does not specify a value. */
export const PROMPT_DEFAULTS = {
  slideCount: 10,
  aspectRatio: "16:9" as AspectRatio,
  complexity: "standard" as const,
  language: "en-US",
  audienceLabel: "General audience",
  purposeLabel: "Explain the topic",
  subjectName: "General",
  gradeLevel: "Not specified",
} as const;

/** Minimum and maximum slide counts a prompt may request. */
export const SLIDE_COUNT_LIMITS = { min: 3, max: 30 } as const;

/** Subject keywords used to infer the subject when the prompt implies one. */
const SUBJECT_KEYWORDS: Array<{ name: string; patterns: RegExp[] }> = [
  { name: "Computer Science", patterns: [/\bai\b/i, /\bartificial intelligence\b/i, /\bmachine learning\b/i, /\bprogramming\b/i, /\balgorithm/i, /\bcomputer/i] },
  { name: "Biology", patterns: [/\bbiology\b/i, /\bcell/i, /\bdna\b/i, /\becosystem/i, /\bmitosis\b/i, /\borganism/i] },
  { name: "Chemistry", patterns: [/\bchemistry\b/i, /\batom/i, /\bmolecule/i, /\bchemical/i, /\bperiodic table\b/i] },
  { name: "Physics", patterns: [/\bphysics\b/i, /\bgravity\b/i, /\benergy\b/i, /\bquantum\b/i, /\bforce\b/i] },
  { name: "Mathematics", patterns: [/\bmath/i, /\balgebra\b/i, /\bgeometry\b/i, /\bcalculus\b/i, /\bstatistics\b/i] },
  { name: "History", patterns: [/\bhistory\b/i, /\bhistorical\b/i, /\bcivil war\b/i, /\bempire\b/i, /\bancient\b/i] },
  { name: "Geography", patterns: [/\bgeography\b/i, /\bclimate\b/i, /\bcontinent/i, /\becosystem/i] },
  { name: "Literature", patterns: [/\bliterature\b/i, /\bpoetry\b/i, /\bnovel\b/i, /\bshakespeare\b/i] },
];

/** Leading instruction verbs and filler stripped when isolating the topic. */
const LEADING_FILLER =
  /^(?:please\s+)?(?:can\s+you\s+)?(?:help\s+me\s+)?(?:create|make|build|generate|design|prepare|write|draft|produce|give\s+me)\s+(?:me\s+)?/i;

const LEADING_ARTICLE = /^(?:a|an|the)\s+/i;

/** Phrases that introduce the topic. */
const TOPIC_LEAD =
  /\b(?:about|on|covering|explaining|that\s+explains|regarding|on\s+the\s+topic\s+of)\s+/i;

/**
 * A trailing audience clause such as "for Grade 7" or "for university students".
 * Stripped from the topic so the audience never becomes the topic itself.
 */
const TRAILING_AUDIENCE =
  /\s+for\s+(?:grade\s*\d{1,2}|\d{1,2}(?:st|nd|rd|th)\s+grade|year\s*\d{1,2}|(?:elementary|middle|high)\s+school(?:\s+students)?|[a-z]+\s+students|beginners|advanced\s+learners|professionals|children|kids|adults)\b.*$/i;

function collapse(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function stripTrailingPunctuation(value: string): string {
  return value.replace(/[.!?;:,]+$/g, "").trim();
}

function titleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => (word.length <= 3 && word === word.toLowerCase() ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(" ");
}

/** Extract a slide count such as "10-slide", "10 slides" or "10 slide deck". */
export function extractSlideCount(prompt: string): number | undefined {
  const match = prompt.match(/(\d{1,2})\s*[-\s]?\s*slides?\b/i);
  if (!match) return undefined;
  const value = Number.parseInt(match[1], 10);
  if (!Number.isFinite(value)) return undefined;
  return Math.min(SLIDE_COUNT_LIMITS.max, Math.max(SLIDE_COUNT_LIMITS.min, value));
}

/** Extract a grade level such as "Grade 9", "9th grade" or "year 10". */
export function extractGradeLevel(prompt: string): string | undefined {
  const gradeMatch = prompt.match(/\bgrade\s*(\d{1,2})\b/i);
  if (gradeMatch) return `Grade ${gradeMatch[1]}`;

  const ordinalMatch = prompt.match(/\b(\d{1,2})(?:st|nd|rd|th)\s+grade\b/i);
  if (ordinalMatch) return `Grade ${ordinalMatch[1]}`;

  const yearMatch = prompt.match(/\byear\s*(\d{1,2})\b/i);
  if (yearMatch) return `Year ${yearMatch[1]}`;

  return undefined;
}

/** Extract a target duration in minutes. */
export function extractDurationMinutes(prompt: string): number | undefined {
  const match = prompt.match(/\b(\d{1,3})\s*(?:-|\s)?\s*(?:minute|min)s?\b/i);
  if (!match) return undefined;
  const value = Number.parseInt(match[1], 10);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

/** Extract an explicit aspect ratio such as "16:9". */
export function extractAspectRatio(prompt: string): AspectRatio | undefined {
  const match = prompt.match(/\b(16:9|4:3|1:1|9:16)\b/);
  return match ? (match[1] as AspectRatio) : undefined;
}

/** Extract an audience phrase following "for", e.g. "for grade 9 students". */
export function extractAudience(prompt: string): string | undefined {
  const match = prompt.match(/\bfor\s+([a-z0-9][^.,;]{2,60}?)(?:\s+(?:about|on|covering|explaining)\b|[.,;]|$)/i);
  if (!match) return undefined;
  const value = collapse(match[1]);
  // Reject phrases that are really the topic rather than the audience.
  if (/^(?:the\s+)?(?:future|history|basics|introduction|overview)\b/i.test(value)) {
    return undefined;
  }
  // Reject phrases that are really a duration, e.g. "for 45 minutes".
  if (/^\d{1,3}\s*(?:-|\s)?\s*(?:minute|min|hour|hr)s?\b/i.test(value)) {
    return undefined;
  }
  return value;
}

/** Infer a subject name from the prompt, falling back to a generic subject. */
export function extractSubjectName(prompt: string): string {
  for (const subject of SUBJECT_KEYWORDS) {
    if (subject.patterns.some((pattern) => pattern.test(prompt))) {
      return subject.name;
    }
  }
  return PROMPT_DEFAULTS.subjectName;
}

/**
 * Isolate the topic of the prompt.
 *
 * Handles the common shapes: "create a 10-slide presentation about X",
 * "make a deck on X", "presentation explaining X" and a bare topic.
 */
export function extractTopic(prompt: string): string {
  let working = stripTrailingPunctuation(collapse(prompt));
  working = working.replace(LEADING_FILLER, "");
  working = working.replace(LEADING_ARTICLE, "");
  working = working.replace(/^\d{1,2}\s*[-\s]?\s*slides?\s+/i, "");
  working = working.replace(/^(?:slide\s+)?(?:deck|presentation)\s+(?:of|for|on|about)\s+/i, "");
  working = working.replace(/^(?:slide\s+)?(?:deck|presentation)\s+/i, "");
  working = working.replace(LEADING_ARTICLE, "");

  const leadMatch = working.match(TOPIC_LEAD);
  if (leadMatch && leadMatch.index !== undefined) {
    const after = working.slice(leadMatch.index + leadMatch[0].length);
    if (after.trim().length >= 3) {
      working = after;
    }
  }

  // Remove a trailing audience clause so "for Grade 7" is never the topic.
  const withoutAudience = working.replace(TRAILING_AUDIENCE, "");
  if (withoutAudience.trim().length >= 3) {
    working = withoutAudience;
  }

  working = working.replace(/\b\d{1,2}\s*[-\s]?\s*slides?\b/gi, "");
  working = stripTrailingPunctuation(collapse(working));

  return working.length >= 3 ? working : stripTrailingPunctuation(collapse(prompt));
}

/**
 * Parse a free-form prompt into a structured generation request.
 *
 * The result always satisfies `presentationGenerationRequestSchema`; every
 * field the prompt does not specify is filled from `PROMPT_DEFAULTS`.
 */
export function parsePrompt(prompt: string): PresentationGenerationRequest {
  const clean = collapse(prompt);
  const topic = extractTopic(clean);
  const slideCount = extractSlideCount(clean) ?? PROMPT_DEFAULTS.slideCount;
  const gradeLevel = extractGradeLevel(clean);
  const durationMinutes = extractDurationMinutes(clean);
  const aspectRatio = extractAspectRatio(clean);
  const audience = extractAudience(clean);
  const subjectName = extractSubjectName(clean);

  const assumptions: string[] = [];
  if (!extractSlideCount(clean)) {
    assumptions.push(`Assumed ${slideCount} slides because the prompt did not specify a count.`);
  }
  if (!gradeLevel) {
    assumptions.push("Assumed a general audience because no grade level was given.");
  }
  if (!durationMinutes) {
    assumptions.push("No target duration was given, so pacing is left to the provider.");
  }

  const description = `A presentation about ${topic}${gradeLevel ? ` for ${gradeLevel}` : ""}.`;

  return {
    topic: titleCase(topic),
    description,
    audience: {
      label: audience ?? gradeLevel ?? PROMPT_DEFAULTS.audienceLabel,
      description: gradeLevel
        ? `Students at ${gradeLevel} level.`
        : "A general audience with no stated prior knowledge.",
    },
    purpose: {
      label: PROMPT_DEFAULTS.purposeLabel,
      description,
      durationMinutes,
    },
    subject: {
      name: subjectName,
      topic: titleCase(topic),
      gradeLevel,
    },
    gradeLevel: gradeLevel ?? PROMPT_DEFAULTS.gradeLevel,
    slideCount,
    aspectRatio: aspectRatio ?? PROMPT_DEFAULTS.aspectRatio,
    language: PROMPT_DEFAULTS.language,
    complexity: PROMPT_DEFAULTS.complexity,
    constraints: assumptions,
  };
}

/** Merge a parsed request with user-supplied overrides. */
export function withOverrides(
  base: PresentationGenerationRequest,
  overrides?: Partial<PresentationGenerationRequest>,
): PresentationGenerationRequest {
  if (!overrides) return base;
  return {
    ...base,
    ...overrides,
    audience: { ...base.audience, ...overrides.audience },
    purpose: { ...base.purpose, ...overrides.purpose },
    subject: { ...base.subject, ...overrides.subject },
    constraints: overrides.constraints ?? base.constraints,
  };
}
