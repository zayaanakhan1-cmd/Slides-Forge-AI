import Link from "next/link";

import { Logo } from "@/components/brand/Logo";
import { Pipeline } from "@/components/status/Pipeline";
import { Chip } from "@/components/ui/primitives";
import { listDestinationDescriptors } from "@/lib/destinations";

const PILLARS = [
  {
    title: "Understands the request",
    body: "Reads the topic, audience, subject and grade level before anything is generated.",
  },
  {
    title: "Builds a narrative",
    body: "Plans the story of the lesson first, then the slides that carry it.",
  },
  {
    title: "Owns a structured model",
    body: "AI produces data that conforms to the presentation model — it never drives the UI.",
  },
  {
    title: "Exports anywhere",
    body: "One canonical model, rendered to web, PowerPoint, Google Slides or PDF.",
  },
];

export default function LandingPage() {
  const destinations = listDestinationDescriptors();

  return (
    <div className="flex flex-col gap-14">
      <section className="flex flex-col gap-6">
        <Logo />
        <div className="flex flex-col gap-4">
          <Chip tone="accent">Phase 2 · AI generation pipeline</Chip>
          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight md:text-5xl">
            AI presentation intelligence for education.
          </h1>
          <p className="max-w-2xl text-[14px] leading-relaxed text-[var(--sf-text-muted)]">
            SlidesForge AI turns a teaching request into a researched, structured and
            designed presentation. It is not a dashboard, a text generator or a
            PowerPoint wrapper — it owns a canonical presentation model and renders it
            to wherever the work needs to go.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-[var(--sf-radius-sm)] px-3.5 py-2 text-[12.5px] font-medium text-[#0b0d12]"
            style={{ background: "var(--sf-accent)" }}
          >
            Open the workspace
          </Link>
          <Link
            href="/create"
            className="rounded-[var(--sf-radius-sm)] border px-3.5 py-2 text-[12.5px] font-medium text-[var(--sf-text)] transition-colors hover:bg-[var(--sf-surface-hover)]"
            style={{ borderColor: "var(--sf-border-strong)" }}
          >
            Start creating
          </Link>
        </div>
      </section>

      <section className="sf-panel p-5">
        <h2 className="mb-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--sf-text-subtle)]">
          Product pipeline
        </h2>
        <Pipeline />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {PILLARS.map((pillar) => (
          <div key={pillar.title} className="sf-panel p-5">
            <h3 className="text-[13px] font-semibold tracking-tight">{pillar.title}</h3>
            <p className="mt-2 text-[12px] leading-relaxed text-[var(--sf-text-muted)]">
              {pillar.body}
            </p>
          </div>
        ))}
      </section>

      <section className="sf-panel">
        <header className="border-b px-5 py-4" style={{ borderColor: "var(--sf-border)" }}>
          <h2 className="text-[13px] font-semibold tracking-tight">Destinations</h2>
          <p className="mt-1 text-[12px] text-[var(--sf-text-muted)]">
            The canonical model is destination-agnostic. Every destination below is
            designed and typed; none can export yet.
          </p>
        </header>
        <ul className="grid gap-px sm:grid-cols-2" style={{ background: "var(--sf-border)" }}>
          {destinations.map((destination) => (
            <li key={destination.kind} className="bg-[var(--sf-surface)] p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[12.5px] font-medium">{destination.label}</span>
                <Chip tone="planned">{destination.status}</Chip>
              </div>
              <p className="mt-2 text-[11.5px] leading-relaxed text-[var(--sf-text-muted)]">
                {destination.description}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
