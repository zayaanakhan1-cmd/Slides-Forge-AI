/**
 * PDF destination adapter.
 *
 * Planned behaviour: render the canonical model to a paginated PDF. PDF export
 * is planned and not implemented in Phase 1.
 */

import type {
  DestinationDescriptor,
  DestinationExportRequest,
  DestinationExportResult,
} from "@/types/destination";
import type { Presentation } from "@/types/presentation";
import { BaseDestinationAdapter, DestinationNotImplementedError } from "../base";

export const pdfDescriptor: DestinationDescriptor = {
  kind: "pdf",
  label: "PDF document",
  description: "Paginated PDF export of the presentation.",
  status: "planned",
  fileExtension: "pdf",
  mimeType: "application/pdf",
  capabilities: {
    shareableLink: false,
    speakerNotes: false,
    nativeCharts: false,
    video: false,
    animations: false,
    editable: false,
  },
};

export class PdfDestinationAdapter extends BaseDestinationAdapter {
  readonly descriptor = pdfDescriptor;

  protected async render(
    request: DestinationExportRequest,
    presentation: Presentation,
  ): Promise<DestinationExportResult> {
    void presentation;
    throw new DestinationNotImplementedError(
      request.destination,
      "PDF export is planned and not implemented yet.",
    );
  }
}
