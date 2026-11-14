# Architecture (summary)

The current, code-checked description of how the app works is **[DESIGN.md](../DESIGN.md)**. This page is a one-screen
summary of it. The 10 November 2026 first draft that used to live here (Chroma, `data/app.db`, an earlier API contract)
no longer matches the code. It is kept in git history (`git show 01625bd:docs/ARCHITECTURE.md`) for the decisions it
records, and should not be used as a reference.

## Shape

```text
Browser ──> Next.js App Router (apps/web, Vercel Hobby)
              └─HTTPS JSON──> FastAPI (apps/api, Render Free, Docker, one uvicorn process)
                                ├─ SQLite: investigations, documents, chunks, test_runs, measurements
                                ├─ SQLite FTS5 (BM25) over chunks              ← lexical search
                                ├─ data/index: FAISS or NumPy vectors          ← hash embeddings on Render
                                ├─ in-process catalog snapshot + memoised rankings, cards, /api/meta
                                ├─ in-process AI answer cache (server key only, LRU 256, 6 h)
                                └─ Groq openai/gpt-oss-120b (server key with site quota, or a visitor's own key)
```

## Main pieces

| Piece | Where | What it does |
| --- | --- | --- |
| Seed builder | `app/ingest/build_seed.py` | `data/sources` (PSI JSON + CSV, brief) → versioned `data/seed/*.v2.json` |
| Loader | `app/ingest/load.py` | Seed + official documents + transcript → SQLite, FTS5, vectors. Runs at Docker image build; boot re-runs it only if needed |
| Catalog search | `app/services/catalog.py` | Accession / DOI exact lookups, FTS5 keyword search, same-row numeric filters |
| Ranking | `app/services/ranking.py` | Deterministic `sfsri-v0.3` research-relevance score, tiered by same-row atmosphere target |
| Coverage, compare | `app/services/coverage.py`, `compare.py` | "Has it been done?" and side-by-side comparison, no LLM |
| Ask | `app/services/ask.py`, `app/qa/`, `app/retrieval/` | DOI lookup, structured QA, hybrid retrieval, grounded LLM answer with checked `[S#]` citations, abstention |
| Overview | `GET /api/investigations/{id}/overview` | The ask pipeline scoped to one investigation (plus dataset and publication context) |
| Security | `app/security.py`, `app/ratelimit.py` | BYOK rules (key only on the two AI endpoints), admin lock, log redaction, per-IP and site AI quotas |

Ranking, coverage, compare and catalog search never call an LLM. Every AI answer is limited to retrieved sources,
cites them, and falls back to the computed answer when the AI is unavailable.

See [DESIGN.md](../DESIGN.md) for request flows, the AI layer, citations, deployment, performance, tests and known
limitations.
