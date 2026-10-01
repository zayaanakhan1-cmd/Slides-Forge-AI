/**
 * The long-term product pipeline.
 *
 * This is the flow SlidesForge AI is being built toward. It is rendered as
 * design intent, not as working features, and says so in the footer.
 */

const STAGES = [
  "Understand",
  "Research",
  "Build narrative",
  "Plan slides",
  "Generate",
  "Design",
  "Quality check",
  "Edit",
  "Present",
  "Export",
] as const;

export function Pipeline({ compact = false }: { compact?: boolean }) {
  return (
    <div>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
        {STAGES.map((stage, index) => (
          <li key={stage} className="flex items-center gap-1.5">
            <span
              className="rounded-[var(--sf-radius-sm)] border px-2 py-1 text-[11px] text-[var(--sf-text-muted)]"
              style={{ borderColor: "var(--sf-border)", background: "rgba(255,255,255,0.015)" }}
            >
              {stage}
            </span>
            {index < STAGES.length - 1 ? (
              <span aria-hidden className="text-[10px] text-[var(--sf-text-subtle)]">
                →
              </span>
            ) : null}
          </li>
        ))}
      </ol>
      {compact ? null : (
        <p className="mt-3 text-[11px] leading-relaxed text-[var(--sf-text-subtle)]">
          Designed product flow. Each stage is being built in sequence; none of the AI,
          design or export stages are implemented in this foundation release.
        </p>
      )}
    </div>
  );
}
