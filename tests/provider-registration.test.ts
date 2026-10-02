import { afterEach, describe, expect, it } from "vitest";

import {
  clearProviders,
  getConfiguredProvider,
  getProvider,
  hasProvider,
  listProviderIds,
  listProviders,
  registerProvider,
} from "@/lib/ai/providers/registry";
import {
  registerBuiltInProviders,
} from "@/lib/ai/providers/bootstrap";
import {
  ENV_KEYS,
  OpenAICompatibleProvider,
  OPENAI_COMPATIBLE_PROVIDER_ID,
  readProviderConfigFromEnv,
} from "@/lib/ai/providers/openai-compatible/provider";
import { AIProviderNotFoundError } from "@/lib/ai/types";
import { TestProvider, testRequest } from "./helpers/test-provider";

afterEach(() => {
  clearProviders();
});

describe("provider registry", () => {
  it("starts empty", () => {
    expect(listProviderIds()).toEqual([]);
    expect(getConfiguredProvider()).toBeUndefined();
  });

  it("registers and resolves a provider by id", () => {
    registerProvider("test", () => new TestProvider());
    expect(hasProvider("test")).toBe(true);
    expect(getProvider("test").descriptor.id).toBe("test");
    expect(listProviderIds()).toEqual(["test"]);
  });

  it("throws a typed error for an unknown provider", () => {
    expect(() => getProvider("missing")).toThrow(AIProviderNotFoundError);
  });

  it("constructs a provider lazily and caches the instance", () => {
    let constructions = 0;
    registerProvider("test", () => {
      constructions += 1;
      return new TestProvider();
    });
    expect(constructions).toBe(0);
    const first = getProvider("test");
    const second = getProvider("test");
    expect(constructions).toBe(1);
    expect(first).toBe(second);
  });

  it("lists only configured providers as usable", () => {
    registerProvider("unconfigured", () => new TestProvider({ enabled: false }, {}, "unconfigured"));
    registerProvider("configured", () => new TestProvider({ enabled: true }, {}, "configured"));
    expect(getConfiguredProvider()?.descriptor.id).toBe("configured");
  });

  it("returns descriptors for the UI", () => {
    registerProvider("test", () => new TestProvider());
    const descriptors = listProviders();
    expect(descriptors).toHaveLength(1);
    expect(descriptors[0]).toMatchObject({ id: "test", label: "Test provider" });
  });

  it("rejects a provider whose descriptor id does not match its key", () => {
    registerProvider("mismatched", () => new TestProvider({}, {}, "different"));
    expect(() => getProvider("mismatched")).toThrow(/must match the registration key/);
  });
});

describe("built-in provider registration", () => {
  it("registers the OpenAI-compatible provider even without a key", () => {
    registerBuiltInProviders({});
    expect(hasProvider(OPENAI_COMPATIBLE_PROVIDER_ID)).toBe(true);
    const provider = getProvider(OPENAI_COMPATIBLE_PROVIDER_ID);
    expect(provider).toBeInstanceOf(OpenAICompatibleProvider);
    // Registered but honestly unconfigured.
    expect(provider.isConfigured()).toBe(false);
  });

  it("reports configured when an API key is present", () => {
    registerBuiltInProviders({ [ENV_KEYS.apiKey]: "sk-test" });
    expect(getProvider(OPENAI_COMPATIBLE_PROVIDER_ID).isConfigured()).toBe(true);
    expect(getConfiguredProvider()?.descriptor.id).toBe(OPENAI_COMPATIBLE_PROVIDER_ID);
  });

  it("is idempotent", () => {
    registerBuiltInProviders({ [ENV_KEYS.apiKey]: "sk-test" });
    registerBuiltInProviders({ [ENV_KEYS.apiKey]: "sk-test" });
    expect(listProviderIds()).toEqual([OPENAI_COMPATIBLE_PROVIDER_ID]);
  });
});

describe("environment configuration", () => {
  it("falls back to defaults when the environment is empty", () => {
    const config = readProviderConfigFromEnv({});
    expect(config.apiKey).toBeUndefined();
    expect(config.enabled).toBe(false);
    expect(config.baseUrl).toContain("http");
    expect(config.defaultModel).toBeTruthy();
  });

  it("reads base URL, model and timeout overrides", () => {
    const config = readProviderConfigFromEnv({
      [ENV_KEYS.apiKey]: "  sk-test  ",
      [ENV_KEYS.baseUrl]: "https://example.test/v1",
      [ENV_KEYS.model]: "custom-model",
      [ENV_KEYS.timeoutMs]: "1500",
    });
    expect(config.apiKey).toBe("sk-test");
    expect(config.enabled).toBe(true);
    expect(config.baseUrl).toBe("https://example.test/v1");
    expect(config.defaultModel).toBe("custom-model");
    expect(config.timeoutMs).toBe(1500);
  });

  it("never hard-codes a credential", () => {
    const config = readProviderConfigFromEnv({});
    expect(config.apiKey).toBeUndefined();
  });
});

describe("test provider sanity", () => {
  it("produces a schema-shaped outline", async () => {
    const provider = new TestProvider();
    const outline = await provider.generateOutline(testRequest());
    expect(outline.slides).toHaveLength(3);
  });
});
