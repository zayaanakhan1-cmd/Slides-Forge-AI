/**
 * Generation store.
 *
 * Holds the state of an in-flight generation: which pipeline stage is running,
 * what has completed, and the real error when something fails. It is driven
 * entirely by events received from the streaming API, so what it reports is
 * what actually happened.
 *
 * The store never marks a stage complete on a timer. A stage advances only when
 * an event arrives for it.
 */

import { create } from "zustand";

import {
  GENERATION_STAGES,
  type GenerationEvent,
  type GenerationPipelineOutput,
  type GenerationStage,
  type GenerationStageStatus,
  type SerializedAIError,
} from "@/types/ai";
import type { Presentation } from "@/types/presentation";

export type GenerationStatus = "idle" | "running" | "succeeded" | "failed";

export interface GenerationState {
  status: GenerationStatus;
  /** The prompt the user submitted. */
  prompt: string;
  /** Per-stage status, keyed by stage. */
  stages: Record<GenerationStage, GenerationStageStatus>;
  /** Non-fatal detail per stage, e.g. "10 slides planned". */
  details: Partial<Record<GenerationStage, string>>;
  /** Every event received, in order. */
  events: GenerationEvent[];
  /** Set when the pipeline produced a valid presentation. */
  presentation: Presentation | null;
  /** The pipeline's intermediate output, for inspection. */
  pipeline: GenerationPipelineOutput | null;
  /** Set when generation failed. */
  error: SerializedAIError | null;

  begin: (prompt: string) => void;
  applyEvent: (event: GenerationEvent) => void;
  succeed: (presentation: Presentation, pipeline: GenerationPipelineOutput) => void;
  fail: (error: SerializedAIError) => void;
  reset: () => void;
}

function initialStages(): Record<GenerationStage, GenerationStageStatus> {
  return GENERATION_STAGES.reduce(
    (accumulator, stage) => {
      accumulator[stage] = "pending";
      return accumulator;
    },
    {} as Record<GenerationStage, GenerationStageStatus>,
  );
}

export const useGenerationStore = create<GenerationState>((set) => ({
  status: "idle",
  prompt: "",
  stages: initialStages(),
  details: {},
  events: [],
  presentation: null,
  pipeline: null,
  error: null,

  begin: (prompt) =>
    set({
      status: "running",
      prompt,
      stages: initialStages(),
      details: {},
      events: [],
      presentation: null,
      pipeline: null,
      error: null,
    }),

  applyEvent: (event) =>
    set((state) => ({
      stages: { ...state.stages, [event.stage]: event.status },
      details:
        event.detail !== undefined
          ? { ...state.details, [event.stage]: event.detail }
          : state.details,
      events: [...state.events, event],
    })),

  succeed: (presentation, pipeline) =>
    set((state) => ({
      status: "succeeded",
      presentation,
      pipeline,
      error: null,
      // The final stage is the one that produced this result.
      stages: { ...state.stages, validate: "succeeded" },
    })),

  fail: (error) =>
    set(() => ({
      status: "failed",
      error,
      presentation: null,
    })),

  reset: () =>
    set({
      status: "idle",
      prompt: "",
      stages: initialStages(),
      details: {},
      events: [],
      presentation: null,
      pipeline: null,
      error: null,
    }),
}));
