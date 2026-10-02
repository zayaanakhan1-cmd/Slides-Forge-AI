/**
 * Implementation status registry.
 *
 * A single, honest source of truth for what exists and what is planned. Routes
 * render this instead of asserting that unfinished features work.
 */

export type ImplementationStatus = "available" | "planned" | "unavailable";

export interface CapabilityStatus {
  key: string;
  label: string;
  status: ImplementationStatus;
  detail: string;
}

export const FOUNDATION_CAPABILITIES: CapabilityStatus[] = [
  {
    key: "model",
    label: "Canonical presentation model",
    status: "available",
    detail: "Strongly typed model with runtime validation, serialization and utilities.",
  },
  {
    key: "shell",
    label: "Application shell",
    status: "available",
    detail: "Shared chrome, navigation and the workspace visual system.",
  },
  {
    key: "ai-abstraction",
    label: "AI provider abstraction",
    status: "available",
    detail:
      "Provider interface, registry and a real OpenAI-compatible provider configured from the environment.",
  },
  {
    key: "destination-architecture",
    label: "Destination architecture",
    status: "available",
    detail: "Adapter contracts and descriptors for web, PowerPoint, Google Slides and PDF.",
  },
  {
    key: "python-service",
    label: "Python service foundation",
    status: "available",
    detail: "FastAPI application exposing GET /health, structured for future stages.",
  },
  {
    key: "generation-pipeline",
    label: "Generation pipeline",
    status: "available",
    detail:
      "Understand, research, narrative, slide plan, generate and validate — each stage validated at runtime.",
  },
  {
    key: "generation-api",
    label: "Generation API",
    status: "available",
    detail:
      "Streaming and JSON endpoints with structured errors. Requires a configured provider.",
  },
  {
    key: "presentation-viewer",
    label: "Presentation viewer",
    status: "available",
    detail: "Slide canvas, thumbnails, navigation and deck metadata on the canonical model.",
  },
  {
    key: "slide-editing",
    label: "Slide editing",
    status: "available",
    detail: "Slide selection, title, body text and speaker notes. Element manipulation is planned.",
  },
  {
    key: "database-schema",
    label: "Database schema",
    status: "planned",
    detail: "Prisma schema is defined for PostgreSQL; no database is connected yet.",
  },
  {
    key: "powerpoint-export",
    label: "PowerPoint export",
    status: "planned",
    detail: "Will render the canonical model to a real .pptx via python-pptx.",
  },
  {
    key: "google-slides",
    label: "Google Slides export",
    status: "planned",
    detail: "Requires Google OAuth and the Google Slides API.",
  },
  {
    key: "pdf-export",
    label: "PDF export",
    status: "planned",
    detail: "Paginated PDF rendering of the canonical model.",
  },
  {
    key: "persistence",
    label: "Presentation persistence",
    status: "planned",
    detail: "Generated decks live in memory for the session; saving to PostgreSQL is planned.",
  },
  {
    key: "full-editor",
    label: "Full editor",
    status: "planned",
    detail: "Element manipulation, reordering and layout editing on the canonical model.",
  },
];

export function countByStatus(status: ImplementationStatus): number {
  return FOUNDATION_CAPABILITIES.filter((capability) => capability.status === status).length;
}
