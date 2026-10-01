import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState, PageHeader, Panel, PanelHeader } from "@/components/ui/primitives";
import { Pipeline } from "@/components/status/Pipeline";
import { FOUNDATION_CAPABILITIES } from "@/lib/status/implementation";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  const available = FOUNDATION_CAPABILITIES.filter((c) => c.status === "available");
  const planned = FOUNDATION_CAPABILITIES.filter((c) => c.status === "planned");

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Workspace"
        title="Dashboard"
        description="A read-only view of the foundation that exists today. Nothing here is a placeholder metric — it reflects the actual implementation status."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <Panel className="p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--sf-text-subtle)]">
            Implemented
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{available.length}</p>
          <p className="mt-1 text-[11.5px] text-[var(--sf-text-muted)]">
            Foundation capabilities shipping in Phase 1
          </p>
        </Panel>
        <Panel className="p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--sf-text-subtle)]">
            Planned
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{planned.length}</p>
          <p className="mt-1 text-[11.5px] text-[var(--sf-text-muted)]">
            Designed and typed, not yet built
          </p>
        </Panel>
        <Panel className="p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--sf-text-subtle)]">
            Presentations
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">0</p>
          <p className="mt-1 text-[11.5px] text-[var(--sf-text-muted)]">
            Persistence is not connected yet
          </p>
        </Panel>
      </section>

      <Panel>
        <PanelHeader
          title="Capability status"
          description="What works, what is planned, and the difference between the two."
        />
        <ul>
          {FOUNDATION_CAPABILITIES.map((capability) => (
            <li
              key={capability.key}
              className="flex items-start justify-between gap-4 border-b px-5 py-3.5 last:border-b-0"
              style={{ borderColor: "var(--sf-border)" }}
            >
              <div className="min-w-0">
                <p className="text-[12.5px] font-medium">{capability.label}</p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--sf-text-muted)]">
                  {capability.detail}
                </p>
              </div>
              <span className="mt-0.5 shrink-0">
                <span
                  className={
                    capability.status === "available" ? "sf-chip sf-chip-accent" : "sf-chip sf-chip-planned"
                  }
                >
                  {capability.status}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel>
        <PanelHeader title="Product pipeline" description="Where Phase 1 sits in the larger product." />
        <div className="px-5 py-5">
          <Pipeline />
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Recent presentations" description="Persistence is planned, so this list is empty." />
        <div className="p-5">
          <EmptyState
            title="No presentations yet"
            description="Once the database schema is connected and AI generation is implemented, presentations you create will appear here."
          >
            <Link
              href="/create"
              className="rounded-[var(--sf-radius-sm)] border px-3 py-1.5 text-[12px] font-medium transition-colors hover:bg-[var(--sf-surface-hover)]"
              style={{ borderColor: "var(--sf-border-strong)" }}
            >
              Go to Create
            </Link>
          </EmptyState>
        </div>
      </Panel>
    </div>
  );
}
