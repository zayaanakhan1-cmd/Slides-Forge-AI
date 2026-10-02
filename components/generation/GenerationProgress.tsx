/**
 * Generation progress.
 *
 * Renders the pipeline stages from the generation store. Each stage reflects
 * real state: `running` is set when the orchestrator starts the stage and
 * `succeeded` only when its output has been validated. The component never
 * animates a stage to completion on its own.
 */

"use client";

import { GENERATION_STAGE_DESCRIPTORS, type GenerationStageStatus } from "@/types/ai";
import { useGenerationStore } from "@/lib/store/generation-store";
import { cn } from "@/lib/utils/helpers";

function StageDot({ status }: { status: GenerationStageStatus }) {
  const color =
    status === "succeeded"
      ? "var(--sf-success)"
      : status === "running"
        ? "var(--sf-accent)"
        : status === "failed"
          ? "var(--sf-danger)"
          : "var(--sf-border-strong)";
  return (
    <span className="relative flex h-3 w-3 shrink-0 items-center justify-center">
      <span
        className={cn("h-2 w-2 rounded-full", status === "running" && "animate-pulse")}
        style={{ background: color }}
      />
    </span>
  );
}

export function GenerationProgress() {
  const stages = useGenerationStore((state) => state.stages);
  const details = useGenerationStore((state) => state.details);

  return (
    <ol className="flex flex-col">
      {GENERATION_STAGE_DESCRIPTORS.map((descriptor, index) => {
        const status = stages[descriptor.stage];
        return (
          <li
            key={descriptor.stage}
            className="flex items-start gap-3 border-b px-5 py-3.5 last:border-b-0"
            style={{ borderColor: "var(--sf-border)" }}
          >
            <span className="pt-1">
              <StageDot status={status} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p
                  className={cn(
                    "text-[12.5px] font-medium",
                    status === "pending" && "text-[var(--sf-text-subtle)]",
                  )}
                >
                  {index + 1}. {descriptor.label}
                </p>
                <span className="font-mono text-[10px] text-[var(--sf-text-subtle)]">
                  {status}
                </span>
              </div>
              <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--sf-text-muted)]">
                {details[descriptor.stage] ?? descriptor.description}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
