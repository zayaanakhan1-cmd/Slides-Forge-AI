#!/usr/bin/env bash
#
# Run the frontend and the Python service together for local development.
#
# The frontend runs on http://localhost:3000 and the Python service on
# http://localhost:8000. Both are stopped when this script exits.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -x "$ROOT/python/.venv/bin/python" ]]; then
  PYTHON="$ROOT/python/.venv/bin/python"
else
  PYTHON="python3"
fi

"$PYTHON" -m uvicorn python.api.app:app --host 0.0.0.0 --port 8000 --reload &
PYTHON_PID=$!

cleanup() {
  kill "$PYTHON_PID" 2>/dev/null || true
}
trap cleanup EXIT

npm run dev
