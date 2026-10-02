/**
 * AI provider registry.
 *
 * Providers are registered by id and constructed lazily from configuration.
 * Application code asks the registry for a provider; it never imports a vendor
 * SDK. No provider is registered by default, which keeps Phase 1 honest: if a
 * generation request arrives with nothing registered, the orchestrator raises a
 * clear "provider not configured" error instead of returning invented content.
 */

import type { AIProviderId } from "@/types/ai";
import type { AIProvider, AIProviderFactory, ProviderDescriptor } from "../provider";
import type { ProviderConfig } from "../types";
import { AIProviderNotFoundError } from "../types";

interface Registration {
  factory: AIProviderFactory;
  config: ProviderConfig;
  /** Cached instance, constructed on first use. */
  instance?: AIProvider;
}

const registry = new Map<AIProviderId, Registration>();

/** Register a provider factory under an id, replacing any existing entry. */
export function registerProvider(
  id: AIProviderId,
  factory: AIProviderFactory,
  config: ProviderConfig = {},
): void {
  registry.set(id, { factory, config });
}

/** Remove a provider from the registry. Returns whether it was present. */
export function unregisterProvider(id: AIProviderId): boolean {
  return registry.delete(id);
}

/** Whether a provider id is registered. */
export function hasProvider(id: AIProviderId): boolean {
  return registry.has(id);
}

/** List the ids of every registered provider. */
export function listProviderIds(): AIProviderId[] {
  return [...registry.keys()];
}

/** List descriptors for every registered provider, constructing each once. */
export function listProviders(): ProviderDescriptor[] {
  return listProviderIds().map((id) => getProvider(id).descriptor);
}

/**
 * Resolve a provider by id, constructing it on first use.
 *
 * @throws {AIProviderNotFoundError} when the id is not registered.
 */
export function getProvider(id: AIProviderId): AIProvider {
  const entry = registry.get(id);
  if (!entry) {
    throw new AIProviderNotFoundError(id);
  }
  if (!entry.instance) {
    const instance = entry.factory(entry.config);
    if (instance.descriptor.id !== id) {
      throw new Error(
        `AI provider registered as "${id}" reports descriptor id ` +
          `"${instance.descriptor.id}". The descriptor id must match the registration key.`,
      );
    }
    entry.instance = instance;
  }
  return entry.instance;
}

/**
 * Resolve the first registered provider that reports itself configured.
 *
 * Returns `undefined` when nothing is registered or nothing is configured, so
 * callers can decide how to surface the gap.
 */
export function getConfiguredProvider(): AIProvider | undefined {
  for (const id of registry.keys()) {
    const provider = getProvider(id);
    if (provider.isConfigured()) return provider;
  }
  return undefined;
}

/** Remove every registration. Intended for tests and environment resets. */
export function clearProviders(): void {
  registry.clear();
}
