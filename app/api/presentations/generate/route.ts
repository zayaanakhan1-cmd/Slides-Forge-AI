/**
 * Presentation generation API.
 *
 * POST /api/presentations/generate
 *
 * Validates the incoming request, runs the AI pipeline and returns a canonical
 * Presentation. Failures are returned as structured errors with a code, a
 * retryable flag and, for validation failures, the individual issues.
 *
 * The route is honest by construction: if no provider is configured it returns
 * 503 `provider_not_configured` rather than any kind of placeholder deck.
 */

import { NextResponse } from "next/server";

import { generatePresentation } from "@/lib/ai/orchestrator";
import { ensureProvidersRegistered } from "@/lib/ai/providers/bootstrap";
import {
  errorResponse,
  parseGenerationBody,
  readJsonBody,
} from "@/lib/api/generation";
import { serializePresentation } from "@/lib/presentation/serialization";
import type { GenerationEvent, GenerationPipelineOutput } from "@/types/ai";
import type { Presentation } from "@/types/presentation";

/** Generation is CPU- and network-bound; allow a generous ceiling. */
export const maxDuration = 120;

interface SuccessBody {
  presentation: Presentation;
  serialized: string;
  pipeline: GenerationPipelineOutput;
  events: GenerationEvent[];
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    return errorResponse(error);
  }

  const parsed = parseGenerationBody(body);
  if (!parsed.ok) return parsed.response;

  ensureProvidersRegistered();

  const events: GenerationEvent[] = [];
  const abortController = new AbortController();
  request.signal.addEventListener("abort", () => abortController.abort(), { once: true });

  try {
    const { presentation, pipeline } = await generatePresentation(parsed.request, {
      onProgress: (event) => events.push(event),
      call: { signal: abortController.signal },
    });

    const response: SuccessBody = {
      presentation,
      serialized: serializePresentation(presentation),
      pipeline,
      events,
    };
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}

/** Health-style discovery: report whether generation is currently possible. */
export async function GET(): Promise<NextResponse> {
  ensureProvidersRegistered();
  const { getConfiguredProvider, listProviders } = await import(
    "@/lib/ai/providers/registry"
  );
  const configured = getConfiguredProvider();
  return NextResponse.json({
    ready: Boolean(configured),
    providerId: configured?.descriptor.id ?? null,
    registered: listProviders().map((descriptor) => ({
      id: descriptor.id,
      label: descriptor.label,
      capabilities: descriptor.capabilities,
    })),
  });
}
