/**
 * Shared utility helpers with no dependency on the presentation model.
 */

/** Join conditional class names, skipping falsy values. */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

/** Current time as an ISO-8601 string. Isolated so tests can stub it later. */
export function nowIso(): string {
  return new Date().toISOString();
}

/** Clamp a number to the inclusive range [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Return a copy of an array with the item at `from` moved to `to`. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = items.slice();
  if (from < 0 || from >= next.length) return next;
  const clampedTo = clamp(to, 0, next.length - 1);
  const [item] = next.splice(from, 1);
  next.splice(clampedTo, 0, item);
  return next;
}
