# Flame in Freefall - QA Status

**As of:** Tuesday 10 Nov 2026, ~15:30 EST (America/New_York)
**Plan:** [`QA_TEST_PLAN.md`](QA_TEST_PLAN.md) (131 cases: 83 P0, 35 P1, 13 P2)

## Bottom line

- **Sign-off: NOT possible yet.**
- **Executed API/UI cases: 0. Passed: 0.** Nothing has been run against a live API or web app.
- **Current blocker - QA-F-001:** no runnable web/API surface. `apps/api/app/routers/` and `services/` contain only
  empty `__init__.py` files, `apps/api/tests/` is empty, there is no `apps/web`, no README, and `scripts/` is empty.

## What has landed (seen in the repo on 10 Nov 2026)

| Area | State |
|---|---|
| Docs | PRD.md, FOUNDATION_BRIEF.md, ARCHITECTURE.md, chatgpt-session.md, plus this QA plan/status |
| Seed | `data/seed/investigations.v1.json`: 16 investigations, 1,624 test runs (meets 12-16); `challenge_brief_chunks.v1.json`; `partial_gravity_gap` record (LUCI/FM2, challenge_brief) |
| Sources | PSI JSON for 19 records, experimental table CSVs, challenge page text; `psi_physci_repo.html` is an empty app shell; `official_resources/` empty |
| DB / index | `data/db/flame.sqlite` (16 investigations, 1,624 test_runs, 264 documents, 800 measurements, 175 chunks + FTS); `data/index/` FAISS, 175 chunks, local MiniLM 384-dim |
| API code | Scaffolding only: config, db, models, units, labels, scenarios, ingest, retrieval, ai/providers; `.venv` present. No routes. |
| Missing | `apps/web`, README, `.env.example`, `.gitignore`, docker-compose, Makefile / `scripts/dev.sh`, tests, git repo |

## Seed / code-review findings (static, not executed tests)

QA-F-001 Blocker (no runnable surface) - QA-F-002 16-record seed covers named families - QA-F-003 LUCI/FM2 gap
in data but no UI yet - QA-F-004 BASS (psi-26) all oxygen/pressure/airflow null; CSV header has no such columns, so
likely a true source gap (domain lead to confirm; UI must say Not reported) - QA-F-005 FLEX pressure float noise
(101.01838248000001 kPa from 757.7 mmHg) - QA-F-006 BRE `3400%` correctly stored as not_reported - QA-F-007
E-FIELD is microgravity with partial_gravity_mimic=True - QA-F-008 PSI pages can 200 for any path; check content -
QA-F-009 extra ACME source files (PSI-10, 21, 23) not seeded - **QA-F-010 Major: verification_status vocabulary
mismatch** between ARCHITECTURE enum and seed/labels.py - QA-F-011 docs say Chroma, repo has FAISS - QA-F-012
CFI-G pressure in bar, O2 as mole fraction - QA-F-013 lunar targets correctly tagged challenge_brief - QA-F-014
official resources not yet present. Details: plan section 4.

## When execution can start

1. **Smoke (FND/SEC):** as soon as a README + API start command exist and `GET /api/health/providers` responds.
2. **Catalog / filter / coverage / compare / rank:** when those routes return seed data (no LLM needed).
3. **RAG / provider:** when `POST /api/ask` exists; run once with Ollama or a cloud key, once with no LLM.
4. **UI, E2E, accessibility:** when `apps/web` starts from the README.
5. **Re-test after official resources:** 13 Nov 2026 (plan section 20).

## Decisions needed (they change expected results)

See plan section 21. Most urgent: **G-4** filter semantics (any-run, inclusive bounds, range/set matching),
**G-5** whether challenge_brief values count in numeric filters, **G-7** one verification_status mapping (QA-F-010).
