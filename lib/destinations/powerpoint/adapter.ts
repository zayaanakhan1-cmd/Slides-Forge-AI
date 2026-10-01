/**
 * PowerPoint destination adapter.
 *
 * Planned behaviour: transform the canonical Presentation into a real `.pptx`
 * file. Two paths are anticipated:
 *
 *   1. An in-process TypeScript renderer (future).
 *   2. A request to the Python service, which owns the `python-pptx` renderer
 *      under `python/destinations/powerpoint/`.
 *
 * This adapter does neither yet. It is registered so the application can list
 * PowerPoint as a known destination without claiming it works.
 */

import type {
  DestinationDescriptor,
  DestinationExportRequest,
  DestinationExportResult,
} from "@/types/destination";
import type { Presentation } from "@/types/presentation";
import { BaseDestinationAdapter, DestinationNotImplementedError } from "../base";

export const powerpointDescriptor: DestinationDescriptor = {
  kind: "powerpoint",
  label: "PowerPoint (.pptx)",
  description: "Real .pptx file generated from the canonical presentation model.",
  status: "planned",
  fileExtension: "pptx",
  mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  capabilities: {
    shareableLink: false,
    speakerNotes: true,
    nativeCharts: true,
    video: false,
    animations: false,
    editable: true,
  },
};

export class PowerPointDestinationAdapter extends BaseDestinationAdapter {
  readonly descriptor = powerpointDescriptor;

  protected async render(
    request: DestinationExportRequest,
    presentation: Presentation,
  ): Promise<DestinationExportResult> {
    void presentation;
    throw new DestinationNotImplementedError(
      request.destination,
      "PowerPoint export is planned. A future request will render the canonical model to a real .pptx via the Python python-pptx renderer.",
    );
  }
}
