/**
 * Identifier helpers.
 *
 * IDs must be stable, collision-resistant and safe to persist. We prefer
 * `crypto.randomUUID`, which is available in the browser, Node and the edge
 * runtime, and fall back to a random string only if it is unavailable.
 */

const ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

function randomString(length: number): string {
  const bytes = new Uint8Array(length);
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
    cryptoObj.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += ID_ALPHABET[bytes[i] % ID_ALPHABET.length];
  }
  return out;
}

/**
 * Create a unique identifier, optionally namespaced with a prefix.
 *
 * @example
 * createId();            // "0f9c1e2a-..."
 * createId("slide");     // "slide_8k2m1p9q"
 */
export function createId(prefix?: string): string {
  const cryptoObj = globalThis.crypto;
  const uuid =
    cryptoObj && typeof cryptoObj.randomUUID === "function"
      ? cryptoObj.randomUUID()
      : `${randomString(8)}-${randomString(4)}-${randomString(4)}-${randomString(12)}`;
  return prefix ? `${prefix}_${uuid.replace(/-/g, "").slice(0, 16)}` : uuid;
}
