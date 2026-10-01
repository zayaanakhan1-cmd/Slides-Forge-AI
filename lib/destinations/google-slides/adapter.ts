/**
 * Google Slides destination adapter.
 *
 * Planned behaviour: create an actual Google Slides presentation through the
 * Google Slides API, using OAuth credentials supplied by the user. That
 * integration is explicitly out of scope for Phase 1. The adapter is registered
 * so the destination is visible and typed, not so it can be used.
 */

import type {
  DestinationDescriptor,
  DestinationExportRequest,
  DestinationExportResult,
} from "@/types/destination";
import type { Presentation } from "@/types/presentation";
import { BaseDestinationAdapter, DestinationNotImplementedError } from "../base";

export const googleSlidesDescriptor: DestinationDescriptor = {
  kind: "google-slides",
  label: "Google Slides",
  description: "Presentation created through the Google Slides API and stored in Drive.",
  status: "planned",
  mimeType: "application/vnd.google-apps.presentation",
  capabilities: {
    shareableLink: true,
    speakerNotes: true,
    nativeCharts: false,
    video: true,
    animations: false,
    editable: true,
  },
};

export class GoogleSlidesDestinationAdapter extends BaseDestinationAdapter {
  readonly descriptor = googleSlidesDescriptor;

  protected async render(
    request: DestinationExportRequest,
    presentation: Presentation,
  ): Promise<DestinationExportResult> {
    void presentation;
    throw new DestinationNotImplementedError(
      request.destination,
      "Google Slides export is planned. It requires Google OAuth, which is not part of Phase 1.",
    );
  }
}
