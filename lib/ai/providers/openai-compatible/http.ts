/**
 * Minimal chat-completions HTTP client.
 *
 * This is the *only* module in the application that performs a network call to
 * an AI vendor. Keeping it isolated means the provider implementation can be
 * replaced, and the rest of the app keeps depending on `AIProvider` rather than
 * on a vendor SDK.
 *
 * The client speaks the OpenAI-compatible `/chat/completions` shape, which is
 * also implemented by Groq, Together, OpenRouter, vLLM and others. That lets a
 * single, small, dependency-free client serve several providers without adding
 * an SDK dependency for each one.
 *
 * It deliberately does not add an SDK dependency: a few dozen lines of `fetch`
 * are easier to audit than a vendor package, and the request/response shape is
 * stable and documented.
 */

import { AIError } from "../../types";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  /** Ask the provider for a JSON object response. */
  jsonObject?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatCompletionResult {
  content: string;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface ChatClientConfig {
  apiKey: string;
  baseUrl: string;
  /** Provider id used in error messages and provenance. */
  providerId: string;
  /** Hard timeout for a single request, in milliseconds. */
  timeoutMs: number;
}

/** The default request timeout, in milliseconds. */
export const DEFAULT_TIMEOUT_MS = 60_000;

interface OpenAICompatibleChoice {
  message?: { content?: string | null };
}

interface OpenAICompatibleResponse {
  model?: string;
  choices?: OpenAICompatibleChoice[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: { message?: string; type?: string; code?: string };
}

/**
 * Parse a JSON object out of a model response.
 *
 * Models sometimes wrap JSON in a fenced code block or add a sentence around
 * it. Rather than failing immediately, we extract the outermost JSON object.
 * If there is genuinely no object, this throws an `invalid_response` error —
 * it never guesses at content.
 */
export function extractJsonObject(content: string): unknown {
  const trimmed = content.trim();

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    // Fall through to a brace-balanced scan.
  }

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(candidate.slice(start, end + 1));
    } catch {
      // Fall through to the error below.
    }
  }

  throw new AIError(
    "invalid_response",
    "The provider did not return a parseable JSON object.",
    { retryable: true },
  );
}

/**
 * Call a chat-completions endpoint and return the assistant message.
 *
 * Failures are mapped onto the stable `AIError` codes so the orchestrator and
 * API routes can report them consistently: timeouts become `timeout`, HTTP 429
 * becomes `rate_limited`, other HTTP errors become `provider_unavailable`.
 */
export async function createChatCompletion(
  config: ChatClientConfig,
  request: ChatCompletionRequest,
  signal?: AbortSignal,
): Promise<ChatCompletionResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  // Forward an external abort signal (e.g. the client disconnecting).
  const onExternalAbort = () => controller.abort();
  signal?.addEventListener("abort", onExternalAbort, { once: true });

  const body: Record<string, unknown> = {
    model: request.model,
    messages: request.messages,
  };
  if (request.jsonObject) {
    body.response_format = { type: "json_object" };
  }
  if (typeof request.temperature === "number") {
    body.temperature = request.temperature;
  }
  if (typeof request.maxTokens === "number") {
    body.max_tokens = request.maxTokens;
  }

  let response: Response;
  try {
    response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      const cancelled = signal?.aborted ?? false;
      throw new AIError(
        cancelled ? "cancelled" : "timeout",
        cancelled
          ? "The generation request was cancelled."
          : `The provider did not respond within ${config.timeoutMs}ms.`,
        { providerId: config.providerId, retryable: !cancelled, cause: error },
      );
    }
    throw new AIError(
      "provider_unavailable",
      `Could not reach the provider: ${error instanceof Error ? error.message : String(error)}`,
      { providerId: config.providerId, retryable: true, cause: error },
    );
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", onExternalAbort);
  }

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const payload = (await response.json()) as OpenAICompatibleResponse;
      if (payload.error?.message) detail = payload.error.message;
    } catch {
      // Keep the status-code message when the body is not JSON.
    }

    if (response.status === 429) {
      throw new AIError("rate_limited", `The provider rate-limited the request: ${detail}`, {
        providerId: config.providerId,
        retryable: true,
      });
    }
    if (response.status === 401 || response.status === 403) {
      throw new AIError(
        "provider_not_configured",
        `The provider rejected the credentials: ${detail}`,
        { providerId: config.providerId, retryable: false },
      );
    }
    throw new AIError("provider_unavailable", `The provider returned an error: ${detail}`, {
      providerId: config.providerId,
      retryable: response.status >= 500,
    });
  }

  const payload = (await response.json()) as OpenAICompatibleResponse;
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new AIError("invalid_response", "The provider returned an empty response.", {
      providerId: config.providerId,
      retryable: true,
    });
  }

  return {
    content,
    model: payload.model ?? request.model,
    usage: payload.usage
      ? {
          promptTokens: payload.usage.prompt_tokens,
          completionTokens: payload.usage.completion_tokens,
          totalTokens: payload.usage.total_tokens,
        }
      : undefined,
  };
}
