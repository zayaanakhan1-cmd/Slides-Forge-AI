import type { Metadata } from "next";

import { EmptyState, PageHeader, Panel, PanelHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Assets" };

export default function AssetsPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Library"
        title="Assets"
        description="Images, diagrams and media referenced by the presentation model. Asset storage is planned."
      />

      <Panel>
        <PanelHeader
          title="Asset library"
          description="Uploads, tagging and reuse across presentations."
        />
        <div className="p-5">
          <EmptyState
            title="No assets yet"
            description="The image, video and diagram elements already reference assets by source, so this library can be added without touching the model."
          />
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          title="Element kinds the model supports"
          description="Every kind is a real member of the SlideElement union, ready for the editor and renderers."
        />
        <ul className="flex flex-wrap gap-2 px-5 py-5">
          {["text", "image", "shape", "chart", "diagram", "video", "button", "group"].map(
            (kind) => (
              <li key={kind} className="sf-chip">
                {kind}
              </li>
            ),
          )}
        </ul>
      </Panel>
    </div>
  );
}
