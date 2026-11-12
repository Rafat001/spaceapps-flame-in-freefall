# Flame in Freefall — microgravity combustion evidence explorer

2026 NASA Space Apps Challenge · [Flame in Freefall: SI-Powered Fire Safety Insights from Microgravity Combustion Data](https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/?tab=details)

A research-discovery dashboard over NASA **Physical Sciences Informatics (PSI)** combustion investigations that answers
**"has work already been done for these parameters?"** (fuel/material, oxygen, pressure, airflow, gravity regime, hardware,
measurement type), and lets researchers inspect, compare, rank by research relevance, and ask evidence-grounded questions.

> Decision support / discovery only — **not** a certified fire-risk calculator, materials qualification system, or
> spacecraft safety authority. PSI has **no partial-gravity combustion data yet**; microgravity results do not
> directly establish lunar or Martian performance.

Official challenge resources are published **Friday 13 Nov 2026** and are **not** included yet (see `data/sources/official/README.md`).

## Quick start (local, no Docker)

Requirements: Python **3.11–3.13** (3.13 tested), Node 20+ (22/24 tested), optionally [`uv`](https://docs.astral.sh/uv/). Python 3.14 is not supported yet — Homebrew’s `python3` may already be 3.14 and can crash during `make ingest` (Error 134). Use `brew install python@3.13` and let `make setup` pick it.

```bash
cd spaceapps-flame-in-freefall
cp .env.example .env          # optional; defaults work without it
make setup                    # API venv + web node_modules + build SQLite/FTS/vector index
make setup-local-ai           # OPTIONAL: free local embeddings (sentence-transformers, ~1 GB, CPU torch)
make ingest                   # re-run after setup-local-ai so vectors use the local model
make dev                      # API http://localhost:8000/docs  +  web http://localhost:3000
```

Or start separately: `make api` and `make web`. Tests: `make test`.

If `make ingest` exits with **Error 134** and a loky/semaphore warning, the venv is almost certainly Python 3.14. After pulling this fix, ingest falls back to offline hash embeddings instead of aborting. For real local sentence-transformers embeddings:

```bash
brew install python@3.13
rm -rf apps/api/.venv
make setup
make setup-local-ai
make ingest
```

No `make`? Use the scripts: `./scripts/setup.sh` (add `--local-ai` for sentence-transformers), `./scripts/dev.sh`, `./scripts/test.sh`.

Without `setup-local-ai` the API automatically uses offline **hash embeddings** (no download) and tells you so in
**AI settings**; without an LLM the assistant runs in **retrieval-only mode** (sources + setup message).

## Docker

```bash
docker compose up --build                     # api :8000 + web :3000 (hash embeddings, no LLM needed)
docker compose --profile ollama up --build    # + Ollama :11434
docker compose exec ollama ollama pull llama3.2
LOCAL_AI=1 AI_EMBEDDING_PROVIDER=local docker compose up --build   # bake sentence-transformers into the api image
```

## Local (free) vs paid AI

Switch in `.env` (or at runtime on the **AI settings** page / `PUT /api/settings/ai`; keys are env-only):

| Purpose | Free / local | Paid |
| --- | --- | --- |
| LLM for `/api/ask` | `AI_LLM_PROVIDER=local` → Ollama (`OLLAMA_MODEL=llama3.2`, `OLLAMA_BASE_URL`) | `AI_LLM_PROVIDER=openai` + `OPENAI_API_KEY` (`OPENAI_MODEL`) or `anthropic` + `ANTHROPIC_API_KEY` (`ANTHROPIC_MODEL`) |
| Embeddings | `AI_EMBEDDING_PROVIDER=local` → sentence-transformers `all-MiniLM-L6-v2`; or `hash` (offline fallback) | `AI_EMBEDDING_PROVIDER=openai` (`text-embedding-3-small`) |
| No AI at all | `AI_LLM_PROVIDER=none` | — |

Ollama: install from https://ollama.com, `ollama serve`, `ollama pull llama3.2`. After changing the embedding provider,
rebuild vectors (`make ingest` or the button in AI settings) — the API detects a mismatched index and falls back to lexical + SQL.

## What is in the app

| Screen | API |
| --- | --- |
| **Home** — scenario selector, search, top research-relevant investigations, reference atmospheres from the brief | `GET /api/meta`, `GET /api/rank` |
| **Explorer** — filters (family, fuel class, topic, measurement type, material, O2 %, pressure kPa/psi/atm/bar, airflow m/s/cm/s), sort, compare picks, CSV export | `GET /api/investigations`, `GET /api/export.csv` |
| **Investigation detail** — objectives, setup, hypothesis, conditions per PSI table row with source text, sensors, topics with triggering sentences, brief mentions, documents | `GET /api/investigations/{id}` |
| **Has it been done?** — parameter coverage form: documented match / partial overlap / no documented overlap, per-parameter status (match, match in other runs, mismatch, unknown), matching rows | `POST /api/coverage` |
| **Compare** — 2–3 investigations side by side with labels and Not reported cells | `POST /api/compare` |
| **Relevance ranking** — PRD §9 weighted score with per-criterion citations and flags | `GET /api/rank?scenario=lunar_habitat` |
| **Ask the evidence** — hybrid-RAG Q&A with citations / abstention | `POST /api/ask` |
| **AI settings** — provider status and switch, index status, rebuild | `GET/PUT /api/settings/ai`, `POST /api/ingest/rebuild` |

### Architecture

```
apps/web  (Next.js App Router, TypeScript)  ──HTTP──>  apps/api (FastAPI)
                                                     ├─ SQLite (SQLAlchemy): investigations, documents, chunks, test_runs, measurements
                                                     ├─ SQLite FTS5 (BM25)                 ← lexical
                                                     ├─ data/index (FAISS / NumPy)          ← vector
                                                     ├─ app/ai/providers: embeddings (local|openai|hash), llm (local|openai|anthropic|none)
                                                     └─ services: catalog, coverage, ranking, compare, ask (hybrid RAG)
ingestion: data/sources (raw PSI JSON + CSV, brief) → app.ingest.build_seed → data/seed/*.v1.json → app.ingest → DB + indexes
```

**Hybrid retrieval** (`app/retrieval/hybrid.py`): optional structured pre-filter by investigation → FTS5 BM25 + vector
search → reciprocal-rank fusion, small boost when an investigation acronym is named. **Ask** (`app/services/ask.py`):
abstains if evidence is weak (low term coverage *and* low similarity) or the question asks for a quantity with no
structured measurements (e.g. flame spread rate); sanitises instruction-like text in sources; wraps sources as
untrusted data; validates `[S#]` citations and strips invented ones; adds partial-gravity / "not a certification" notes.

**Numeric semantics**: conditions live on PSI table rows (`test_runs`) with `min/max` (single values have min = max),
verbatim source text, context and flags. A filter matches only known values whose range overlaps the request; all
numeric constraints must hold on the **same** row. Unknown never matches.

**Ranking** (`app/services/ranking.py`, version `sfsri-v0.1`): `score = 100 × Σ weight × match`, weights 25/25/20/15/15
(material, oxygen/atmosphere, prevention/flame behavior, detection/suppression, habitat applicability). Lunar habitat /
rover targets (O2 ≥ 30 %, ≤ 10.2 psi) come from the official brief; Mars and spacecraft targets are *Not established*.
Weights and match values are product hypotheses for the domain lead to review.

### Evidence labels
`Reported by authors (PSI record)` · `Reported by authors (PSI experimental table)` · `Measured (as listed in PSI experimental table)` ·
`Official challenge brief` · `Curator classification (rule-based keyword match)` · `AI interpretation` · `Not established` · `Not reported`.

## Seed catalog (16 PSI investigations)

BASS (PSI-26), BASS-II (PSI-25), SAFFIRE-I/II/III (PSI-98/99/100), SAME (PSI-102), SAME-R (PSI-101), DAFT/DAFT-2 (PSI-47),
FLEX (PSI-69), FLEX-2 (PSI-68), CFI (PSI-39), ACME CFI-G (PSI-159), ACME BRE (PSI-20), ACME E-FIELD Flames (PSI-22),
SPICE (PSI-107), SLICE (PSI-106) — 1624 rows from PSI experimental tables. LUCI and FM2 are listed only as a future
partial-gravity gap (no records invented). See `data/README.md` for provenance and parsing rules.

## Current limitations

- Only PSI metadata + experimental tables are ingested; raw data files, PDFs and publications are not (no page numbers yet).
- Sensors and topics are keyword-based tags; materials/fuel class need domain-lead validation (PRD §4 step 6).
- Some tables list no oxygen/pressure/airflow (e.g. BASS, SLICE, E-FIELD) → shown as Not reported, so coverage is conservative.
- Range-valued rows (FLEX-2 test matrix, BRE per-day sets) match by range overlap.
- Ranking weights are hypotheses; e.g. droplet studies (FLEX) can rank high for lunar habitat because they document
  elevated O2 at reduced pressure. Review with the domain lead.
- Runtime AI-setting changes are in-memory; no auth / rate limiting (local demo only).
- The challenge Details text was captured from the team's paste, not a direct fetch.

## Brand, attribution and independence

We follow the [NASA Space Apps Brand Guidelines](https://www.spaceappschallenge.org/brand/) (PDF updated June 25, 2026);
the rules we apply and where, with page numbers, are in [`docs/BRAND.md`](docs/BRAND.md). In short:

- The event is the **NASA Space Apps Challenge** (short form **NASA Space Apps**); we write "2026 NASA Space Apps Challenge".
- This is an **independent participant project**. It is not affiliated with, sponsored by, or endorsed by NASA or the
  NASA Space Apps Challenge. NASA names are used only to describe our participation and to cite NASA data.
- We do **not** use the NASA insignia ("meatball"), the NASA logotype ("worm"), other NASA or partner-agency logos, or
  the Space Apps logo. The flame monogram is our own artwork.
- The web UI uses the Space Apps palette (Deep Blue, Electric Blue, Blue Yonder, Neon Yellow accents, Rocket Red only in
  artwork) and typefaces (Fira Sans, Overpass, Fira Code — SIL OFL, via Google Fonts), with ≥ 4.5:1 text contrast.
- Hashtag: **#SpaceApps**.
- Data: NASA Physical Sciences Informatics (PSI) public records and experimental tables, cited per value in the app.

## Repo layout

```
apps/api      FastAPI app (app/), tests/, requirements*.txt, Dockerfile
apps/web      Next.js app (app/, components/, lib/), tests/ (vitest)
data/sources  raw sources (PSI JSON/CSV, challenge text, official/ placeholder)
data/seed     versioned seed JSON
docs/         FOUNDATION_BRIEF.md, PRD.md, chatgpt-session.md
scripts/dev.sh, Makefile, docker-compose.yml, .env.example
```
