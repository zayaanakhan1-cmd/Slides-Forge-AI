#!/usr/bin/env bash
#
# Verify the Phase 1 foundation end to end.
#
# Runs the frontend lint, type check and production build, then the Python
# service tests. Fails fast on the first error so problems are not hidden.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> Frontend: lint"
npm run lint

echo "==> Frontend: type check"
npm run typecheck

echo "==> Frontend: production build"
npm run build

echo "==> Python: tests"
if [[ -x "$ROOT/python/.venv/bin/python" ]]; then
  PYTHON="$ROOT/python/.venv/bin/python"
else
  PYTHON="python3"
fi
"$PYTHON" -m pytest python/tests -c python/pytest.ini

echo "==> Prisma: schema validation"
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/slidesforge?schema=public}" \
  npx prisma validate

echo "All checks passed."
