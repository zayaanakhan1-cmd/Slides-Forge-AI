/**
 * Provider barrel.
 *
 * Concrete providers (Gemini, Groq, OpenAI, ...) will live in this directory and
 * register themselves through `registerProvider`. None are included in Phase 1.
 */

export * from "./registry";
