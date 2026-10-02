/**
 * Streaming presentation generation API.
 *
 * POST /api/presentations/generate/stream
 *
 * Emits newline-delimited JSON (NDJSON) so the client can show real pipeline
 * progress rather than an indeterminate spinner. Every event corresponds to
 * actual application state:
 *
 *   {"type":"event",   "event": <GenerationEvent>}   stage started / finished
 *   {"type":"result",  "presentation": ..., ...}      the canonical model
 *   {"type":"error",   "error": <SerializedAIError>}  a real failure
 *
 * Nothing is emitted that has not actually happened. If the provider is not
 * configured, the stream reports the error and closes — it never sends a
 * fabricated deck.
 */

import { generatePresentation } from "@/lib/ai/orchestrator";
import { ensureProvidersRegistered } from "@/lib/ai/providers/bootstrap";
import { toSerializedAIError } from "@/lib/ai/types";
import {
  parseGenerationBody,
  readJsonBody,
  validationErrorResponse,
} from "@/lib/api/generation";
import { serializePresentation } from "@/lib/presentation/serialization";
import type { GenerationEvent } from "@/types/ai";

export const maxDuration = 120;

function line(payload: unknown): string {
  return `${JSON.stringify(payload)}\n`;
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    return validationErrorResponse(
      [
        {
          path: "",
          message: error instanceof Error ? error.message : "Invalid JSON body.",
          code: "invalid_json",
        },
      ],
      "The request body is not valid JSON.",
    );
  }

  const parsed = parseGenerationBody(body);
  if (!parsed.ok) return parsed.response;

  ensureProvidersRegistered();

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: unknown) => controller.enqueue(encoder.encode(line(payload)));

      const events: GenerationEvent[] = [];
      try {
        const { presentation, pipeline } = await generatePresentation(parsed.request, {
          onProgress: (event) => {
            events.push(event);
            send({ type: "event", event });
          },
          call: { signal: request.signal },
        });

        send({
          type: "result",
          presentation,
          serialized: serializePresentation(presentation),
          pipeline,
          events,
        });
      } catch (error) {
        send({ type: "error", error: toSerializedAIError(error) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
