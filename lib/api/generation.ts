/**
 * API request parsing and error mapping.
 *
 * The generation routes share one request parser and one error mapper so the
 * same failure always produces the same HTTP status and the same structured
 * payload. Nothing here invents a success: an unconfigured provider, an
 * invalid body and a schema mismatch each map to a distinct, honest error.
 */

import { NextResponse } from "next/server";

import { AIError, toSerializedAIError, type AIErrorCode } from "@/lib/ai/types";
import { parsePrompt, withOverrides } from "@/lib/ai/prompt";
import {
  presentationGenerationRequestSchema,
  promptGenerationRequestSchema,
} from "@/lib/presentation/schemas";
import type {
  PresentationGenerationRequest,
  PromptGenerationRequest,
  SerializedAIError,
} from "@/types/ai";

/** HTTP status for each AI error code. */
const STATUS_BY_CODE: Record<AIErrorCode, number> = {
  provider_not_found: 500,
  provider_not_configured: 503,
  provider_unavailable: 502,
  invalid_request: 400,
  invalid_response: 502,
  timeout: 504,
  cancelled: 499,
  rate_limited: 429,
  unknown: 500,
};

export interface ApiErrorBody {
  error: SerializedAIError;
}

/** Build a JSON error response from an arbitrary thrown value. */
export function errorResponse(error: unknown): NextResponse<ApiErrorBody> {
  const serialized = toSerializedAIError(error);
  const status = STATUS_BY_CODE[serialized.code as AIErrorCode] ?? 500;
  return NextResponse.json({ error: serialized }, { status });
}

/** Build a validation error response from a list of issues. */
export function validationErrorResponse(
  issues: Array<{ path: string; message: string; code: string }>,
  message = "The request body is invalid.",
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    {
      error: {
        code: "invalid_request",
        message,
        retryable: false,
        issues,
      },
    },
    { status: 400 },
  );
}

export type ParseResult =
  | { ok: true; request: PresentationGenerationRequest }
  | { ok: false; response: NextResponse<ApiErrorBody> };

/**
 * Parse a generation request body.
 *
 * Accepts either a short prompt (`{ prompt: "..." }`) or a fully structured
 * request. A prompt is parsed deterministically by `parsePrompt`, so the model
 * is never asked to interpret its own input.
 */
export function parseGenerationBody(body: unknown): ParseResult {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false,
      response: validationErrorResponse(
        [{ path: "", message: "Expected a JSON object body.", code: "invalid_type" }],
        "The request body must be a JSON object.",
      ),
    };
  }

  const candidate = body as Record<string, unknown>;

  if ("prompt" in candidate) {
    const parsed = promptGenerationRequestSchema.safeParse(candidate);
    if (!parsed.success) {
      return {
        ok: false,
        response: validationErrorResponse(
          parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
            code: issue.code,
          })),
          "The prompt is invalid.",
        ),
      };
    }
    const promptRequest: PromptGenerationRequest = parsed.data;
    const structured = parsePrompt(promptRequest.prompt);
    return { ok: true, request: withOverrides(structured, promptRequest.overrides) };
  }

  const parsed = presentationGenerationRequestSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      ok: false,
      response: validationErrorResponse(
        parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
          code: issue.code,
        })),
        "The generation request is invalid.",
      ),
    };
  }

  return { ok: true, request: parsed.data };
}

/** Read and parse a JSON body, mapping malformed JSON to a 400. */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch (error) {
    throw new AIError(
      "invalid_request",
      `The request body is not valid JSON: ${error instanceof Error ? error.message : "parse error"}`,
      { retryable: false },
    );
  }
}
