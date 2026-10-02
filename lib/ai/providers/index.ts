/**
 * Provider barrel.
 *
 * Concrete providers live in this directory and register themselves through
 * `registerProvider`. `bootstrap.ts` registers the built-in provider from the
 * environment; nothing else in the application imports a vendor module.
 */

export * from "./registry";
export * from "./bootstrap";
export {
  OpenAICompatibleProvider,
  OPENAI_COMPATIBLE_PROVIDER_ID,
  ENV_KEYS,
  DEFAULTS,
  readProviderConfigFromEnv,
  openAICompatibleDescriptor,
} from "./openai-compatible/provider";
