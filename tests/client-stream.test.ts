import { afterEach, describe, expect, it, vi } from "vitest";

import {
  GenerationTransportError,
  streamGeneration,
  type GenerationStreamMessage,
} from "@/lib/api/client";
import type { GenerationEvent } from "@/types/ai";
import { GENERATION_STAGES } from "@/types/ai";

afterEach(() => vi.unstubAllGlobals());

function ndjsonResponse(messages: GenerationStreamMessage[]): Response {
  const body = messages.map((message) => `${JSON.stringify(message)}\n`).join("");
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(body));
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "application/x-ndjson" },
  });
}

function event(stage: GenerationEvent["stage"], status: GenerationEvent["status"]): GenerationEvent {
  return { stage, status, at: new Date().toISOString() };
}

describe("streamGeneration", () => {
  it("forwards events in the order the server sent them", async () => {
    const received: GenerationEvent[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        ndjsonResponse([
          { type: "event", event: event("understand", "running") },
          { type: "event", event: event("understand", "succeeded") },
          { type: "event", event: event("research", "running") },
        ]),
      ),
    );

    await streamGeneration("a topic", { onEvent: (e) => received.push(e) });

    expect(received.map((e) => `${e.stage}:${e.status}`)).toEqual([
      "understand:running",
      "understand:succeeded",
      "research:running",
    ]);
  });

  it("delivers a result message to onResult", async () => {
    const results: GenerationStreamMessage[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        ndjsonResponse([
          {
            type: "result",
            presentation: { id: "p1", title: "T", slides: [] } as never,
            serialized: "{}",
            pipeline: {} as never,
            events: [],
          },
        ]),
      ),
    );

    await streamGeneration("a topic", { onResult: (m) => results.push(m) });
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe("result");
  });

  it("surfaces a provider error through onError without throwing", async () => {
    const errors: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        ndjsonResponse([
          {
            type: "error",
            error: { code: "invalid_response", message: "bad", retryable: true },
          },
        ]),
      ),
    );

    await streamGeneration("a topic", { onError: (e) => errors.push(e) });
    expect(errors).toHaveLength(1);
  });

  it("maps an HTTP error response to a structured error", async () => {
    const errors: { code: string }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            error: { code: "provider_not_configured", message: "no key", retryable: false },
          }),
          { status: 503, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await streamGeneration("a topic", { onError: (e) => errors.push(e) });
    expect(errors[0].code).toBe("provider_not_configured");
  });

  it("rejects with a transport error when the network fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );

    await expect(streamGeneration("a topic", {})).rejects.toBeInstanceOf(
      GenerationTransportError,
    );
  });

  it("reports cancellation distinctly", async () => {
    const controller = new AbortController();
    controller.abort();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new DOMException("Aborted", "AbortError");
      }),
    );

    await expect(
      streamGeneration("a topic", {}, controller.signal),
    ).rejects.toMatchObject({ code: "cancelled" });
  });

  it("ignores malformed lines without dropping the stream", async () => {
    const received: GenerationEvent[] = [];
    const body =
      `not json\n${JSON.stringify({ type: "event", event: event("understand", "running") })}\n`;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(body));
        controller.close();
      },
    });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(stream, { status: 200 })));

    await streamGeneration("a topic", { onEvent: (e) => received.push(e) });
    expect(received).toHaveLength(1);
  });
});

describe("generation stages", () => {
  it("lists every pipeline stage in order", () => {
    expect([...GENERATION_STAGES]).toEqual([
      "understand",
      "research",
      "narrative",
      "slidePlan",
      "generate",
      "validate",
    ]);
  });
});
