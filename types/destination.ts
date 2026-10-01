/**
 * Destination model.
 *
 * A destination is where a finished presentation can be delivered. The
 * canonical Presentation model is destination-agnostic; each destination
 * declares its own capabilities so the UI and orchestration layers can reason
 * about what is currently possible without importing a concrete adapter.
 */

/** The destinations the product is designed to support. */
export type DestinationKind = "web" | "powerpoint" | "google-slides" | "pdf";

/** How mature a destination integration currently is. */
export type DestinationStatus = "available" | "planned" | "unavailable";

/** MIME types a destination can emit, e.g. "application/pdf". */
export type MimeType = string;

export interface DestinationCapabilities {
  /** Whether the destination can produce a shareable link. */
  shareableLink: boolean;
  /** Whether the destination supports speaker notes. */
  speakerNotes: boolean;
  /** Whether the destination supports native charts. */
  nativeCharts: boolean;
  /** Whether the destination supports embedded video. */
  video: boolean;
  /** Whether the destination supports animations or transitions. */
  animations: boolean;
  /** Whether the destination can be edited after export. */
  editable: boolean;
}

/** Static, import-safe description of a destination. */
export interface DestinationDescriptor {
  kind: DestinationKind;
  /** Display name, e.g. "PowerPoint (.pptx)". */
  label: string;
  /** One-line description of what the destination produces. */
  description: string;
  status: DestinationStatus;
  /** File extension for file-based destinations, e.g. "pptx". */
  fileExtension?: string;
  mimeType?: MimeType;
  capabilities: DestinationCapabilities;
}

/** A request to deliver a presentation to a destination. */
export interface DestinationExportRequest {
  presentationId: string;
  destination: DestinationKind;
  /** Optional file name (without extension) for file-based destinations. */
  fileName?: string;
  /** Destination-specific options; validated by the adapter that consumes them. */
  options?: Record<string, unknown>;
}

/**
 * The canonical presentation payload handed to an adapter.
 *
 * Adapters receive the fully validated Presentation plus the export request, so
 * destination-specific rendering can read the model without the model knowing
 * anything about the destination.
 */
export interface DestinationExportInput {
  request: DestinationExportRequest;
  presentation: import("./presentation").Presentation;
}

/** The successful result of an export. */
export interface DestinationExportResult {
  destination: DestinationKind;
  status: "succeeded" | "failed";
  /** Present for file-based destinations. */
  fileName?: string;
  mimeType?: MimeType;
  /** Present for link-based destinations. */
  url?: string;
  /** Size of the produced artifact in bytes, when known. */
  byteSize?: number;
  /** Human-readable error when `status` is "failed". */
  error?: string;
}

/** A destination the caller can deliver a presentation to. */
export interface DestinationAdapter {
  readonly descriptor: DestinationDescriptor;
  /**
   * Deliver a canonical presentation to this destination.
   *
   * The adapter receives a validated Presentation and returns a structured
   * result. It must not mutate the input model.
   */
  export(input: DestinationExportInput): Promise<DestinationExportResult>;
}
