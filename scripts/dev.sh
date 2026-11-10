#!/usr/bin/env bash
# Start the FastAPI backend and the Next.js frontend together. Ctrl-C stops both.
set -euo pipefail
cd "$(dirname "$0")/.."
API_PORT="${API_PORT:-8000}"; WEB_PORT="${WEB_PORT:-3000}"

if [ ! -x apps/api/.venv/bin/python ]; then echo "First run: make setup"; exit 1; fi
if [ ! -f data/db/flame.sqlite ]; then echo "Building database + indexes..."; (cd apps/api && .venv/bin/python -m app.ingest); fi
if [ ! -d apps/web/node_modules ]; then (cd apps/web && npm install --no-audit --no-fund); fi

(cd apps/api && exec .venv/bin/uvicorn app.main:app --reload --port "$API_PORT") &
API_PID=$!
(cd apps/web && NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:$API_PORT}" exec npm run dev -- -p "$WEB_PORT") &
WEB_PID=$!
trap 'kill $API_PID $WEB_PID 2>/dev/null || true' INT TERM EXIT
echo "API: http://localhost:$API_PORT/docs   Web: http://localhost:$WEB_PORT"
wait
