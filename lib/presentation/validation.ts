/**
 * Runtime validation helpers for the canonical presentation model.
 *
 * Every boundary that receives untrusted presentation data (an AI response, a
 * database row, a file upload, a destination adapter argument) should funnel it
 * through these helpers. Validation never mutates the input.
 */

import { z } from "zod";

import type { Presentation } from "@/types/presentation";
import type { Slide } from "@/types/slide";
import { presentationSchema, slideSchema } from "./schemas";

export interface ValidationIssue {
  /** Dot-separated path to the offending field, e.g. "slides.0.title". */
  path: string;
  message: string;
  code: string;
}

export type ValidationResult<T> =
  | { success: true; data: T; issues: [] }
  | { success: false; data: null; issues: ValidationIssue[] };

/** Raised by `assertPresentation` when a value fails validation. */
export class PresentationValidationError extends Error {
  readonly issues: ValidationIssue[];

  constructor(issues: ValidationIssue[], label = "presentation") {
    super(formatIssues(issues, label));
    this.name = "PresentationValidationError";
    this.issues = issues;
  }
}

function toIssueList(error: z.ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
    code: issue.code,
  }));
}

/** Validate an arbitrary value against any Zod schema, returning typed issues. */
export function validateWith<T>(schema: z.ZodType<T>, input: unknown): ValidationResult<T> {
  const parsed = schema.safeParse(input);
  if (parsed.success) {
    return { success: true, data: parsed.data, issues: [] };
  }
  return { success: false, data: null, issues: toIssueList(parsed.error) };
}

/** Validate a value against the canonical Presentation schema. */
export function validatePresentation(input: unknown): ValidationResult<Presentation> {
  return validateWith(presentationSchema, input);
}

/** Validate a value against the Slide schema. */
export function validateSlide(input: unknown): ValidationResult<Slide> {
  return validateWith(slideSchema, input);
}

/** Type guard for the canonical Presentation model. */
export function isPresentation(input: unknown): input is Presentation {
  return presentationSchema.safeParse(input).success;
}

/** Type guard for a single slide. */
export function isSlide(input: unknown): input is Slide {
  return slideSchema.safeParse(input).success;
}

/**
 * Assert that a value is a valid Presentation, returning it narrowed.
 *
 * @throws {PresentationValidationError} when validation fails.
 */
export function assertPresentation(
  input: unknown,
  label = "presentation",
): Presentation {
  const result = validatePresentation(input);
  if (!result.success) {
    throw new PresentationValidationError(result.issues, label);
  }
  return result.data;
}

/** Assert that a value is a valid Slide, returning it narrowed. */
export function assertSlide(input: unknown, label = "slide"): Slide {
  const result = validateSlide(input);
  if (!result.success) {
    throw new PresentationValidationError(result.issues, label);
  }
  return result.data;
}

/** Render validation issues as a single human-readable string. */
export function formatIssues(issues: ValidationIssue[], label = "value"): string {
  if (issues.length === 0) {
    return `Invalid ${label}: no issues reported`;
  }
  const lines = issues.map((issue) =>
    issue.path ? `  - ${issue.path}: ${issue.message}` : `  - ${issue.message}`,
  );
  return `Invalid ${label}:\n${lines.join("\n")}`;
}
