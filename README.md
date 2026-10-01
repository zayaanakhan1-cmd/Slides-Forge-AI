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

This repository currently contains the **Phase 1 engineering foundation**. The
architecture, model and contracts are real; the AI and export integrations are
deliberately not implemented yet and are labelled as planned throughout the
codebase and UI.

| Area | Status | Notes |
| --- | --- | --- |
| Canonical presentation model (`types/`, `lib/presentation/`) | Implemented | Typed model plus Zod runtime validation, serialization and utilities. |
| Application shell and routes (`app/`, `components/`) | Implemented | Real Next.js routes sharing one workspace shell. |
| AI provider abstraction (`lib/ai/`) | Implemented | Provider interface, registry and orchestrator. No provider registered. |
| Destination architecture (`lib/destinations/`) | Implemented | Adapter contracts and descriptors for web, PowerPoint, Google Slides, PDF. |
| Database schema (`prisma/`) | Planned | PostgreSQL schema defined; no database connection required or configured. |
| Python service (`python/`) | Implemented (foundation) | FastAPI app exposing `GET /health`. |
| PowerPoint renderer (`python/destinations/powerpoint/`) | Implemented (minimal) | Produces a real `.pptx` from the canonical model for titles and text elements. |
| AI generation | Planned | No external AI API is called. |
| Google Slides export | Planned | Requires Google OAuth and the Google Slides API. |
| PDF export | Planned | Paginated rendering of the canonical model. |
| Presentation editor | Planned | Editing surface built on the canonical model. |

Nothing in this repository fabricates AI output, fake statistics or placeholder
metrics. Where a feature is not built, the UI and the code say so.

## Architecture overview

```
app/                     Next.js App Router routes and pages
components/              Shared UI: shell, brand, primitives, status
lib/
  ai/                    Provider abstraction, registry and orchestrator
  destinations/          Destination adapters and registry
  presentation/          Validation, serialization, factories, model utilities
  status/                Honest implementation-status registry
  store/                 Zustand UI shell store
  utils/                 Framework-free helpers
types/                   Canonical, strongly typed presentation model
prisma/                  PostgreSQL schema for Prisma
python/                  FastAPI service and planned generation stages
public/                  Static assets
scripts/                 Local development and verification scripts
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
- `orchestrator.ts` — sequences outline planning and slide generation and
  assembles a validated canonical `Presentation`.
- `providers/registry.ts` — registers provider factories by id and resolves them
  lazily.

No provider is registered in Phase 1. When a generation request arrives with
nothing registered, the orchestrator raises `AIProviderUnavailableError` rather
than returning invented content.

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
  api/            FastAPI application and routes (health only in Phase 1)
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

Copy `.env.example` to `.env` and fill in only what you need. Nothing is required
to run the Phase 1 foundation.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | No | Base URL used for absolute links and metadata. |
| `DATABASE_URL` | Only for Prisma commands | PostgreSQL connection string. |
| `SLIDESFORGE_PYTHON_URL` | No | Base URL of the FastAPI service. |
| `GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENAI_API_KEY` | No | Placeholders for planned AI providers. Unused in Phase 1. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | No | Placeholders for planned Google Slides export. Unused in Phase 1. |

## Database schema

`prisma/schema.prisma` targets PostgreSQL and defines `User`, `Presentation`,
`PresentationVersion`, `Slide`, `Asset`, `Template`, `GenerationJob`, `Export`
and `Integration`. The schema is designed around the canonical model:

- `Presentation.slides` stores a JSONB snapshot of the model so the model stays
  authoritative rather than being flattened into a lossy relational projection.
- `PresentationVersion` stores immutable snapshots for history, diffing and
  restore.
- `Slide` rows exist alongside the snapshot for ordering, search and relations.

No database connection is required in Phase 1. Validate the schema with:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/slidesforge?schema=public" \
  npx prisma validate
```

## Verification

Run everything at once:

```bash
./scripts/verify.sh
```

This runs ESLint, TypeScript type checking, the production build, the Python
tests and Prisma schema validation. `./scripts/dev.sh` runs the frontend and the
Python service together.

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

1. **Phase 1 — engineering foundation** (this release): model, validation,
   shell, AI abstraction, destination architecture, Python service, database
   schema.
2. Register and implement the first AI provider behind the existing abstraction.
3. Connect persistence and build the presentation editor on the canonical model.
4. Implement the PowerPoint renderer end to end.
5. Add Google Slides export (OAuth) and PDF export.
6. Build the research, quality-check and design stages.
