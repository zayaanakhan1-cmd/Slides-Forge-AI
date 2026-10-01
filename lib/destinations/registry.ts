/**
 * Destination registry.
 *
 * The registry is how the rest of the application discovers destinations. UI
 * code asks for descriptors (labels, status, capabilities) rather than importing
 * adapters, which keeps the planned-vs-available distinction explicit.
 */

import type {
  DestinationAdapter,
  DestinationDescriptor,
  DestinationKind,
} from "@/types/destination";
import type { Presentation } from "@/types/presentation";
import { WebDestinationAdapter } from "./web/adapter";
import { PowerPointDestinationAdapter } from "./powerpoint/adapter";
import { GoogleSlidesDestinationAdapter } from "./google-slides/adapter";
import { PdfDestinationAdapter } from "./pdf/adapter";

const adapters = new Map<DestinationKind, DestinationAdapter>();

/** Register (or replace) the adapter for a destination. */
export function registerDestination(adapter: DestinationAdapter): void {
  adapters.set(adapter.descriptor.kind, adapter);
}

/** Resolve the adapter for a destination kind. */
export function getDestinationAdapter(kind: DestinationKind): DestinationAdapter | undefined {
  return adapters.get(kind);
}

/** List descriptors for every registered destination, in a stable order. */
export function listDestinationDescriptors(): DestinationDescriptor[] {
  const order: DestinationKind[] = ["web", "powerpoint", "google-slides", "pdf"];
  return order
    .map((kind) => adapters.get(kind)?.descriptor)
    .filter((descriptor): descriptor is DestinationDescriptor => Boolean(descriptor));
}

/** List descriptors filtered by implementation status. */
export function listDestinationsByStatus(
  status: DestinationDescriptor["status"],
): DestinationDescriptor[] {
  return listDestinationDescriptors().filter((descriptor) => descriptor.status === status);
}

/**
 * Export a presentation to a destination.
 *
 * Throws `DestinationNotImplementedError` for destinations that are registered
 * but not implemented, which is every destination except none in Phase 1.
 */
export async function exportPresentation(
  kind: DestinationKind,
  presentation: Presentation,
  options: { fileName?: string; options?: Record<string, unknown> } = {},
) {
  const adapter = adapters.get(kind);
  if (!adapter) {
    throw new Error(`No destination adapter is registered for "${kind}".`);
  }
  return adapter.export({
    request: {
      presentationId: presentation.id,
      destination: kind,
      fileName: options.fileName,
      options: options.options,
    },
    presentation,
  });
}

// Register the four destinations the product is designed around. All are
// currently "planned"; none can export yet.
registerDestination(new WebDestinationAdapter());
registerDestination(new PowerPointDestinationAdapter());
registerDestination(new GoogleSlidesDestinationAdapter());
registerDestination(new PdfDestinationAdapter());
