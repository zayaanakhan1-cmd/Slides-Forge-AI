/**
 * Provider registration.
 *
 * Registers the real provider with the AI registry, reading its configuration
 * from the environment. This module is the single place that decides which
 * provider the application uses; application code still asks the registry, so
 * swapping providers later is a change here and nowhere else.
 *
 * Registration is idempotent and safe to call from several entry points (a
 * route handler, a script, a test). Calling it twice does not create duplicate
 * registrations.
 */

import { hasProvider, registerProvider } from "./registry";
import {
  OpenAICompatibleProvider,
  OPENAI_COMPATIBLE_PROVIDER_ID,
  readProviderConfigFromEnv,
} from "./openai-compatible/provider";

/**
 * Register the built-in provider if it is not already registered.
 *
 * The provider is registered whether or not an API key is present: an
 * unconfigured provider still appears in Settings and reports honestly that it
 * needs a key, which is more useful than silently vanishing.
 */
export function registerBuiltInProviders(
  env: Record<string, string | undefined> = process.env,
): void {
  if (hasProvider(OPENAI_COMPATIBLE_PROVIDER_ID)) return;
  const config = readProviderConfigFromEnv(env);
  registerProvider(
    OPENAI_COMPATIBLE_PROVIDER_ID,
    () => new OpenAICompatibleProvider(config),
    config,
  );
}

/** Ensure providers are registered. Called by the generation API route. */
export function ensureProvidersRegistered(): void {
  registerBuiltInProviders();
}
