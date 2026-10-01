/**
 * AI layer types.
 *
 * These complement the provider-agnostic request/response types in
 * `types/ai.ts` with the plumbing the orchestrator needs: call options, provider
 * configuration and structured error codes. No concrete vendor is referenced.
 */

import type { AIProviderId, AIUsage } from "@/types/ai";
import type { JsonObject } from "@/types/json";

/** Options passed to a single provider call. */
export interface ProviderCallOptions {
  /** Preferred model for this call; the provider chooses a default if omitted. */
  model?: string;
  /** Abort signal so long generations can be cancelled. */
  signal?: AbortSignal;
  /** Hard timeout in milliseconds. */
  timeoutMs?: number;
  /** Extra provider-agnostic hints, e.g. temperature or reasoning effort. */
  hints?: JsonObject;
}

/** Static configuration for a provider instance. */
export interface ProviderConfig {
  /** API key or equivalent credential. Never logged. */
  apiKey?: string;
  /** Base URL override for self-hosted or proxy endpoints. */
  baseUrl?: string;
  /** Default model to use when a call does not specify one. */
  defaultModel?: string;
  /** Whether the provider is enabled in this environment. */
  enabled?: boolean;
}

/** Stable error codes surfaced by the AI layer. */
export type AIErrorCode =
  | "provider_not_found"
  | "provider_not_configured"
  | "provider_unavailable"
  | "invalid_request"
  | "invalid_response"
  | "timeout"
  | "cancelled"
  | "rate_limited"
  | "unknown";

/** Base error for every failure raised by the AI layer. */
export class AIError extends Error {
  readonly code: AIErrorCode;
  readonly providerId?: AIProviderId;
  readonly retryable: boolean;

  constructor(
    code: AIErrorCode,
    message: string,
    options: { providerId?: AIProviderId; retryable?: boolean; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "AIError";
    this.code = code;
    this.providerId = options.providerId;
    this.retryable = options.retryable ?? false;
  }
}

/** Raised when no provider is registered or configured for a request. */
export class AIProviderUnavailableError extends AIError {
  constructor(
    message = "No AI provider is configured. Register a provider before generating presentations.",
    providerId?: AIProviderId,
  ) {
    super("provider_not_configured", message, { providerId, retryable: false });
    this.name = "AIProviderUnavailableError";
  }
}

/** Raised when a requested provider id is not registered. */
export class AIProviderNotFoundError extends AIError {
  constructor(providerId: AIProviderId) {
    super("provider_not_found", `AI provider "${providerId}" is not registered.`, {
      providerId,
      retryable: false,
    });
    this.name = "AIProviderNotFoundError";
  }
}

/** Aggregate usage across several provider calls. */
export interface AggregatedUsage extends AIUsage {
  calls: number;
}

/** Merge two usage records, summing their fields. */
export function mergeUsage(a: AIUsage | undefined, b: AIUsage | undefined): AIUsage {
  return {
    inputTokens: (a?.inputTokens ?? 0) + (b?.inputTokens ?? 0),
    outputTokens: (a?.outputTokens ?? 0) + (b?.outputTokens ?? 0),
    totalTokens: (a?.totalTokens ?? 0) + (b?.totalTokens ?? 0),
    estimatedCostUsd: (a?.estimatedCostUsd ?? 0) + (b?.estimatedCostUsd ?? 0),
  };
}
