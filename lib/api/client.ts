/**
 * Browser client for the streaming generation API.
 *
 * Reads the NDJSON stream emitted by `/api/presentations/generate/stream` and
 * forwards each parsed message to the caller. It never synthesizes progress:
 * if the stream ends without a result, the caller learns that generation did
 * not complete.
 */

import type {
  GenerationEvent,
  GenerationPipelineOutput,
  SerializedAIError,
} from "@/types/ai";
import type { Presentation } from "@/types/presentation";

export type GenerationStreamMessage =
  | { type: "event"; event: GenerationEvent }
  | {
      type: "result";
      presentation: Presentation;
      serialized: string;
      pipeline: GenerationPipelineOutput;
      events: GenerationEvent[];
    }
  | { type: "error"; error: SerializedAIError };

export interface StreamGenerationHandlers {
  onEvent?: (event: GenerationEvent) => void;
  onResult?: (message: Extract<GenerationStreamMessage, { type: "result" }>) => void;
  onError?: (error: SerializedAIError) => void;
}

/** A network-level failure, distinct from a provider error reported by the API. */
export class GenerationTransportError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "GenerationTransportError";
    this.code = code;
  }
}

/**
 * Start a generation and consume its progress stream.
 *
 * Resolves once the stream closes. A provider failure is delivered through
 * `onError`; a transport failure rejects the returned promise so the caller can
 * distinguish "the server said no" from "we never reached the server".
 */
export async function streamGeneration(
  prompt: string,
  handlers: StreamGenerationHandlers,
  signal?: AbortSignal,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/presentations/generate/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) {
      throw new GenerationTransportError("cancelled", "Generation was cancelled.");
    }
    throw new GenerationTransportError(
      "provider_unavailable",
      error instanceof Error ? error.message : "Could not reach the generation service.",
    );
  }

  if (!response.ok || !response.body) {
    // The route returns a structured error body for non-streaming failures.
    let error: SerializedAIError = {
      code: "unknown",
      message: `The generation service returned HTTP ${response.status}.`,
      retryable: response.status >= 500,
    };
    try {
      const payload = (await response.json()) as { error?: SerializedAIError };
      if (payload.error) error = payload.error;
    } catch {
      // Keep the status-based error.
    }
    handlers.onError?.(error);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIndex = buffer.indexOf("\n");
    while (newlineIndex !== -1) {
      const raw = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      newlineIndex = buffer.indexOf("\n");
      if (!raw) continue;

      let message: GenerationStreamMessage;
      try {
        message = JSON.parse(raw) as GenerationStreamMessage;
      } catch {
        continue;
      }

      if (message.type === "event") handlers.onEvent?.(message.event);
      else if (message.type === "result") handlers.onResult?.(message);
      else if (message.type === "error") handlers.onError?.(message.error);
    }
  }
}
