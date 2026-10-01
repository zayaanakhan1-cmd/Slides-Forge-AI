/**
 * Serialization helpers for the canonical presentation model.
 *
 * The model is JSON-safe by construction, so serialization is mostly about
 * turning an in-memory Presentation into a string and back while validating at
 * the boundary. This is the single path used when persisting to PostgreSQL,
 * passing a presentation to a destination adapter, or sending it over HTTP.
 */

import type { Presentation } from "@/types/presentation";
import type { Slide } from "@/types/slide";
import type { Theme } from "@/types/theme";
import {
  assertPresentation,
  assertSlide,
  validatePresentation,
  validateWith,
  type ValidationResult,
} from "./validation";
import { presentationSchema, slideSchema, themeSchema } from "./schemas";

export interface SerializedPresentation {
  /** Schema version the payload was written with. */
  schemaVersion: string;
  /** ISO-8601 timestamp of serialization. */
  serializedAt: string;
  data: Presentation;
}

/**
 * Serialize a presentation to a JSON string.
 *
 * The input is validated first so we never persist an invalid model.
 */
export function serializePresentation(presentation: Presentation): string {
  const valid = assertPresentation(presentation);
  const payload: SerializedPresentation = {
    schemaVersion: String(valid.metadata?.schemaVersion ?? "1.0.0"),
    serializedAt: new Date().toISOString(),
    data: valid,
  };
  return JSON.stringify(payload);
}

/** Parse a serialized presentation, returning structured issues on failure. */
export function deserializePresentation(
  input: string | unknown,
): ValidationResult<Presentation> {
  let parsed: unknown = input;
  if (typeof input === "string") {
    try {
      parsed = JSON.parse(input);
    } catch (error) {
      return {
        success: false,
        data: null,
        issues: [
          {
            path: "",
            message: error instanceof Error ? error.message : "Invalid JSON",
            code: "invalid_json",
          },
        ],
      };
    }
  }

  // Accept both a raw Presentation and a SerializedPresentation envelope.
  const candidate =
    parsed && typeof parsed === "object" && "data" in (parsed as object)
      ? (parsed as SerializedPresentation).data
      : parsed;

  return validatePresentation(candidate);
}

/** Parse a serialized presentation, throwing on failure. */
export function deserializePresentationOrThrow(input: string | unknown): Presentation {
  const result = deserializePresentation(input);
  if (!result.success) {
    throw new Error(
      `Failed to deserialize presentation: ${result.issues
        .map((issue) => `${issue.path} ${issue.message}`)
        .join("; ")}`,
    );
  }
  return result.data;
}

/** Deep-clone a presentation through JSON, preserving model invariants. */
export function clonePresentation(presentation: Presentation): Presentation {
  return assertPresentation(JSON.parse(JSON.stringify(presentation)));
}

/** Validate and normalize a slide payload received from a boundary. */
export function parseSlide(input: unknown): ValidationResult<Slide> {
  return validateWith(slideSchema, input);
}

/** Validate and normalize a theme payload received from a boundary. */
export function parseTheme(input: unknown): ValidationResult<Theme> {
  return validateWith(themeSchema, input);
}

/** Parse a slide, throwing on failure. */
export function parseSlideOrThrow(input: unknown): Slide {
  return assertSlide(input);
}

/** Validate that a value is a Presentation and return it. */
export function normalizePresentation(input: unknown): Presentation {
  return assertPresentation(input);
}

export { presentationSchema, slideSchema, themeSchema };
