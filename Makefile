SHELL := /bin/bash
PY := apps/api/.venv/bin/python
API_PORT ?= 8000
WEB_PORT ?= 3000

.PHONY: setup setup-api setup-local-ai setup-web seed ingest api web dev test test-api test-web clean

setup: setup-api setup-web ingest ## install everything (core) and build the database + indexes

setup-api:
	@PY=$$(./scripts/pick-python.sh) && \
	if [ -x apps/api/.venv/bin/python ] && ! apps/api/.venv/bin/python -c 'import sys; raise SystemExit(0 if (3, 11) <= sys.version_info[:2] <= (3, 13) else 1)'; then \
	  echo "Recreating apps/api/.venv (needs Python 3.11–3.13; current venv is $$(apps/api/.venv/bin/python -V))"; \
	  rm -rf apps/api/.venv; \
	fi && \
	cd apps/api && (command -v uv >/dev/null && uv venv -q --python "$$PY" .venv && uv pip install -q --python .venv/bin/python -r requirements.txt \
	  || ("$$PY" -m venv .venv && .venv/bin/pip install -q -r requirements.txt))

setup-local-ai: ## optional: free local embeddings (sentence-transformers + CPU torch)
	cd apps/api && (command -v uv >/dev/null && uv pip install --python .venv/bin/python --index-url https://download.pytorch.org/whl/cpu torch \
	  && uv pip install --python .venv/bin/python -r requirements-local-ai.txt \
	  || (.venv/bin/pip install --index-url https://download.pytorch.org/whl/cpu torch && .venv/bin/pip install -r requirements-local-ai.txt))

setup-web:
	cd apps/web && npm install --no-audit --no-fund

seed: ## rebuild data/seed/*.json from raw sources in data/sources/
	cd apps/api && .venv/bin/python -m app.ingest.build_seed

ingest: ## load seed into SQLite and build FTS + vector indexes
	cd apps/api && .venv/bin/python -m app.ingest

api:
	cd apps/api && .venv/bin/uvicorn app.main:app --reload --port $(API_PORT)

web:
	cd apps/web && npm run dev -- -p $(WEB_PORT)

dev: ## start api + web together
	./scripts/dev.sh

test: test-api test-web

test-api:
	cd apps/api && .venv/bin/python -m pytest -q

test-web:
	cd apps/web && npm test && npx tsc --noEmit

clean:
	rm -rf data/db data/index apps/web/.next
