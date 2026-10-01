import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState, PageHeader, Panel, PanelHeader } from "@/components/ui/primitives";
import { listDestinationDescriptors } from "@/lib/destinations";

export const metadata: Metadata = { title: "Presentations" };

export default function PresentationsPage() {
  const destinations = listDestinationDescriptors();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Library"
        title="Presentations"
        description="Presentations you generate will live here. The list is backed by the database schema, which is not connected yet."
      />

      <Panel>
        <PanelHeader
          title="Your presentations"
          description="Empty because persistence is planned, not because nothing was loaded."
        />
        <div className="p-5">
          <EmptyState
            title="No presentations yet"
            description="Connect PostgreSQL and run the Prisma migrations to enable saved presentations. Until then this library stays empty."
          >
            <Link
              href="/create"
              className="rounded-[var(--sf-radius-sm)] border px-3 py-1.5 text-[12px] font-medium transition-colors hover:bg-[var(--sf-surface-hover)]"
              style={{ borderColor: "var(--sf-border-strong)" }}
            >
              Create a presentation
            </Link>
          </EmptyState>
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          title="Export destinations"
          description="Where a finished presentation will be deliverable. None of these can export yet."
        />
        <ul className="grid gap-px sm:grid-cols-2" style={{ background: "var(--sf-border)" }}>
          {destinations.map((destination) => (
            <li key={destination.kind} className="bg-[var(--sf-surface)] p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[12.5px] font-medium">{destination.label}</span>
                <span className="sf-chip sf-chip-planned">{destination.status}</span>
              </div>
              <p className="mt-2 text-[11.5px] leading-relaxed text-[var(--sf-text-muted)]">
                {destination.description}
              </p>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {Object.entries(destination.capabilities)
                  .filter(([, supported]) => supported)
                  .map(([capability]) => (
                    <li key={capability} className="sf-chip">
                      {capability}
                    </li>
                  ))}
              </ul>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
