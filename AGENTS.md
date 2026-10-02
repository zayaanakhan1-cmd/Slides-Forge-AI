# AGENTS.md

Repository-specific guidance for agents working in SlidesForge AI.

## What this is

An AI presentation intelligence platform for education. The application owns a
canonical Presentation model (`types/`, validated in `lib/presentation/schemas.ts`)
and AI produces structured data conforming to that model. AI never controls the
UI and never returns geometry; the app owns layout, ids and the model.

## Commands

```bash
npm install
npm run dev          # dev server (port 3000)
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm test             # Vitest, run once
npm run build        # production build
./scripts/verify.sh  # lint + typecheck + tests + build + python tests + prisma validate
```

Python service:

```bash
python/.venv/bin/python -m uvicorn python.api.app:app --port 8000
python/.venv/bin/python -m pytest python/tests -c python/pytest.ini
```

## Architecture boundaries

- `types/` — canonical model. Do not add `any`; element kinds are a
  discriminated union on `type` and must stay extensible.
- `lib/presentation/` — Zod schemas mirroring the types, builders, factories,
  serialization. The model must be safe to pass between AI, editor, web
  renderer, PowerPoint renderer, Google Slides adapter and PDF renderer.
- `lib/ai/` — provider abstraction. Application code depends on `AIProvider`,
  never a vendor SDK. Providers are resolved through `providers/registry.ts`.
  The orchestrator runs `understand → research → narrative → slidePlan →
  generate → validate`, validating each stage before the next runs.
- `lib/destinations/` — adapter contracts; destination-specific rendering stays
  inside an adapter.
- `app/api/` — generation routes (JSON and NDJSON streaming).
- `lib/store/` — Zustand stores. Generation state advances only on real events.

## Conventions

- Honesty is a hard requirement: never fabricate AI output, progress, metrics or
  export success. Unfinished features are labelled planned in the UI and code
  (`lib/status/implementation.ts`).
- No `any` in the presentation model. Keep TypeScript strict.
- Run `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` before
  finishing any change.

## Testing notes

Pipeline tests run against a deterministic in-memory provider
(`tests/helpers/test-provider.ts`), so orchestration and validation are exercised
without an external API. Runtime verification can point
`SLIDESFORGE_AI_BASE_URL` at a local mock `/chat/completions` server.
