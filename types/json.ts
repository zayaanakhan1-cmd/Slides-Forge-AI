/**
 * JSON-safe value types.
 *
 * These exist so that extensible parts of the presentation model (element
 * metadata, provider hints, adapter options) can carry arbitrary data without
 * ever falling back to `any`. Anything that must survive a round trip through
 * JSON is expressed with these types.
 */

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface JsonObject {
  [key: string]: JsonValue;
}
