/**
 * Destination adapter base.
 *
 * A destination adapter takes a validated canonical Presentation and delivers it
 * to one specific place. The important architectural rule is that
 * destination-specific rendering lives entirely inside the adapter: the
 * canonical model never learns about `.pptx` XML, the Google Slides API or PDF
 * page geometry.
 *
 * Phase 1 defines the base class and registers planned descriptors. The
 * adapters do not perform real exports yet and say so honestly.
 */

import type { Presentation } from "@/types/presentation";
import type {
  DestinationAdapter,
  DestinationDescriptor,
  DestinationExportInput,
  DestinationExportRequest,
  DestinationExportResult,
} from "@/types/destination";
import { assertPresentation } from "@/lib/presentation";

/** Raised when an adapter is asked to export before it is implemented. */
export class DestinationNotImplementedError extends Error {
  readonly destination: string;

  constructor(destination: string, detail?: string) {
    super(
      detail ??
        `The "${destination}" destination is planned but not implemented yet. ` +
          "It is registered so the application can reason about it, but it cannot export presentations.",
    );
    this.name = "DestinationNotImplementedError";
    this.destination = destination;
  }
}

/**
 * Base class for destination adapters.
 *
 * Subclasses implement `render`. The base class validates the presentation
 * before delegating, which guarantees every adapter only ever sees a model that
 * conforms to the canonical schema.
 */
export abstract class BaseDestinationAdapter implements DestinationAdapter {
  abstract readonly descriptor: DestinationDescriptor;

  /**
   * Validate a presentation and hand it to the concrete `render` implementation.
   * Adapters must not mutate `presentation`.
   */
  async export(input: DestinationExportInput): Promise<DestinationExportResult> {
    const valid = assertPresentation(input.presentation);
    return this.render(input.request, valid);
  }

  /** Destination-specific rendering. */
  protected abstract render(
    request: DestinationExportRequest,
    presentation: Presentation,
  ): Promise<DestinationExportResult>;

  /** Helper for adapters to build a failure result consistently. */
  protected failure(request: DestinationExportRequest, error: unknown): DestinationExportResult {
    return {
      destination: request.destination,
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
