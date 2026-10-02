import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createChatCompletion,
  extractJsonObject,
} from "@/lib/ai/providers/openai-compatible/http";
import { AIError } from "@/lib/ai/types";

const config = {
  apiKey: "sk-test",
  baseUrl: "https://example.test/v1",
  providerId: "openai-compatible",
  timeoutMs: 50,
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("extractJsonObject", () => {
  it("parses a bare JSON object", () => {
    expect(extractJsonObject('{"a":1}')).toEqual({ a: 1 });
  });

  it("parses JSON inside a fenced code block", () => {
    expect(extractJsonObject('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("parses JSON surrounded by prose", () => {
    expect(extractJsonObject('Here you go: {"a":1} — done.')).toEqual({ a: 1 });
  });

  it("throws invalid_response when there is no object", () => {
    expect(() => extractJsonObject("no json here")).toThrowError(
      expect.objectContaining({ code: "invalid_response" }),
    );
  });

  it("throws invalid_response for malformed JSON", () => {
    expect(() => extractJsonObject("{ broken: ")).toThrow(AIError);
  });
});

describe("createChatCompletion", () => {
  it("returns the assistant content on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          model: "gpt-4o-mini",
          choices: [{ message: { content: '{"ok":true}' } }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        }),
      ),
    );

    const result = await createChatCompletion(config, {
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "hi" }],
    });

    expect(result.content).toBe('{"ok":true}');
    expect(result.usage?.totalTokens).toBe(15);
  });

  it("maps HTTP 401 to provider_not_configured", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ error: { message: "bad key" } }, 401)),
    );

    await expect(
      createChatCompletion(config, { model: "m", messages: [] }),
    ).rejects.toMatchObject({ code: "provider_not_configured", retryable: false });
  });

  it("maps HTTP 429 to rate_limited", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ error: { message: "slow down" } }, 429)),
    );

    await expect(
      createChatCompletion(config, { model: "m", messages: [] }),
    ).rejects.toMatchObject({ code: "rate_limited", retryable: true });
  });

  it("maps HTTP 500 to provider_unavailable and marks it retryable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("boom", { status: 500 })));

    await expect(
      createChatCompletion(config, { model: "m", messages: [] }),
    ).rejects.toMatchObject({ code: "provider_unavailable", retryable: true });
  });

  it("maps a network failure to provider_unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("connection refused");
      }),
    );

    await expect(
      createChatCompletion(config, { model: "m", messages: [] }),
    ).rejects.toMatchObject({ code: "provider_unavailable" });
  });

  it("maps an aborted request to timeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        // Reject the way fetch does when its signal aborts.
        return await new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
      }),
    );

    await expect(
      createChatCompletion(config, { model: "m", messages: [] }),
    ).rejects.toMatchObject({ code: "timeout" });
  });

  it("maps an empty response to invalid_response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ choices: [{ message: { content: "  " } }] })),
    );

    await expect(
      createChatCompletion(config, { model: "m", messages: [] }),
    ).rejects.toMatchObject({ code: "invalid_response" });
  });

  it("never puts the API key in the error message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ error: { message: "nope" } }, 401)),
    );

    try {
      await createChatCompletion(config, { model: "m", messages: [] });
      throw new Error("should have thrown");
    } catch (error) {
      expect((error as Error).message).not.toContain("sk-test");
    }
  });
});
