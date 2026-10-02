import type { Metadata } from "next";

import { PageHeader, Panel, PanelHeader, StatusRow } from "@/components/ui/primitives";
import { listDestinationDescriptors } from "@/lib/destinations";
import { ensureProvidersRegistered } from "@/lib/ai/providers/bootstrap";
import { listProviders } from "@/lib/ai/providers/registry";
import { FOUNDATION_CAPABILITIES } from "@/lib/status/implementation";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  ensureProvidersRegistered();
  const providers = listProviders();
  const destinations = listDestinationDescriptors();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Workspace configuration for AI providers, destinations and persistence. Nothing here is editable yet."
      />

      <Panel>
        <PanelHeader
          title="AI providers"
          description="Providers are resolved through the AI registry and configured from the environment."
        />
        {providers.length === 0 ? (
          <div className="px-5 py-5">
            <p className="text-[12px] leading-relaxed text-[var(--sf-text-muted)]">
              No providers registered. The orchestrator raises a clear
              <code className="mx-1 font-mono">provider_not_configured</code>
              error rather than returning invented content. Add a provider by implementing
              <code className="mx-1 font-mono">AIProvider</code>
              and registering it with
              <code className="mx-1 font-mono">registerProvider</code>.
            </p>
          </div>
        ) : (
          <ul>
            {providers.map((provider) => (
              <li key={provider.id} className="border-b px-5 py-3.5 last:border-b-0" style={{ borderColor: "var(--sf-border)" }}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[12.5px] font-medium">{provider.label}</p>
                  <span className="sf-chip">{provider.id}</span>
                </div>
                <p className="mt-1 text-[11.5px] text-[var(--sf-text-muted)]">
                  {provider.description}
                </p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {provider.capabilities.map((capability) => (
                    <li key={capability} className="sf-chip">
                      {capability}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t px-5 py-4" style={{ borderColor: "var(--sf-border)" }}>
          <p className="text-[11.5px] leading-relaxed text-[var(--sf-text-muted)]">
            Configure with <code className="font-mono">SLIDESFORGE_AI_API_KEY</code>,{" "}
            <code className="font-mono">SLIDESFORGE_AI_BASE_URL</code>,{" "}
            <code className="font-mono">SLIDESFORGE_AI_MODEL</code> and{" "}
            <code className="font-mono">SLIDESFORGE_AI_TIMEOUT_MS</code>. Whether a
            provider is configured depends on the environment it is running in.
          </p>
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          title="Export destinations"
          description="Adapters are registered and typed. Export is planned for all of them."
        />
        <ul>
          {destinations.map((destination) => (
            <StatusRow
              key={destination.kind}
              label={destination.label}
              value={destination.description}
              status={destination.status}
            />
          ))}
        </ul>
      </Panel>

      <Panel>
        <PanelHeader
          title="Platform status"
          description="The same capability registry the dashboard reads from."
        />
        <ul>
          {FOUNDATION_CAPABILITIES.map((capability) => (
            <StatusRow
              key={capability.key}
              label={capability.label}
              value={capability.detail}
              status={capability.status}
            />
          ))}
        </ul>
      </Panel>

      <Panel>
        <PanelHeader
          title="Persistence"
          description="PostgreSQL through Prisma. The schema exists; no database is connected."
        />
        <ul>
          <StatusRow
            label="Database"
            value="Prisma schema defined for PostgreSQL. Connection is not configured in Phase 1."
            status="planned"
          />
          <StatusRow
            label="Environment"
            value="Copy .env.example to .env and set DATABASE_URL to connect."
            status="planned"
          />
        </ul>
      </Panel>
    </div>
  );
}
