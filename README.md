# Flame in Freefall — microgravity combustion evidence explorer

2026 NASA Space Apps Challenge · [Flame in Freefall: SI-Powered Fire Safety Insights from Microgravity Combustion Data](https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/?tab=details)

A research-discovery dashboard over NASA **Physical Sciences Informatics (PSI)** combustion investigations that answers
**"has work already been done for these parameters?"** (fuel/material, oxygen, pressure, airflow, gravity regime, hardware,
measurement type), and lets researchers inspect, compare, rank by research relevance, and ask evidence-grounded questions.

> Decision support / discovery only — **not** a certified fire-risk calculator, materials qualification system, or
> spacecraft safety authority. PSI has **no partial-gravity combustion data yet**; microgravity results do not
> directly establish lunar or Martian performance.

## Scope rule (what the app may know)

The app answers only from the challenge **Resources** tab and the challenge **Details/brief** page, plus references those
resources name or link to (PSI records and their publications/DOIs, documents cited in the fact sheets or the Researcher's
Guide, pages linked from the incident and spinoff pages). The guidance video transcript is included and labelled as the
user-supplied challenge guide (YouTube auto-captions, cited by `[mm:ss]`). Outside facts are not used. For referenced papers only
public metadata, abstracts or open-access text are used (no paywall bypass); otherwise the app links out. When the corpus
cannot answer, the assistant abstains. Every indexed item carries a `provenance` field (`resource`, or `reference` with its
parent resource), enforced by `apps/api/tests/test_provenance.py`. Saved copies and SHA-256 checksums:
`data/sources/official/MANIFEST.md`.

Corpus: 24 PSI Combustion Science records (19 microgravity + 5 ground/modeling) and all their experimental tables; 8 NASA fact
sheets and the Researcher's Guide chunked per page; the brief; Apollo 1, Apollo 13 and Mir pages; 3 spinoff pages; NASA
Combustion Science page; guidance-video transcript.

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
**AI settings**; without an LLM the assistant still gives **computed direct answers** (structured QA) and a templated
interpretation, plus retrieved sources.

## Bring your own key (optional AI summary)

On **Settings** a user can paste a **Groq** key (recommended: free plan, key at https://console.groq.com/keys), a
**Gemini** key (free tier, key at https://aistudio.google.com/apikey), or an OpenAI or Anthropic key. Rules (decision D3):
- kept only in `sessionStorage` in that browser tab (cleared when the tab closes);
- sent over HTTPS in the `X-LLM-Key` header (plus `X-LLM-Provider`, optional `X-LLM-Model`) **only** with assistant
  requests (`POST /api/ask`); the API refuses the header on every other endpoint;
- used for that one request on a per-request provider object; never stored, logged or returned; log records and errors are
  redacted; provider base URLs are fixed server-side, so a key cannot be redirected to another host.
The templated, no-key answer is always the default. `PUT /api/settings/ai` and `POST /api/ingest/rebuild` need
`X-Admin-Token` = `ADMIN_TOKEN`; with no `ADMIN_TOKEN` they are disabled in production (`APP_ENV=production` or on Render).

### Groq (free) on the server

Set `AI_LLM_PROVIDER=groq` and `GROQ_API_KEY` (optional `GROQ_MODEL`). Groq is called through its OpenAI-compatible API at
`https://api.groq.com/openai/v1`. Only free-plan production chat models are allowed, for both the server and user keys
(source: [models](https://console.groq.com/docs/models), [rate limits](https://console.groq.com/docs/rate-limits), checked 2026-11-13):

| `GROQ_MODEL` | Free plan limits |
| --- | --- |
| `openai/gpt-oss-120b` (default) | 30 RPM · 1K requests/day · 8K tokens/min · 200K tokens/day |
| `openai/gpt-oss-20b` | 30 RPM · 1K requests/day · 8K tokens/min · 200K tokens/day |

Requests use `reasoning_effort=low`, `include_reasoning=false` and at most 700 output tokens. If Groq answers 429, the
assistant returns the computed, templated answer with a notice instead of failing. Because one server key is shared by
every visitor, AI summaries that use it are limited per IP (`ASK_RATE_PER_MIN=10`, `ASK_RATE_PER_DAY=200`) and site-wide
(`ASK_GLOBAL_PER_MIN=25`, `ASK_GLOBAL_PER_DAY=900`, under Groq's free 30 RPM / 1K RPD). Over the limit, the visitor still gets the
computed answer and sources, with a notice. Only real AI calls with the server key count (abstentions and computed-only
answers do not). Counters are in memory and reset on restart. `GET /api/ask/quota` returns the caller's and the site's
limits, remaining answers and reset times without using any quota; `POST /api/ask` returns the same `quota` object, and the
Ask page shows it as a live counter with a note that this prototype runs on the configured provider's free plan and that a visitor's own key
(Settings) is not limited by the site.

### Gemini (free tier) on the server

Set `AI_LLM_PROVIDER=gemini` and `GEMINI_API_KEY` (optional `GEMINI_MODEL`). Gemini is called through its
OpenAI-compatible API at `https://generativelanguage.googleapis.com/v1beta/openai/`
([docs](https://ai.google.dev/gemini-api/docs/openai)). Only free-tier text chat models are allowed, for both the server
and user keys (source: [pricing](https://ai.google.dev/gemini-api/docs/pricing), checked 2026-11-14).
`gemini-2.5-flash` is deprecated (API limited to existing users until 1 Dec 2026, then routed to `gemini-3.5-flash-lite`)
and is not allowlisted.

| `GEMINI_MODEL` | Free tier |
| --- | --- |
| `gemini-3.8-flash` (default) | Input and output free of charge on the Gemini API Free tier |
| `gemini-3.5-flash-lite` | Input and output free of charge on the Gemini API Free tier |

Requests use `reasoning_effort=low` and at most 700 output tokens. If Gemini answers 429, the assistant returns the
computed, templated answer with a notice instead of failing. Site rate limits above still apply when the shared server
key is used. A visitor's own Gemini key in Settings is not limited by the site. To set the server key on Render: open
the API service → Environment → add `GEMINI_API_KEY` (leave `GEMINI_MODEL` blank to use the default) → Save. Do not
commit the key. Groq remains the default provider unless you also set `AI_LLM_PROVIDER=gemini`.

## Docker

```bash
docker compose up --build                     # api :8000 + web :3000 (hash embeddings, no LLM needed)
docker compose --profile ollama up --build    # + Ollama :11434
docker compose exec ollama ollama pull llama3.2
LOCAL_AI=1 AI_EMBEDDING_PROVIDER=local docker compose up --build   # bake sentence-transformers into the api image
```

## Local (free) vs paid AI

Switch in `.env` (or at runtime on the **AI settings** page / `PUT /api/settings/ai` with the admin token). Server keys are env-only; users can bring their own key per tab (above):

| Purpose | Free / local | Paid |
| --- | --- | --- |
| LLM for `/api/ask` | `AI_LLM_PROVIDER=groq` + `GROQ_API_KEY` (free plan, recommended; see above), `gemini` + `GEMINI_API_KEY` (free tier; see above), or `local` → Ollama (`OLLAMA_MODEL=llama3.2`, `OLLAMA_BASE_URL`) | `openai` + `OPENAI_API_KEY` (`OPENAI_MODEL`) or `anthropic` + `ANTHROPIC_API_KEY` (`ANTHROPIC_MODEL`) |
| Embeddings | `AI_EMBEDDING_PROVIDER=local` → sentence-transformers `all-MiniLM-L6-v2`; or `hash` (offline fallback) | `AI_EMBEDDING_PROVIDER=openai` (`text-embedding-3-small`) |
| No AI at all | `AI_LLM_PROVIDER=none` | — |

Ollama: install from https://ollama.com, `ollama serve`, `ollama pull llama3.2`. After changing the embedding provider,
rebuild vectors (`make ingest` or the button in AI settings) — the API detects a mismatched index and falls back to lexical + SQL.

## What is in the app

| Screen | API |
| --- | --- |
| **Lunar (lead demo)** — rows meeting O2 ≥ 30 % and ≤ 10.2 psi on the same row, burner-stream toggle, closest misses, O2-vs-pressure chart, ranking agreement, partial-gravity gap | `POST /api/coverage`, `GET /api/lunar/points`, `GET /api/rank`, `GET /api/stats` |
| **Home** — lead lunar answer, catalog stats with as-of date, search, top research-relevant investigations | `GET /api/meta`, `GET /api/rank` |
| **Earth** — Documented vs Inferred links from spinoffs / Researcher's Guide / video to PSI investigations; explainer quotes | `GET /api/earth`, `GET /api/explainer` |
| **Explorer** — filters (family, fuel class, topic, measurement type, material, O2 %, pressure kPa/psi/atm/bar, airflow m/s/cm/s), sort, compare picks, CSV export | `GET /api/investigations`, `GET /api/export.csv` |
| **Investigation detail** — template interpretation, relationships (ground studies → flight data), lenses with quotes, hotlinked PSI images, varied vs constant variables, data-quality flags, conditions per row with source text, file tree, version | `GET /api/investigations/{id}` |
| **Has it been done?** — parameter coverage form: documented match / partial overlap / no documented overlap, per-parameter status (match, match in other runs, mismatch, unknown), matching rows | `POST /api/coverage` |
| **Compare** — 2–3 investigations side by side with labels and Not reported cells | `POST /api/compare` |
| **Relevance ranking** — PRD §9 weighted score with per-criterion citations and flags | `GET /api/rank?scenario=lunar_habitat` |
| **Ask the evidence** — direct computed answers (counts, ranges, maxima, row lookups, official quotes) with CSV-row / page / `[mm:ss]` citations, abstention, hybrid-RAG passages, optional AI summary | `POST /api/ask`, `POST /api/qa` |
| **Modeling export** — every countable row with SI units, verbatim cells, flags, source row; data dictionary | `GET /api/export/modeling.csv`, `GET /api/export/dictionary` |
| **AI settings** — provider status and switch, index status, rebuild | `GET/PUT /api/settings/ai`, `POST /api/ingest/rebuild` |

### Architecture

```
apps/web  (Next.js App Router, TypeScript)  ──HTTP──>  apps/api (FastAPI)
                                                     ├─ SQLite (SQLAlchemy): investigations, documents, chunks, test_runs, measurements
                                                     ├─ SQLite FTS5 (BM25)                 ← lexical
                                                     ├─ data/index (FAISS / NumPy)          ← vector
                                                     ├─ app/ai/providers: embeddings (local|openai|hash), llm (local|groq|gemini|openai|anthropic|none)
                                                     └─ services: catalog, coverage, ranking, compare, ask (hybrid RAG)
ingestion: data/sources (PSI JSON + CSV, official PDFs/HTML/transcript) → app.ingest.build_seed → data/seed/*.v2.json → app.ingest → DB + indexes
```

**Hybrid retrieval** (`app/retrieval/hybrid.py`): optional structured pre-filter by investigation → FTS5 BM25 + vector
search → reciprocal-rank fusion, small boost when an investigation acronym is named. **Ask** (`app/services/ask.py`):
abstains if evidence is weak (low term coverage *and* low similarity) or the question asks for a quantity with no
structured measurements (e.g. flame spread rate); sanitises instruction-like text in sources; wraps sources as
untrusted data; validates `[S#]` citations and strips invented ones; adds partial-gravity / "not a certification" notes.

**Numeric semantics**: conditions live on PSI table rows (`test_runs`) with `min/max` (single values have min = max),
verbatim source text, context and flags. A filter matches only known values whose range overlaps the request; all
numeric constraints must hold on the **same** row. Unknown never matches.

**Structured QA** (`app/qa`): pattern routing to computed intents; numbers come from stored rows at answer time; quotes
are located in the indexed corpus (fails loudly if absent). Golden set: `apps/api/tests/fixtures/golden_questions.json`
(`tests/test_golden.py`; live check `python scripts/verify_golden.py --api https://…`).

**Data quality**: suspicious cells are shown verbatim with a flag (spreadsheet auto-fill, '3400%' percent artifacts,
0 mmHg pressure, possible dimension swaps, duplicate ids/rows, garbled headers, cp1252 decoding). Nothing is silently corrected.

**Ranking** (`app/services/ranking.py`, version `sfsri-v0.3`): `score = 100 × Σ weight × match`, weights 25/25/20/15/15
(material, oxygen/atmosphere, prevention/flame behavior, detection/suppression, habitat applicability). Lunar habitat /
rover targets (O2 ≥ 30 %, ≤ 10.2 psi) come from the official brief; Mars and spacecraft targets are *Not established*.
The oxygen/atmosphere criterion uses the same same-row match as the coverage check (rows must meet both targets on one row;
burner oxidizer-stream O2 counts but is labelled), and investigations with rows meeting the target are listed first. Weights and match values are product hypotheses for the domain lead to review.

### Evidence labels
`Reported by authors (PSI record)` · `Reported by authors (PSI experimental table)` · `Measured (as listed in PSI experimental table)` ·
`Official challenge brief` · `Curator classification (rule-based keyword match)` · `AI interpretation` · `Not established` · `Not reported`.

## Catalog (24 PSI Combustion Science investigations)

Microgravity: BASS (PSI-26), BASS-II (PSI-25), SAFFIRE-I/II/III (PSI-98/99/100), SAME (PSI-102), SAME-R (PSI-101),
DAFT/DAFT-2 (PSI-47), FLEX (PSI-69), FLEX-2 (PSI-68), CFI (PSI-39), ACME CFI-G (PSI-159), ACME Flame Design (PSI-10),
ACME BRE (PSI-20), ACME CLD Flame (PSI-21), ACME E-FIELD Flames (PSI-22), ACME s-Flame (PSI-23), SPICE (PSI-107), SLICE (PSI-106).
Ground / modeling, linked to the flight data they reuse: PSI-60, PSI-62, PSI-115, PSI-117, PSI-142.
Counts (test rows, sessions, test-matrix rows) are computed from the CSVs; notes, pre-test rows and continuation rows are kept but
not counted. LUCI and FM2 appear only as the partial-gravity gap named in the brief.

## Current limitations

- Raw data archives and videos are not ingested (file lists are metadata only).
- Structured QA routes by patterns plus a generic one-investigation resolver; unusual phrasings fall back to retrieval.
- Sensors, topics and lenses are rule-based tags with quoted evidence; materials/fuel classes need domain-lead validation.
- Some tables list no oxygen/pressure/airflow (e.g. BASS, SLICE, E-FIELD) → Not reported, so coverage is conservative.
- Range-valued rows (FLEX-2 test matrix, per-day session sets) match by range overlap and are labelled.
- Ranking weights are hypotheses for the domain lead.

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

