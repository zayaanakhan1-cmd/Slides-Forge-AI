import type { Metadata } from "next";

import { EmptyState, PageHeader, Panel, PanelHeader } from "@/components/ui/primitives";
import { DEFAULT_THEME } from "@/lib/presentation";

export const metadata: Metadata = { title: "Templates" };

export default function TemplatesPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Design"
        title="Templates"
        description="Templates pair a narrative structure with a theme. The theme model exists today; the template library does not."
      />

      <Panel>
        <PanelHeader
          title="Template library"
          description="Reusable narrative and design templates will be stored here."
        />
        <div className="p-5">
          <EmptyState
            title="No templates yet"
            description="Templates are planned. The theme they will build on is already part of the canonical model, so a template can be added without changing the model."
          />
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          title="Default theme"
          description="The theme every new presentation starts from. It is real model data, not a mock."
        />
        <div className="grid gap-5 px-5 py-5 md:grid-cols-2">
          <div>
            <dl className="flex flex-col gap-2 text-[12px]">
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--sf-text-muted)]">Name</dt>
                <dd>{DEFAULT_THEME.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--sf-text-muted)]">Aspect ratio</dt>
                <dd className="font-mono">{DEFAULT_THEME.aspectRatio}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--sf-text-muted)]">Heading font</dt>
                <dd className="font-mono text-[11px]">{DEFAULT_THEME.typography.headingFont}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--sf-text-muted)]">Body size</dt>
                <dd className="font-mono">{DEFAULT_THEME.typography.scale.body}pt</dd>
              </div>
            </dl>
            <p className="mt-4 text-[11.5px] leading-relaxed text-[var(--sf-text-muted)]">
              {DEFAULT_THEME.description}
            </p>
          </div>
          <div>
            <p className="mb-3 text-[11px] uppercase tracking-[0.14em] text-[var(--sf-text-subtle)]">
              Palette
            </p>
            <ul className="grid grid-cols-2 gap-2">
              {Object.entries(DEFAULT_THEME.colors).map(([token, value]) => (
                <li
                  key={token}
                  className="flex items-center gap-2.5 rounded-[var(--sf-radius-sm)] border p-2"
                  style={{ borderColor: "var(--sf-border)" }}
                >
                  <span
                    aria-hidden
                    className="h-6 w-6 shrink-0 rounded-[5px] border"
                    style={{ background: value, borderColor: "var(--sf-border-strong)" }}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-[11px]">{token}</span>
                    <span className="block font-mono text-[10px] text-[var(--sf-text-subtle)]">
                      {value}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Panel>
    </div>
  );
}
