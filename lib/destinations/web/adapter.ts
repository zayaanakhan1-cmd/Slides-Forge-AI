/**
 * Web destination adapter.
 *
 * The web destination renders a presentation using the application's own web
 * renderer. It is the only destination that is fully first-party in Phase 1, and
 * even here the renderer UI is not built yet: this adapter exposes a descriptor
 * and a route-based result, not a rendered page.
 */

import type {
  DestinationDescriptor,
  DestinationExportRequest,
  DestinationExportResult,
} from "@/types/destination";
import type { Presentation } from "@/types/presentation";
import { BaseDestinationAdapter, DestinationNotImplementedError } from "../base";

export const webDescriptor: DestinationDescriptor = {
  kind: "web",
  label: "Web presentation",
  description: "Interactive presentation rendered by the SlidesForge web renderer.",
  status: "planned",
  mimeType: "text/html",
  capabilities: {
    shareableLink: true,
    speakerNotes: true,
    nativeCharts: true,
    video: true,
    animations: true,
    editable: true,
  },
};

export class WebDestinationAdapter extends BaseDestinationAdapter {
  readonly descriptor = webDescriptor;

  protected async render(
    request: DestinationExportRequest,
    presentation: Presentation,
  ): Promise<DestinationExportResult> {
    // The canonical model already describes everything the web renderer needs.
    // Until the renderer route exists we refuse rather than pretend.
    void presentation;
    throw new DestinationNotImplementedError(
      request.destination,
      "The web renderer route is not implemented yet. The canonical model is ready to render; the view layer is planned.",
    );
  }
}
