# SlidesForge AI

AI presentation intelligence platform for education.

SlidesForge AI turns a teaching request into a researched, structured and
designed presentation. It is not a dashboard, a generic AI text generator, a
fake presentation generator or a PowerPoint wrapper. It owns a canonical
presentation model, and AI produces structured data that conforms to that model
rather than driving the UI directly.

The long-term product flow is:

```
User request
  → Understand
  → Research
  → Build narrative
  → Plan slides
  → Generate structured presentation
  → Design
  → Quality check
  → Edit
  → Present
  → Export to the requested destination
```

## Implementation status

This repository currently contains the **Phase 2 AI generation slice**, built on
the Phase 1 engineering foundation. The canonical model, the AI provider
abstraction, the generation pipeline and the in-app viewer/editor are real and
exercised by tests. Export destinations and persistence remain deliberately
unimplemented and are labelled as planned throughout the codebase and UI.

| Area | Status | Notes |
| --- | --- | --- |
| Canonical presentation model (`types/`, `lib/presentation/`) | Implemented | Typed model plus Zod runtime validation, serialization and utilities. |
| Application shell and routes (`app/`, `components/`) | Implemented | Real Next.js routes sharing one workspace shell. |
| AI provider abstraction (`lib/ai/`) | Implemented | Provider interface, registry and orchestrator. |
| OpenAI-compatible provider (`lib/ai/providers/openai-compatible/`) | Implemented | Real `chat/completions` client. Requires `SLIDESFORGE_AI_API_KEY`; without it the API returns a structured `provider_not_configured` error. |
| Generation pipeline (`lib/ai/orchestrator.ts`) | Implemented | understand → research → narrative → slide plan → generate → validate, with per-stage runtime validation and progress events. |
| Generation API (`app/api/presentations/generate/`) | Implemented | JSON and NDJSON streaming endpoints with structured errors. |
| Presentation viewer and editor (`components/presentation/`) | Implemented | Slide canvas, thumbnails, navigation, title/body/speaker-note editing on the canonical model. |
| Database schema (`prisma/`) | Planned | PostgreSQL schema defined; no database connection required or configured. |
| Python service (`python/`) | Implemented (foundation) | FastAPI app exposing `GET /health`. |
| PowerPoint renderer (`python/destinations/powerpoint/`) | Implemented (minimal) | Produces a real `.pptx` from the canonical model for titles and text elements. |
| PowerPoint export from the app | Planned | The web app does not yet call the Python renderer. |
| Google Slides export | Planned | Requires Google OAuth and the Google Slides API. |
| PDF export | Planned | Paginated rendering of the canonical model. |
| Persistence | Planned | Generated decks live in memory for the session; saving to PostgreSQL is not built. |

Nothing in this repository fabricates AI output, fake statistics or placeholder
metrics. When no provider is configured the application reports that honestly
instead of inventing a deck. Where a feature is not built, the UI and the code
say so.

### What the generation slice does

Given a sentence such as *"Create a 10-slide presentation about the future of
artificial intelligence"*, the application:

1. parses the prompt deterministically into a structured
   `PresentationGenerationRequest` (`lib/ai/prompt.ts`);
2. streams the request through the orchestrator, which runs six validated stages
   and emits real progress events (`lib/ai/orchestrator.ts`);
3. assembles the stage output into a canonical `Presentation`, validated against
   the model schema before it is returned;
4. renders the result in the viewer, where slides can be inspected and lightly
   edited.

AI never controls the UI and never returns geometry. The provider returns
content; the application owns layout, ids and the model.

## Architecture overview

```
app/                     Next.js App Router routes, pages and API routes
components/              Shared UI: shell, brand, primitives, presentation, generation
lib/
  ai/                    Provider abstraction, registry, orchestrator and providers
  api/                   Server-side API helpers and the browser stream client
  destinations/          Destination adapters and registry
  presentation/          Validation, serialization, factories, builders, model utilities
  status/                Honest implementation-status registry
  store/                 Zustand generation and presentation stores
  utils/                 Framework-free helpers
types/                   Canonical, strongly typed presentation model
prisma/                  PostgreSQL schema for Prisma
python/                  FastAPI service and planned generation stages
public/                  Static assets
scripts/                 Local development and verification scripts
tests/                   Vitest suite for the model, AI layer and stores
```

Key boundaries:

- **The model is the source of truth.** `types/` defines the model;
  `lib/presentation/` validates it at runtime and provides pure utilities. AI,
  the editor and every renderer exchange this model.
- **AI is abstracted.** Application code depends on `AIProvider` and resolves a
  concrete provider through `lib/ai/providers/registry.ts`. No vendor SDK is
  imported by application logic.
- **Destinations are adapters.** `lib/destinations/base.ts` defines the adapter
  contract. Destination-specific rendering lives inside an adapter; the model
  never learns about `.pptx` XML, the Google Slides API or PDF page geometry.

## Canonical presentation model

The model lives in `types/`:

- `types/presentation.ts` — `Presentation` (id, title, description, audience,
  purpose, subject, gradeLevel, theme, slides, version, timestamps, source,
  language, metadata).
- `types/slide.ts` — `Slide` (id, title, narrativeRole, layout, elements,
  speakerNotes, metadata) and the `SlideElement` discriminated union.
- `types/theme.ts` — `Theme` (colours, typography, spacing, aspect ratio).
- `types/destination.ts` — destination kinds, descriptors and the adapter
  contract.
- `types/ai.ts` — provider-agnostic generation request/response types.
- `types/json.ts`, `types/geometry.ts` — JSON-safe and geometry primitives.

Elements are a discriminated union on `type` and support `text`, `image`,
`shape`, `chart`, `diagram`, `video`, `button` and `group`. Adding a new element
kind forces every exhaustive consumer to handle it.

`lib/presentation/schemas.ts` mirrors the types as Zod schemas so the model can
be validated at every boundary it crosses: AI generation, the editor, the web
renderer, the PowerPoint renderer, the Google Slides adapter and the PDF
renderer. The model uses no `any`.

## AI abstraction

`lib/ai/` contains:

- `provider.ts` — the `AIProvider` interface and `ProviderDescriptor`.
- `types.ts` — call options, provider config and structured `AIError` types.
- `prompt.ts` — deterministic parsing of a user prompt into a structured request.
- `orchestrator.ts` — runs the six-stage pipeline, validating each stage's
  output before the next stage sees it, then assembles a validated canonical
  `Presentation`.
- `providers/registry.ts` — registers provider factories by id and resolves them
  lazily. A provider whose descriptor id does not match its registration key is
  rejected.
- `providers/bootstrap.ts` — registers the built-in providers from the
  environment.
- `providers/openai-compatible/` — a real OpenAI-compatible `chat/completions`
  client (`http.ts`, `prompts.ts`, `provider.ts`).

The pipeline stages are `understand → research → narrative → slidePlan →
generate → validate`. Each stage is a separate, validated provider call, which
is what makes honest per-stage progress possible. If a stage returns output that
does not match the model, the stage fails with `invalid_response` and the
pipeline stops — no later stage runs on bad data.

Application code never imports a vendor SDK. Swapping providers means
implementing `AIProvider` and registering it; nothing else changes.

### Configuring a provider

The built-in provider is configured entirely from the environment:

| Variable | Default | Purpose |
| --- | --- | --- |
| `SLIDESFORGE_AI_API_KEY` | *(none)* | Enables generation. Without it the API returns `503 provider_not_configured`. |
| `SLIDESFORGE_AI_BASE_URL` | `https://api.openai.com/v1` | Any OpenAI-compatible endpoint. |
| `SLIDESFORGE_AI_MODEL` | `gpt-4o-mini` | Default model id. |
| `SLIDESFORGE_AI_TIMEOUT_MS` | `60000` | Per-request timeout. |

This works with OpenAI, Groq, OpenRouter, Together, vLLM and any other endpoint
that implements `/chat/completions`. The credential is never hard-coded and
never written into an error message.

## Destination architecture

`lib/destinations/` defines an adapter per destination, registered in
`registry.ts`:

- **Web** — rendered by the application's own renderer (planned).
- **PowerPoint** — a real `.pptx` (planned on the TypeScript side; a minimal
  verified renderer exists in Python).
- **Google Slides** — an actual Google Slides presentation via the Google API
  (planned; requires OAuth).
- **PDF** — paginated export of the canonical model (planned).

Every adapter is registered with status `planned` and refuses to export rather
than pretending. `listDestinationDescriptors()` is what the UI reads to show
labels, capabilities and status.

## Development prerequisites

- Node.js 20 or newer and npm.
- Python 3.11 or newer.
- PostgreSQL (only needed when you connect the database; not required for the
  foundation).
- Optional: a local PostgreSQL instance or Docker for Prisma migrations later.

## Frontend setup

```bash
npm install
npm run dev
```

The app runs at http://localhost:3000. Routes:

- `/` — product overview
- `/dashboard` — implementation status overview
- `/create` — the generation request form
- `/presentations` — presentation library (empty until persistence is connected)
- `/templates` — template library and the default theme
- `/assets` — asset library
- `/settings` — providers, destinations and platform status

Available scripts:

```bash
npm run dev         # start the dev server
npm run build       # production build
npm run start       # serve the production build
npm run lint        # ESLint
npm run typecheck   # TypeScript, no emit
npm test            # Vitest suite (run once)
npm run test:watch  # Vitest in watch mode
npm run prisma:generate
npm run prisma:validate
npm run prisma:format
```

## Python service setup

```bash
cd python
python3 -m venv .venv
./.venv/bin/python -m pip install -r requirements-dev.txt
```

Run the service from the repository root so the `python.` package imports
resolve:

```bash
python/.venv/bin/python -m uvicorn python.api.app:app --reload --port 8000
```

Then verify it:

```bash
curl http://localhost:8000/health
# {"status":"ok","service":"SlidesForge AI Service","version":"0.1.0",...}
```

Run the Python tests:

```bash
python/.venv/bin/python -m pytest python/tests -c python/pytest.ini
```

The tests verify the health endpoint and that the PowerPoint renderer produces a
valid `.pptx` that reopens with `python-pptx` and contains the expected content.

### Python package layout

```
python/
  api/            FastAPI application and routes (health only)
  core/           Configuration and logging
  intelligence/   AI orchestration (planned)
  story/          Narrative construction (planned)
  slides/         Slide planning and generation (planned)
  design/         Design and theming (planned)
  quality/        Quality checks (planned)
  documents/      Document processing (planned)
  destinations/   Destination adapters
    powerpoint/   python-pptx renderer (minimal, verified)
  tests/          Pytest suite
```

## Environment variables

Copy `.env.example` to `.env` and fill in only what you need. The application
runs without any environment variables; generation requires an AI provider key.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | No | Base URL used for absolute links and metadata. |
| `DATABASE_URL` | Only for Prisma commands | PostgreSQL connection string. |
| `SLIDESFORGE_PYTHON_URL` | No | Base URL of the FastAPI service. |
| `SLIDESFORGE_AI_API_KEY` | For generation | Enables the OpenAI-compatible provider. Without it, generation returns `provider_not_configured`. |
| `SLIDESFORGE_AI_BASE_URL` | No | Endpoint base URL (default `https://api.openai.com/v1`). |
| `SLIDESFORGE_AI_MODEL` | No | Default model id (default `gpt-4o-mini`). |
| `SLIDESFORGE_AI_TIMEOUT_MS` | No | Per-request timeout in ms (default `60000`). |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | No | Placeholders for planned Google Slides export. Unused. |

## Generation API

Two routes serve generation. Both require a configured provider.

- `POST /api/presentations/generate` — runs the pipeline and returns JSON:
  `{ presentation, serialized, pipeline, events }`.
- `POST /api/presentations/generate/stream` — same pipeline, streamed as NDJSON.
  Each line is one of `{ type: "event" }`, `{ type: "result" }` or
  `{ type: "error" }`.
- `GET /api/presentations/generate` — readiness probe: reports whether a
  provider is configured and which providers are registered.

The request body is either a prompt or a structured request:

```jsonc
// short form — parsed deterministically by the app
{ "prompt": "Create a 10-slide presentation about the future of AI" }

// structured form
{
  "topic": "Photosynthesis",
  "audience": { "label": "Grade 8" },
  "purpose": { "label": "Teach a lesson" },
  "subject": { "name": "Biology" },
  "gradeLevel": "Grade 8",
  "slideCount": 10
}
```

Errors are structured and honest, never fabricated:

```jsonc
{ "error": { "code": "provider_not_configured", "message": "...", "retryable": false } }
```

## Database schema

`prisma/schema.prisma` targets PostgreSQL and defines `User`, `Presentation`,
`PresentationVersion`, `Slide`, `Asset`, `Template`, `GenerationJob`, `Export`
and `Integration`. The schema is designed around the canonical model:

- `Presentation.slides` stores a JSONB snapshot of the model so the model stays
  authoritative rather than being flattened into a lossy relational projection.
- `PresentationVersion` stores immutable snapshots for history, diffing and
  restore.
- `Slide` rows exist alongside the snapshot for ordering, search and relations.

No database connection is required yet. Validate the schema with:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/slidesforge?schema=public" \
  npx prisma validate
```

## Verification

Run everything at once:

```bash
./scripts/verify.sh
```

This runs ESLint, TypeScript type checking, the production build, the Vitest
suite, the Python tests and Prisma schema validation. `./scripts/dev.sh` runs the
frontend and the Python service together.

The Vitest suite (`tests/`) covers the prompt parser, the generation pipeline
including per-stage validation and failure handling, the OpenAI-compatible HTTP
client's error mapping, the stream client, the canonical model validation and
the Zustand stores. Pipeline tests run against a deterministic in-memory
provider, so they exercise the real orchestration and validation code without
calling an external API.

## Planned destination architecture

The canonical model is destination-agnostic by design. The planned flow for each
destination is:

```
Presentation Model → Destination Adapter → Destination-native output
```

- **PowerPoint** → `PowerPointRenderer` → `python-pptx` → real `.pptx`.
- **Google Slides** → Google Slides API → an actual Google Slides presentation.
- **Web** → the application's own renderer → an interactive presentation.
- **PDF** → a PDF renderer → a paginated document.

These integrations are planned and not implemented. They are typed and
registered so the rest of the application can reason about them without claiming
they work.

## Roadmap

1. **Phase 1 — engineering foundation**: model, validation, shell, AI
   abstraction, destination architecture, Python service, database schema.
2. **Phase 2 — AI generation slice** (this release): OpenAI-compatible provider,
   validated six-stage pipeline, streaming and JSON generation API, viewer and
   light editor on the canonical model.
3. Connect persistence so generated presentations are saved and versioned.
4. Implement the PowerPoint renderer end to end and call it from the app.
5. Add Google Slides export (OAuth) and PDF export.
6. Build the quality-check and design stages, and the full editor.
