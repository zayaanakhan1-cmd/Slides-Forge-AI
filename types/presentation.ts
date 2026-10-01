/**
 * Presentation model.
 *
 * This is the canonical, source-of-truth model owned by the application. AI,
 * the editor, the web renderer, the PowerPoint renderer, the Google Slides
 * adapter and the PDF renderer all exchange presentations using this shape.
 *
 * AI never drives the UI directly: it produces a Presentation that conforms to
 * this model, and the application decides how to render or persist it.
 */

import type { JsonObject } from "./json";
import type { Slide } from "./slide";
import type { Theme } from "./theme";

/** The current schema version of the canonical model. */
export const PRESENTATION_SCHEMA_VERSION = "1.0.0";

/** Forward-compatible presentation metadata, always JSON-safe. */
export interface PresentationMetadata extends JsonObject {
  /** Version of the model the presentation was authored against. */
  schemaVersion: string;
}

/** Who the presentation is for. */
export interface PresentationAudience {
  /** Short label, e.g. "Grade 9 biology students". */
  label: string;
  /** Free-form description of prior knowledge and context. */
  description?: string;
  /** Approximate audience size, when known. */
  size?: number;
}

/** Why the presentation exists. */
export interface PresentationPurpose {
  /** Short label, e.g. "Teach mitosis". */
  label: string;
  /** Free-form description of the intended outcome. */
  description?: string;
  /** Target duration in minutes, when known. */
  durationMinutes?: number;
}

/** Academic subject and level metadata. */
export interface PresentationSubject {
  /** Subject name, e.g. "Biology". */
  name: string;
  /** Curriculum or topic within the subject, e.g. "Cell division". */
  topic?: string;
  /** Grade or year level, e.g. "Grade 9". */
  gradeLevel?: string;
  /** Curriculum standard codes this presentation maps to. */
  standards?: string[];
}

/** Lightweight provenance for a presentation. */
export interface PresentationSource {
  kind: "user" | "ai" | "template" | "import";
  /** Optional reference to a template, generation job or import. */
  referenceId?: string;
}

export interface Presentation {
  id: string;
  title: string;
  description: string;
  audience: PresentationAudience;
  purpose: PresentationPurpose;
  subject: PresentationSubject;
  gradeLevel: string;
  theme: Theme;
  slides: Slide[];
  /** Monotonic version number, incremented on every persisted change. */
  version: number;
  /** ISO-8601 timestamp. */
  createdAt: string;
  /** ISO-8601 timestamp. */
  updatedAt: string;
  /** Optional provenance describing how the presentation was created. */
  source?: PresentationSource;
  /** Optional language tag, e.g. "en-US". */
  language?: string;
  /** Forward-compatible presentation metadata that is not yet first-class. */
  metadata?: JsonObject;
}

/** Fields required to create a presentation; the rest are defaulted. */
export type PresentationInput = Pick<Presentation, "title"> &
  Partial<Omit<Presentation, "id" | "version" | "createdAt" | "updatedAt">>;

/** A minimal reference to a presentation, used by lists and navigation. */
export interface PresentationSummary {
  id: string;
  title: string;
  description: string;
  slideCount: number;
  version: number;
  updatedAt: string;
}
