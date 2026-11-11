#!/usr/bin/env bash
# Same as `make setup` for machines without make. Add --local-ai for free local embeddings.
set -euo pipefail
cd "$(dirname "$0")/.."
PY="$(./scripts/pick-python.sh)"
cd apps/api
if [ -x .venv/bin/python ] && ! .venv/bin/python -c 'import sys; raise SystemExit(0 if (3, 11) <= sys.version_info[:2] <= (3, 13) else 1)'; then
  echo "Recreating apps/api/.venv (needs Python 3.11–3.13; current venv is $(.venv/bin/python -V))"
  rm -rf .venv
fi
if command -v uv >/dev/null; then uv venv -q --python "$PY" .venv && uv pip install -q --python .venv/bin/python -r requirements.txt
else "$PY" -m venv .venv && .venv/bin/pip install -q -r requirements.txt; fi
if [ "${1:-}" = "--local-ai" ]; then
  if command -v uv >/dev/null; then
    uv pip install --python .venv/bin/python --index-url https://download.pytorch.org/whl/cpu torch
    uv pip install --python .venv/bin/python -r requirements-local-ai.txt
  else
    .venv/bin/pip install --index-url https://download.pytorch.org/whl/cpu torch && .venv/bin/pip install -r requirements-local-ai.txt
  fi
fi
.venv/bin/python -m app.ingest
cd ../web && npm install --no-audit --no-fund
echo "Done. Start both apps with ./scripts/dev.sh"
