#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
(cd apps/api && .venv/bin/python -m pytest -q)
(cd apps/web && npm test && npx tsc --noEmit)
