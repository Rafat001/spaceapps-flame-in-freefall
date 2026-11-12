# Flame in Freefall - QA Test Plan (v1)

**Owner:** QA (Mohammed Islam)
**Written:** Tuesday 10 Nov 2026, ~15:30 EST (America/New_York)
**Product:** "Flame in Freefall" — PSI fire-safety research explorer (2026 NASA Space Apps Challenge; independent participant project)
**Requirement sources:** `docs/PRD.md` (FR-01..FR-10, sections 6, 9, 11, 13, 14), `docs/FOUNDATION_BRIEF.md`, `docs/ARCHITECTURE.md` (API contract, enums, coverage formula)
**Status file:** [`QA_STATUS.md`](QA_STATUS.md)

> **Execution status:** 0 API/UI cases executed. The HTTP API and web app are not runnable yet
> (`apps/api/app/routers/` and `services/` are empty stubs, there is no `apps/web`, no README).
> Every API/UI case below has **Actual = Not run**. Items marked **seed/code review** are static
> observations of files in the repo; they are *not* executed tests and are *not* passes.

---

## 1. How to use this plan

- Every case has a unique ID, a priority, preconditions, numbered steps, an expected result,
  an actual result, and a severity to assign if it fails.
- IDs: `TC-<AREA>-<NN>`. Areas: FND (foundation/runnability), CAT (catalog/search), COV (coverage),
  FLT (filters), CMP (compare), RNK (ranking), RAG (assistant), PRV (provider switch),
  SAF (scientific safety and provenance), INS (insights), EXP (export), UT (repo automated tests),
  A11Y (accessibility), E2E (demo flow), SEC (security hygiene).
- Write `Actual` as what you observed, with the request/response or screenshot path. Never write
  "Pass" without evidence. If the case cannot be run, keep `Not run` and the reason.
- API examples use the contract in `docs/ARCHITECTURE.md` section "API". If the implementation
  chooses different paths or parameter names, update the case, do not silently skip it.
- Base URLs (assumed until the README says otherwise): API `http://localhost:8000`, web `http://localhost:3000`.

### 1.1 Priority

| Priority | Meaning |
|---|---|
| P0 | Must pass before demo sign-off. Scientific integrity, runnability, hard PRD rules. |
| P1 | Should pass for the demo; a failure needs a named workaround and owner. |
| P2 | Nice to have / polish (accessibility depth, export formats, performance targets). |

### 1.2 Severity (assign when a case fails)

| Severity | Definition |
|---|---|
| Blocker | Demo cannot proceed, or the product states something scientifically false or unsafe. |
| Critical | A core flow (catalog, filter, compare, rank, ask) is broken or misleading with no workaround. |
| Major | Wrong or missing information that a careful user could notice and work around. |
| Minor | Cosmetic, wording, layout, or non-blocking polish. |

**Automatic Blocker regardless of the case's listed severity:**
1. Any fabricated experimental value, unit, citation, paper, page number, or URL.
2. Any safety overclaim: stating or implying a material is "safe", "qualified", or "certified",
   or that microgravity results establish Moon or Mars (partial-gravity) performance.
3. Any unknown / null / `not_reported` numeric value passing a numeric range filter or coverage match.
4. Any real or real-looking secret committed to the repository or shipped in the web bundle.
5. Ranking presented as a hazard, flammability, or safety score.

---

## 2. Environment and preconditions

| Item | Expected (to be confirmed by README once it exists) |
|---|---|
| Repo | `/workspace/spaceapps-flame-in-freefall` (not yet a git repo at time of writing) |
| API | FastAPI under `apps/api`, Python venv `apps/api/.venv`, SQLite `data/db/flame.sqlite` |
| Web | `apps/web` (Next.js per ARCHITECTURE) - **not present** |
| Seed | `data/seed/investigations.v1.json` (16 investigations, 1,624 test runs), `data/seed/challenge_brief_chunks.v1.json` |
| Index | `data/index/` (FAISS, 175 chunks, `local:sentence-transformers/all-MiniLM-L6-v2:384` per `meta.json`) |
| AI | `AI_LLM_PROVIDER` = local / openai / anthropic (config also allows `none`); `AI_EMBEDDING_PROVIDER` = local / openai (config also allows `hash`) |
| Network | Cases tagged "offline" must be run with no outbound network and no cloud key set. |

Global precondition **GP-1** for every API/UI case: README start steps succeed and `GET /api/health/providers` responds.
Global precondition **GP-2** for every case using fixtures: DB loaded from `investigations.v1.json` (seed_version `v1`).

---

## 3. Fixture register (from `data/seed/investigations.v1.json`)

Numeric conditions live on **test runs**, as objects:
`{min, max, source_text, approximate, kind: point|range|set|unknown, flags, context, verification_status}`.
Fields: `oxygen_pct`, `pressure_kpa`, `airflow_m_s`. A null field or `verification_status=not_reported` means unknown.
Counts below were computed from the seed file on 10 Nov 2026 (seed/code review). "rep" = runs with a non-null min.

| ID | Acronym | Family | fuel_class | gravity_regime | mimic | Runs | O2 rep / not_rep | Pressure rep / not_rep | Airflow rep / not_rep |
|---|---|---|---|---|---|---|---|---|---|
| psi-26 | BASS | BASS | solid | microgravity | False | 122 | 0 / 0 (all null) | 0 / 0 | 0 / 0 |
| psi-25 | BASS-II | BASS | solid | microgravity | False | 129 | 129 / 0 (point) | 0 / 0 | 0 / 0 |
| psi-98 | SAFFIRE-I | Saffire | solid | microgravity | False | 4 | 2 / 2 (point, range) | 0 / 0 | 2 / 2 |
| psi-99 | SAFFIRE-II | Saffire | solid | microgravity | False | 15 | 9 / 6 | 0 / 0 | 9 / 6 |
| psi-100 | SAFFIRE-III | Saffire | solid | microgravity | False | 2 | 0 / 0 | 0 / 0 | 2 / 0 |
| psi-102 | SAME | SAME | solid | microgravity | False | 8 | 0 / 0 | 0 / 0 | 4 / 4 |
| psi-101 | SAME-R | SAME | solid | microgravity | False | 109 | 0 / 0 | 0 / 0 | 109 / 0 |
| psi-47 | DAFT / DAFT-2 | DAFT | aerosol | microgravity | False | 2 | 0 / 0 | 0 / 0 | 0 / 0 |
| psi-69 | FLEX | Droplet (MDCA) | liquid | microgravity | False | 274 | 274 / 0 | 273 / 1 | 0 / 0 |
| psi-68 | FLEX-2 | Droplet (MDCA) | liquid | microgravity | False | 8 | 8 / 0 (set) | 8 / 0 (set) | 8 / 0 (range) |
| psi-39 | CFI | Droplet (MDCA) | liquid | microgravity | False | 87 | 87 / 0 | 87 / 0 | 0 / 0 |
| psi-159 | ACME CFI-G | ACME | gaseous | microgravity | False | 333 | 333 / 0 | 333 / 0 | 0 / 0 |
| psi-20 | ACME BRE | ACME | gaseous | microgravity | False | 18 | 16 / 2 (set) | 0 / 0 | 0 / 0 |
| psi-22 | ACME E-FIELD Flames | ACME | gaseous | microgravity | **True** | 32 | 0 / 0 | 0 / 0 | 0 / 0 |
| psi-107 | SPICE | MSG flow duct | gaseous | microgravity | False | 469 | 0 / 0 | 0 / 0 | 436 / 33 |
| psi-106 | SLICE | MSG flow duct | gaseous | microgravity | False | 12 | 0 / 0 | 0 / 0 | 0 / 0 |

### 3.1 Named fixture values (copied from the seed; do not edit)

| Fixture | Investigation / run | Field | Seed value | source_text | context | verification_status | source_file |
|---|---|---|---|---|---|---|---|
| FX-O2-BASSII-B1 | psi-25 run `B1` | oxygen_pct | min=max=22.2, kind=point | `22.2` | ambient (calibrated initial, % by volume) | psi_experimental_table | PSI-25_Experimental table_BASS-II.csv (row 2) |
| FX-O2-BASS-NULL | psi-26 (all 122 runs) | oxygen_pct / pressure_kpa / airflow_m_s | null | - | - | - | PSI-26_Experimental table_BASS.csv |
| FX-O2-SAF1-S1 | psi-98 run `S1` | oxygen_pct | min=21.5, max=21.7, kind=range | `21.5 - 21.7` | ambient (%) | psi_experimental_table | PSI-98_Experimental table_SAFFIRE-1.csv |
| FX-O2-SAF1-S2 | psi-98 run `S2` | oxygen_pct | min=max=21.5, approximate=true | `~ 21.5` | ambient (%) | psi_experimental_table | PSI-98_Experimental table_SAFFIRE-1.csv |
| FX-O2-SAF1-NR | psi-98 run `F1C1/F1C2` | oxygen_pct | min=max=null, kind=unknown | (empty) | ambient (%) | not_reported | PSI-98_Experimental table_SAFFIRE-1.csv |
| FX-AIR-SAF1-S1 | psi-98 run `S1` | airflow_m_s | min=max=0.2 | `20` (cm/s) | forced air flow | psi_experimental_table | PSI-98_Experimental table_SAFFIRE-1.csv |
| FX-O2-SAF2-NR | psi-99 run `F1C1/F1C2` | oxygen_pct | null, kind=unknown | (empty) | ambient (%; see source Note 1) | not_reported | PSI-99_Experimental table_SAFFIRE-2.csv |
| FX-P-FLEX-1 | psi-69 run `1 / 20CAL08` | pressure_kpa | min=max=101.01838248000001 | `757.7` (mmHg) | ambient | psi_experimental_table | PSI-69_Experimental table_FLEX.csv |
| FX-O2-FLEX-1 | psi-69 run `1 / 20CAL08` | oxygen_pct | min=max=21.0 | `0.21` (mole fraction) | ambient (initial, mole fraction) | psi_experimental_table | PSI-69_Experimental table_FLEX.csv |
| FX-O2-CFIG-A1 | psi-159 run `21088A1` | oxygen_pct | min=max=39.39 | `0.3939` | ambient (normal flame, before test) | psi_experimental_table | PSI-159_Experimental table_CFI-G_Normal Flames.csv |
| FX-P-CFIG-A1 | psi-159 run `21088A1` | pressure_kpa | min=max=94.43956, approximate=true | `0.9443956` (column "approx p (bar)") | ambient | psi_experimental_table | PSI-159_Experimental table_CFI-G_Normal Flames.csv |
| FX-O2-BRE-SET1 | psi-20 run `2019 / Feb / 8` | oxygen_pct | min=21.0, max=40.0, kind=set | `21; 26.5; 40` | ambient (approximate values for ignited tests; per-day set) | psi_experimental_table | PSI-20_Experimental table_ACME BRE.csv |
| FX-O2-BRE-SET2 | psi-20 run `2019 / Feb / 20` | oxygen_pct | min=26.5, max=34.0, kind=set | `26.5; 34` | same as above | psi_experimental_table | PSI-20_Experimental table_ACME BRE.csv |
| FX-O2-BRE-3400 | psi-20 run `2019 / March / 7` | oxygen_pct | min=max=null, kind=unknown, flags=[suspicious_percent_format] | `3400%` | same as above | not_reported | PSI-20_Experimental table_ACME BRE.csv |
| FX-EFIELD | psi-22 | gravity_regime / partial_gravity_mimic | microgravity / True; all numeric conditions null | - | - | - | PSI-22 JSON + table |
| FX-PG-GAP | seed `partial_gravity_gap` | text | "no partial-gravity combustion data available in PSI"; LUCI and FM2 expected | - | - | challenge_brief | citation: official challenge page (`?tab=details`) |
| FX-LUNAR | `apps/api/app/scenarios.py` lunar_habitat | atmosphere | O2 >= 30 %, pressure <= 10.2 psi (about 70 kPa) | brief sentence | - | challenge_brief | citation: official challenge page |

**Rule for testers:** when a case needs a number, take it from this table (or re-read it from the seed).
Do not type new experimental values into fixtures.

---

## 4. Seed / code-review findings (static, NOT executed tests)

All items below come from reading files in the repo on 10 Nov 2026. None of them is a test pass.
Each has a regression case later in the plan.

| ID | Severity | Finding | Evidence (file) | Follow-up / regression case |
|---|---|---|---|---|
| QA-F-001 | **Blocker** (for end-to-end sign-off) | No runnable web/API surface. `apps/api/app/routers/__init__.py` and `services/__init__.py` are empty (0 bytes); `apps/api/tests/` is empty; no `apps/web`; no README; `scripts/` empty; no `.env.example`, `.gitignore`, docker-compose, or Makefile; repo is not a git repo. Catalog, filter, compare, rank, and ask cannot be executed. | directory listing | TC-FND-01..12 |
| QA-F-002 | Info (positive, needs UI confirmation) | Seed has 16 investigations, 1,624 test runs, covering BASS, BASS-II, SAFFIRE-I/II/III, SAME, SAME-R, DAFT/DAFT-2 (one record), FLEX, FLEX-2, CFI, ACME CFI-G, ACME BRE, ACME E-FIELD Flames, SPICE, SLICE. Meets the brief's 12-16 target. `data/db/flame.sqlite` already holds 16 investigations, 1,624 test_runs, 264 documents, 800 measurements, 175 chunks. | seed JSON, sqlite counts | TC-FND-06, TC-CAT-01 |
| QA-F-003 | Major (until UI exists) | `partial_gravity_gap` (LUCI, FM2 expected; status challenge_brief; cites the official challenge page) is in the seed and `labels.PARTIAL_GRAVITY_WARNING` exists, but there is no UI to show it yet. | seed JSON, `app/labels.py` | TC-FND-07, TC-RNK-08, TC-SAF-05 |
| QA-F-004 | Needs confirmation (Info) | psi-26 BASS: all 122 runs have null oxygen, pressure, and airflow. The header row of `PSI-26_Experimental table_BASS.csv` contains only `Date, GMT, As Run Test #, Test #, Sample #, Fuel Sample Material`, so this looks like a true source gap, not a missed extraction. Domain lead should still confirm against the PSI record/documents. UI must show "Not reported" for these fields. | seed JSON, CSV header | TC-FLT-03, TC-CMP-03 |
| QA-F-005 | Minor (watch) | FLEX pressure stored with float noise: run `1 / 20CAL08` = 101.01838248000001 kPa from source_text 757.7 mmHg. Risk of fake precision in UI/export. Expect display rounding plus source value + unit shown. | seed JSON | TC-SAF-09, TC-CMP-06, TC-EXP-04 |
| QA-F-006 | Info (positive, regression needed) | ACME BRE run `2019 / March / 7` raw oxygen `3400%` is stored as kind=unknown, verification_status=not_reported, flag `suspicious_percent_format`. Correct handling; must never pass an O2 filter or display as a measured 3400 %. | seed JSON | TC-FLT-10, TC-SAF-10 |
| QA-F-007 | Major (until UI exists) | ACME E-FIELD Flames: gravity_regime=microgravity, partial_gravity_mimic=True. The product must not count it as partial-gravity data. | seed JSON | TC-RNK-09, TC-COV-07, TC-SAF-06 |
| QA-F-008 | Minor (test-method note) | `data/sources/psi_physci_repo.html` is an empty JS application shell (`<base href="/physci/repo/">`, no record content). PSI web URLs may return HTTP 200 for any path, so link checks must verify page content (title/accession), not only status codes. | file content | TC-SAF-12 |
| QA-F-009 | Info | ACME is a multi-experiment project. Seed has three ACME records (CFI-G, BRE, E-FIELD Flames). Raw source files also exist for PSI-10 (`Flame Design`), PSI-21 (`CLD Flame`), PSI-23 (`ACME s-Flame`) but these are not in the seed. Do not invent ACME experiment names beyond those in source files; decide whether to add or explicitly exclude them. | `data/sources/psi/` listing | Gap G-1 |
| QA-F-010 | **Major** | `verification_status` vocabulary mismatch. ARCHITECTURE enum is `measured, reported_by_authors, challenge_brief, ai_interpretation, not_established, not_reported` and says only `measured`, `reported_by_authors`, `challenge_brief` take part in numeric filters. The seed uses `psi_experimental_table`; `app/labels.py` adds `psi_metadata`, `measured_psi_table`, `rule_tag`. If the filter code follows ARCHITECTURE literally, **every seed value would be excluded** (or, if it uses a deny-list, unknown statuses might pass). Needs one agreed mapping. | ARCHITECTURE.md, seed JSON, labels.py | TC-FLT-14, Gap G-7 |
| QA-F-011 | Minor (doc drift) | ARCHITECTURE says vector index is Chroma at `data/index/chroma/`; repo has FAISS files (`chunks.faiss`, `chunks.npy`, `meta.json` backend=faiss, 175 chunks). | ARCHITECTURE.md, data/index | TC-PRV-07 |
| QA-F-012 | Info | CFI-G pressure source column is `approx p (bar)`; 0.9443956 bar -> 94.43956 kPa is consistent with bar, and `approximate=true` is set. Oxygen source `XO2 before test` is a mole fraction (0.3939 -> 39.39 %). Mixed basis (% by volume vs mole fraction) appears in context strings across investigations. | CSV header, seed | TC-SAF-08, Gap G-6 |
| QA-F-013 | Info | Lunar scenario target in `app/scenarios.py` uses challenge-brief text (O2 >= 30 %, <= 10.2 psi, about 70 kPa) with verification_status challenge_brief and the challenge URL. Good provenance; must be displayed as brief expectation, not as a measurement. | scenarios.py | TC-SAF-04 |
| QA-F-014 | Info | `data/sources/official_resources/` is empty. Official resources are expected on 13 Nov 2026; re-test list in section 20. | directory listing | Section 20 |

---

## 5. Foundation and runnability (FND) and security hygiene (SEC)

#### TC-FND-01 - README gives working start instructions
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** Fresh clone/copy of repo; Python 3.11+ and Node LTS installed.
- **Steps:**
  1. Open README.md at repo root.
  2. Follow only the README steps to install API and web dependencies.
  3. Note any step that needs knowledge not in the README.
- **Expected:** README exists and lists prerequisites, install, seed/index load, API start, web start, test command, and AI provider options. No undocumented step needed.
- **Actual:** Seed/code review (not an executed test): no README.md exists at repo root on 10 Nov 2026. Precondition not met; case not executed.

#### TC-FND-02 - API starts from README
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** TC-FND-01 steps done.
- **Steps:**
  1. Run the README API start command.
  2. Request `GET /api/health/providers`.
  3. Request `GET /api/investigations`.
- **Expected:** API listens (default :8000); health returns JSON with llm, embedding, lexical, vector keys; investigations returns 200 with items.
- **Actual:** Seed/code review (not an executed test): `apps/api/app/routers/` contains only an empty `__init__.py`; no app entry point with routes was found. Not executed.

#### TC-FND-03 - Web app starts from README
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** TC-FND-02 passing.
- **Steps:**
  1. Run the README web start command.
  2. Open the web base URL.
  3. Navigate Home, Explore, Investigation detail, Compare, Ask, Insights, Settings.
- **Expected:** All screens render without console errors; data comes from the running API (not hard-coded).
- **Actual:** Seed/code review (not an executed test): no `apps/web` directory exists. Not executed.

#### TC-FND-04 - One-command dev start
- **Priority:** P1 | **Severity if it fails:** Major
- **Preconditions:** Docker or Make available.
- **Steps:**
  1. Run `make dev` or `scripts/dev.sh` or `docker compose up` (whichever README documents).
  2. Wait for both services.
  3. Open web URL.
- **Expected:** Both API and web come up with one command; ports documented; Ctrl-C stops both cleanly.
- **Actual:** Seed/code review (not an executed test): no Makefile, docker-compose file, or scripts/dev.sh (`scripts/` is empty). Not executed.

#### TC-FND-05 - Seed/DB load is idempotent
- **Priority:** P1 | **Severity if it fails:** Major
- **Preconditions:** API installed.
- **Steps:**
  1. Run the documented ingest/seed command twice.
  2. Query counts of investigations, test_runs, chunks.
  3. Compare with seed counts.
- **Expected:** Second run adds no duplicates: 16 investigations, 1,624 test runs, chunk count unchanged; duplicates reported as skipped.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-FND-06 - Seed has 12-16 investigation records across named families
- **Priority:** P0 | **Severity if it fails:** Critical
- **Preconditions:** GP-1, GP-2.
- **Steps:**
  1. `GET /api/investigations?page_size=100`.
  2. Count items and distinct families.
  3. Compare to fixture register section 3.
- **Expected:** total = 16; every row of the fixture register is present with matching acronym, family, fuel_class, gravity_regime.
- **Actual:** Seed/code review (not an executed test): seed JSON and `data/db/flame.sqlite` both contain 16 investigations (1,624 test runs). API/UI count not executed.

#### TC-FND-07 - LUCI/FM2 partial-gravity gap visible in the UI
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** Web running.
- **Steps:**
  1. Open Home and select scenario Lunar habitat.
  2. Open Explore with that scenario.
  3. Open Insights/Rank for lunar_habitat.
- **Expected:** A banner states PSI has no partial-gravity combustion data yet, names LUCI and FM2 as expected future data, is labeled as from the official challenge brief, and links the challenge page. LUCI/FM2 are not shown as catalog records with data.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-FND-08 - `.env.example` documents all settings without real values
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** Repo root.
- **Steps:**
  1. Open `.env.example`.
  2. Check it lists AI_LLM_PROVIDER, AI_EMBEDDING_PROVIDER, OLLAMA_BASE_URL, OLLAMA_MODEL, model names, cloud key variable names, DB/index paths, PUBLIC_MODE.
  3. Check every key variable value is empty or an obvious placeholder word.
- **Expected:** File exists; all variables used by `app/config.py` are listed; key variables are blank; comments explain local vs cloud.
- **Actual:** Seed/code review (not an executed test): no `.env.example` present. Not executed.

#### TC-FND-09 - `.gitignore` excludes secrets and generated data
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** Repo initialised with git.
- **Steps:**
  1. Open `.gitignore`.
  2. Create a dummy `.env` file whose value looks like a real cloud key (made-up characters).
  3. Run `git status --ignored` and `git check-ignore -v .env`.
- **Expected:** `.env`, `.venv/`, `__pycache__/`, `node_modules/`, `.next/`, sqlite DB and vector index dirs (unless deliberately committed) are ignored; `.env` never appears as untracked/staged.
- **Actual:** Seed/code review (not an executed test): no `.gitignore` and the directory is not a git repo. Not executed.

#### TC-FND-10 - No secrets in repo or web bundle
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** git repo exists; web built.
- **Steps:**
  1. Run a secret scanner (for example gitleaks or trufflehog) over the working tree and history.
  2. Search the built web bundle for cloud key variable names and long random-looking strings.
  3. Review `apps/api/app/config.py` defaults.
- **Expected:** Scanner reports zero findings; keys are read only from environment on the server; nothing key-like reaches the browser; `PUT /api/settings/ai` never accepts a key over HTTP.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-FND-11 - Requirements install cleanly
- **Priority:** P1 | **Severity if it fails:** Major
- **Preconditions:** Clean venv.
- **Steps:**
  1. `pip install -r apps/api/requirements.txt`.
  2. Separately `pip install -r apps/api/requirements-local-ai.txt`.
  3. Run `python -c 'import app'` from apps/api.
- **Expected:** Core install does not pull heavy local-AI packages; optional file documented; imports succeed.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-FND-12 - Limitations / not-a-calculator statement present
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** Web running.
- **Steps:**
  1. Check footer on every screen.
  2. Check Ask, Rank, Coverage screens.
- **Expected:** Text equivalent to `labels.NOT_CERTIFICATION` is visible: research discovery prototype, not a certified fire-risk calculator, materials qualification system, or safety authority.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-SEC-01 - Input limits on Ask
- **Priority:** P1 | **Severity if it fails:** Major
- **Preconditions:** API running.
- **Steps:**
  1. POST `/api/ask` with a 2,001-character question.
  2. POST with an empty question.
  3. POST with non-JSON body.
- **Expected:** Over-limit returns 4xx with clear message (contract says <= 2000 chars); empty returns 4xx; malformed returns 4xx; no stack trace leaked.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-SEC-02 - Ingest endpoint disabled in public mode
- **Priority:** P1 | **Severity if it fails:** Critical
- **Preconditions:** PUBLIC_MODE=true.
- **Steps:**
  1. POST `/api/ingest` with `{source:'url', path_or_url:'https://example.com'}`.
  2. POST with a local file path outside data/.
- **Expected:** Both refused (403/404) in public mode; in dev mode, paths outside `data/` refused; no file contents returned.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-SEC-03 - Settings endpoint never handles keys
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** API running.
- **Steps:**
  1. PUT `/api/settings/ai` with an extra field named like a key variable containing a made-up value.
  2. GET `/api/settings/ai`.
- **Expected:** Extra field rejected or ignored; GET never echoes any key value (at most a boolean such as `configured: true`).
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-SEC-04 - Rate limiting when public
- **Priority:** P2 | **Severity if it fails:** Minor
- **Preconditions:** PUBLIC_MODE=true.
- **Steps:**
  1. Send 60 `/api/ask` requests in one minute from one client.
- **Expected:** Requests beyond the documented limit get 429 with retry hint. (Limit value not yet specified - see Gap G-9.)
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

---

## 6. Catalog and search (CAT) - FR-01, FR-02, FR-04

#### TC-CAT-01 - Catalog lists required fields (FR-01)
- **Priority:** P0 | **Severity if it fails:** Critical
- **Preconditions:** GP-1, GP-2.
- **Steps:**
  1. `GET /api/investigations?page_size=100`.
  2. For each item check name/acronym, objective, fuel_class, relevance tags, source link.
  3. Open Explore in the web app.
- **Expected:** All 16 items show name, objective, fuel class, tags, and a PSI source link; missing fields say Not reported, never blank or invented.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-CAT-02 - Exact name search
- **Priority:** P0 | **Severity if it fails:** Critical
- **Preconditions:** GP-1.
- **Steps:**
  1. Search `BASS-II`.
  2. Search `SAFFIRE-I`.
  3. Search `E-FIELD`.
- **Expected:** The exact record is the first result each time; BASS-II search does not hide BASS (psi-26) if it is also relevant, but psi-25 ranks first.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-CAT-03 - Natural-language search with matched evidence (FR-02)
- **Priority:** P0 | **Severity if it fails:** Critical
- **Preconditions:** GP-1.
- **Steps:**
  1. Search `solid material flammability in elevated oxygen` (PRD Flow A).
  2. Inspect each result's matched-evidence snippet.
- **Expected:** At least one curated solid-fuel result (BASS / BASS-II / Saffire / SAME family) is returned; each result shows the text that matched and its source; no snippet is AI-generated without an AI label.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-CAT-04 - Search with no match
- **Priority:** P1 | **Severity if it fails:** Major
- **Preconditions:** GP-1.
- **Steps:**
  1. Search `rocket propellant grain burn rate`.
  2. Search a nonsense string `zzqqxx`.
- **Expected:** Empty state that says no records matched in this catalog (not that no such research exists); suggests filters/sources; no fabricated hit. Rocket/propellant is flagged as out of scope (see TC-SAF-13).
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-CAT-05 - Case and punctuation tolerance
- **Priority:** P2 | **Severity if it fails:** Minor
- **Preconditions:** GP-1.
- **Steps:**
  1. Search `saffire ii`, `Saffire-II`, `SAFFIRE II`.
  2. Search `daft-2`.
- **Expected:** All Saffire variants find psi-99; `daft-2` finds psi-47 (record titled `DAFT / DAFT-2`).
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-CAT-06 - Investigation detail page (FR-04)
- **Priority:** P0 | **Severity if it fails:** Critical
- **Preconditions:** GP-1.
- **Steps:**
  1. `GET /api/investigations/psi-25`.
  2. Open the detail page for BASS-II.
  3. Inspect run `B1`.
- **Expected:** Shows objective, setup, test variables, sensors/measurement types, findings, data availability, citations, caveats, `missing_fields`; run B1 oxygen 22.2 % with context `calibrated initial, % by volume` and source file + row; pressure and airflow show Not reported.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-CAT-07 - Conditions shown per test run, not per investigation
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** GP-1.
- **Steps:**
  1. Open detail for psi-69 FLEX.
  2. Look for any investigation-level oxygen/pressure value.
- **Expected:** Conditions appear in a per-run table (274 runs, paginated/virtualised) or as an explicit range summary labeled as spanning runs, never as one investigation-wide value.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-CAT-08 - Sort options
- **Priority:** P1 | **Severity if it fails:** Minor
- **Preconditions:** GP-1.
- **Steps:**
  1. Sort Explore by relevance, title, completeness.
  2. Repeat each sort twice.
- **Expected:** Each sort is deterministic across repeats; completeness puts all-null records (psi-26, psi-47, psi-22, psi-106) at the bottom and says why.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-CAT-09 - Pagination and totals
- **Priority:** P1 | **Severity if it fails:** Minor
- **Preconditions:** GP-1.
- **Steps:**
  1. `GET /api/investigations?page=1&page_size=5`, then pages 2-4.
- **Expected:** total=16 on every page, no duplicates or missing items across pages, page 4 has 1 item.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-CAT-10 - Source links resolve to the right record
- **Priority:** P0 | **Severity if it fails:** Critical
- **Preconditions:** Network on.
- **Steps:**
  1. For each investigation open source_url.
  2. Confirm the loaded page shows the matching accession/title (not only HTTP 200).
- **Expected:** Every link shows the matching PSI record content. See QA-F-008: the PSI site can return a generic shell for any path.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-CAT-11 - Catalog performance
- **Priority:** P2 | **Severity if it fails:** Minor
- **Preconditions:** Demo hardware, warm cache.
- **Steps:**
  1. Time 10 `GET /api/investigations` calls with and without filters.
- **Expected:** p95 under 2 s (PRD section 11).
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

---

## 7. Parameter coverage (COV) - `POST /api/coverage`

#### TC-COV-01 - Coverage endpoint exists and follows contract
- **Priority:** P0 | **Severity if it fails:** Critical
- **Preconditions:** GP-1.
- **Steps:**
  1. POST `/api/coverage` with `{fuel_class:'solid', oxygen_pct_min:21, oxygen_pct_max:23}`.
- **Expected:** 200 with `matches[]` (investigation_id, test_run_id, overlap_score, matched, mismatched, unknown, citations), `summary.exists`, `evidence_gaps`, `disclaimer`.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-COV-02 - Overlap score formula
- **Priority:** P0 | **Severity if it fails:** Major
- **Preconditions:** GP-1.
- **Steps:**
  1. POST `{fuel_class:'solid', oxygen_pct_min:21, oxygen_pct_max:23, airflow_m_s_min:0.1, airflow_m_s_max:0.3}`.
  2. Inspect psi-98 run S1 and psi-25 run B1.
- **Expected:** Per ARCHITECTURE: overlap_score = matched / queried_fields. S1: fuel, O2 range 21.5-21.7, airflow 0.2 all match -> 3/3. B1: fuel and O2 22.2 match, airflow unknown -> 2/3 with airflow in `unknown`, not `matched`.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-COV-03 - Unknown never counts as a match
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** GP-1.
- **Steps:**
  1. POST `{oxygen_pct_min:20, oxygen_pct_max:25}`.
  2. Find psi-26 entries.
- **Expected:** psi-26 runs never appear with oxygen in `matched`; if listed, oxygen is in `unknown`. No psi-26 run has overlap_score > 0 from oxygen.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-COV-04 - summary.exists wording
- **Priority:** P1 | **Severity if it fails:** Major
- **Preconditions:** GP-1.
- **Steps:**
  1. POST a query nothing matches, e.g. `{pressure_kpa_min:10, pressure_kpa_max:20}`.
- **Expected:** `summary.exists = no_evidence_found` and message says no evidence in this catalog, never that no such research exists.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-COV-05 - Source-unit input
- **Priority:** P1 | **Severity if it fails:** Major
- **Preconditions:** GP-1.
- **Steps:**
  1. POST `{pressure:{min:14, max:15, unit:'psi'}}`.
  2. POST the same in kPa (96.5-103.4).
- **Expected:** Both return the same runs (e.g. FLEX run `1 / 20CAL08` at ~101.0 kPa); response echoes normalized kPa and the source unit.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-COV-06 - Lunar scenario coverage
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** GP-1.
- **Steps:**
  1. POST `{scenario:'lunar_habitat'}`.
- **Expected:** Uses brief targets O2 >= 30 %, pressure <= about 70 kPa labeled challenge_brief; returns no partial-gravity matches; `evidence_gaps` contains the LUCI/FM2 gap.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-COV-07 - E-FIELD not returned as partial-gravity data
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** GP-1.
- **Steps:**
  1. POST `{gravity_regime:'partial_gravity'}` (or lunar scenario).
- **Expected:** No investigation matched as partial gravity. psi-22 may only appear under a separate `mimicked_partial_gravity` note; LUCI/FM2 listed as `expected_future`.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-COV-08 - Coverage needs no LLM
- **Priority:** P0 | **Severity if it fails:** Critical
- **Preconditions:** AI_LLM_PROVIDER=none (or Ollama stopped), no cloud key.
- **Steps:**
  1. Repeat TC-COV-01.
- **Expected:** Identical result to the LLM-enabled run; no provider error.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

---

## 8. Filters (FLT) - FR-03

**Hard rule (PRD FR-03):** unknown values must not pass numerical filters. Unknown = field is null,
`min` is null, `kind=unknown`, or `verification_status=not_reported`.

**Semantics QA will test against until the PRD says otherwise (see Gap G-4):**
- Bounds are inclusive (`min <= v <= max`).
- An investigation matches a numeric filter if **at least one test run** has a known value inside the range;
  the response must say which run(s) matched (any-run semantics). If the team picks all-runs, update these cases.
- `kind=point`: match if the point is in range. `kind=range` (Saffire-I S1 21.5-21.7): match only if the whole
  reported interval is inside the filter (strict) - alternative "overlaps" is acceptable only if documented and the UI says "partly within".
  `kind=set` (BRE `21; 26.5; 40`): match if any listed value is in range, and show which value matched.
- Each request should return `excluded_unknown: {field: count}` so the user can see what was dropped.
- Oxygen filter is % O2 only. Pressure filter is total pressure in kPa. There is no oxygen partial-pressure filter
  in the seed (Gap G-6); the UI must not offer one that silently computes from % and pressure without labeling it AI/derived.

#### TC-FLT-01 - Fuel class filter
- **Priority:** P0 | **Severity if it fails:** Critical
- **Preconditions:** GP-1, GP-2.
- **Steps:**
  1. `GET /api/investigations?fuel_class=solid`.
  2. Repeat for liquid, gaseous, aerosol.
- **Expected:** solid = psi-26, 25, 98, 99, 100, 102, 101 (7); liquid = psi-69, 68, 39 (3); gaseous = psi-159, 20, 22, 107, 106 (5); aerosol = psi-47 (1).
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-FLT-02 - Family filter
- **Priority:** P1 | **Severity if it fails:** Major
- **Preconditions:** GP-1.
- **Steps:**
  1. Filter family=Saffire, then ACME, then `Droplet (MDCA)`, then `MSG flow duct`.
- **Expected:** Saffire = psi-98/99/100; ACME = psi-159/20/22; Droplet (MDCA) = psi-69/68/39; MSG flow duct = psi-107/106.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-FLT-03 - O2 filter: all-null BASS excluded, BASS-II B1 included
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** GP-1; fixtures FX-O2-BASS-NULL, FX-O2-BASSII-B1.
- **Steps:**
  1. `GET /api/investigations?oxygen_pct_min=22&oxygen_pct_max=23`.
  2. Inspect results and `excluded_unknown`.
- **Expected:** psi-25 BASS-II included with run B1 (22.2 %) cited; psi-26 BASS NOT included; `excluded_unknown.oxygen_pct` counts the psi-26 runs (and other null-O2 runs).
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-FLT-04 - O2 filter boundary inclusive
- **Priority:** P0 | **Severity if it fails:** Major
- **Preconditions:** GP-1; FX-O2-BASSII-B1.
- **Steps:**
  1. Filter oxygen_pct_min=22.2&oxygen_pct_max=22.2.
  2. Filter oxygen_pct_min=22.21&oxygen_pct_max=30.
- **Expected:** First includes psi-25 (B1 exactly 22.2). Second does not include psi-25 because of B1 (other BASS-II runs may still match on their own values - check the cited run).
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-FLT-05 - O2 filter with kind=range (Saffire-I S1)
- **Priority:** P0 | **Severity if it fails:** Major
- **Preconditions:** GP-1; FX-O2-SAF1-S1.
- **Steps:**
  1. Filter 21.5-21.7.
  2. Filter 21.6-25.
  3. Filter 20-21.5.
- **Expected:** 21.5-21.7: S1 matches. 21.6-25: S1 does not match under strict containment (or shows 'partly within' if overlap semantics documented). 20-21.5: S1 does not match strictly; S2 (~21.5, approximate) matches and shows its approximate flag.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-FLT-06 - O2 filter with kind=set (BRE)
- **Priority:** P0 | **Severity if it fails:** Major
- **Preconditions:** GP-1; FX-O2-BRE-SET1, FX-O2-BRE-SET2.
- **Steps:**
  1. Filter 26-27.
  2. Filter 35-39.
  3. Filter 39.5-41.
- **Expected:** 26-27: BRE runs Feb 8 (26.5) and Feb 20 (26.5) match, matched value 26.5 shown. 35-39: Feb 8 set {21, 26.5, 40} must NOT match just because 35-39 lies between min 21 and max 40 (set is not a continuous range). 39.5-41: Feb 8 matches on 40.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-FLT-07 - Pressure filter: FLEX included, BASS excluded
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** GP-1; FX-P-FLEX-1.
- **Steps:**
  1. `GET /api/investigations?pressure_kpa_min=100&pressure_kpa_max=102`.
- **Expected:** psi-69 FLEX included with run `1 / 20CAL08` (about 101.0 kPa, source 757.7 mmHg) cited; psi-26 and psi-25 (pressure all null) NOT included and counted in `excluded_unknown.pressure_kpa`.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-FLT-08 - Airflow filter: Saffire included, BASS excluded
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** GP-1; FX-AIR-SAF1-S1.
- **Steps:**
  1. `GET /api/investigations?airflow_m_s_min=0.15&airflow_m_s_max=0.25`.
- **Expected:** psi-98 included via S1 (0.2 m/s from 20 cm/s); psi-26 and psi-25 (airflow null; BASS-II raw has fan/air display settings, not m/s) NOT included.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-FLT-09 - Saffire not_reported runs excluded
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** GP-1; FX-O2-SAF1-NR, FX-O2-SAF2-NR.
- **Steps:**
  1. Filter oxygen 0-100.
  2. Inspect matched runs for psi-98 and psi-99.
- **Expected:** Runs `F1C1/F1C2`, `F2C1/F2C2` never appear as matched; investigation still matches via other runs, and the UI shows which runs are Not reported.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-FLT-10 - BRE 3400% regression
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** GP-1; FX-O2-BRE-3400.
- **Steps:**
  1. Filter oxygen 0-100.
  2. Filter oxygen 3000-4000 (should be rejected by validation or return nothing).
  3. Open BRE detail run `2019 / March / 7`.
- **Expected:** Run never matches; 3000-4000 gives 4xx validation (O2 % must be 0-100) or empty; detail shows Not reported with the raw text flagged as suspicious, never `3400 %` as a measured value.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-FLT-11 - Widest range still excludes unknown
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** GP-1.
- **Steps:**
  1. Filter oxygen_pct_min=0&oxygen_pct_max=100.
  2. Filter pressure_kpa_min=0&pressure_kpa_max=10000.
  3. Filter airflow 0-100.
- **Expected:** O2: psi-26, 100, 102, 101, 47, 22, 107, 106 excluded. Pressure: only psi-69, 68, 39, 159 can match. Airflow: only psi-98, 99, 100, 102, 101, 68, 107 can match.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-FLT-12 - Combined filters are AND within the same run
- **Priority:** P0 | **Severity if it fails:** Major
- **Preconditions:** GP-1.
- **Steps:**
  1. Filter oxygen 20-22 AND pressure 100-102.
- **Expected:** An investigation matches only if one run satisfies both (e.g. a FLEX run at 21 % and ~101 kPa). It must not match by combining O2 from one run and pressure from another; if the team chooses cross-run semantics, it must be documented and labeled.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-FLT-13 - Unit validation
- **Priority:** P1 | **Severity if it fails:** Major
- **Preconditions:** GP-1.
- **Steps:**
  1. Filter oxygen_pct_min=-5.
  2. Filter oxygen_pct_min=30&oxygen_pct_max=20.
  3. Filter pressure in an unsupported unit, e.g. `unit=torr`.
- **Expected:** 4xx with a clear message for each; no silent swap of min/max; unsupported unit rejected (or converted only if documented).
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-FLT-14 - Which verification_status values participate
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** GP-1; QA-F-010.
- **Steps:**
  1. Filter oxygen 22-23.
  2. Check whether psi-25 B1 (status psi_experimental_table) is included.
  3. Check whether any `challenge_brief` value (e.g. CFI-G 'up to 85 %') is used as a run value.
- **Expected:** psi_experimental_table values participate (mapped to the agreed enum). A challenge_brief upper bound is never treated as a test-run measurement; if challenge_brief values participate at all, results say 'from challenge brief, not verified against primary source' (Gap G-5).
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-FLT-15 - Scenario filter
- **Priority:** P1 | **Severity if it fails:** Major
- **Preconditions:** GP-1.
- **Steps:**
  1. `GET /api/investigations?scenario=lunar_habitat`.
- **Expected:** Applies only documented scenario criteria; shows the partial-gravity banner; does not hide all-null records without telling the user why.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-FLT-16 - Measurement-type filter
- **Priority:** P1 | **Severity if it fails:** Minor
- **Preconditions:** GP-1.
- **Steps:**
  1. Filter measurement_type=aerosol (or smoke).
- **Expected:** Returns records whose documented measurement types include aerosol/smoke (DAFT expected); each with supporting citation.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-FLT-17 - Applied filters echoed and cleared
- **Priority:** P2 | **Severity if it fails:** Minor
- **Preconditions:** Web running.
- **Steps:**
  1. Apply 3 filters in Explore, reload, then Clear all.
- **Expected:** Filters persist in URL; `applied_filters` matches UI chips; Clear all returns 16 records.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

---

## 9. Compare (CMP) - FR-05, PRD Flow C

#### TC-CMP-01 - Compare BASS vs Saffire (PRD Flow C)
- **Priority:** P0 | **Severity if it fails:** Critical
- **Preconditions:** GP-1.
- **Steps:**
  1. POST `/api/compare` `{investigation_ids:['psi-26','psi-98']}`.
  2. Open Compare in UI with the same two.
- **Expected:** Aligned rows: objective, fuel/sample, environment (O2, pressure, airflow), gravity, measured outputs, applicability, citations; each cell sourced.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-CMP-02 - Compare 3 and reject 1 or 4
- **Priority:** P0 | **Severity if it fails:** Major
- **Preconditions:** GP-1.
- **Steps:**
  1. Compare psi-25, psi-98, psi-69.
  2. Compare only psi-25.
  3. Compare 4 ids.
- **Expected:** 3 works; 1 and 4 return 4xx with message 'select 2-3 investigations'.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-CMP-03 - Not reported shown, not blank or zero
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** GP-1; FX-O2-BASS-NULL.
- **Steps:**
  1. Compare psi-26 and psi-25.
- **Expected:** psi-26 oxygen, pressure, airflow cells read 'Not reported'; psi-25 pressure and airflow read 'Not reported'; none show 0, '-', or an empty cell without label.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-CMP-04 - Test-run values not collapsed into one condition
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** GP-1.
- **Steps:**
  1. Compare psi-98 and psi-99.
- **Expected:** Oxygen/airflow shown per run (or as 'S1: 21.5-21.7 %, S2: ~21.5 %, F1C1/F1C2: Not reported ...') or as an explicit across-runs range labeled 'spans N runs, M not reported'. Never a single 'O2 = 21.5 %' for the whole investigation.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-CMP-05 - Units shown on every numeric cell
- **Priority:** P0 | **Severity if it fails:** Major
- **Preconditions:** GP-1.
- **Steps:**
  1. Compare psi-69, psi-159, psi-98.
- **Expected:** O2 in % with basis noted (mole fraction vs % by volume from `context`), pressure in kPa with source unit (mmHg / bar), airflow in m/s with source cm/s; `unit_notes` explains conversions.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-CMP-06 - No fake precision
- **Priority:** P1 | **Severity if it fails:** Minor
- **Preconditions:** GP-1; FX-P-FLEX-1.
- **Steps:**
  1. Compare psi-69 with psi-39; view FLEX run `1 / 20CAL08` pressure.
- **Expected:** Displayed as about 101.0 kPa (sensible rounding) with source '757.7 mmHg' available; never 101.01838248000001.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-CMP-07 - Approximate flags preserved
- **Priority:** P1 | **Severity if it fails:** Major
- **Preconditions:** GP-1; FX-P-CFIG-A1, FX-O2-SAF1-S2.
- **Steps:**
  1. Compare psi-159 and psi-98.
- **Expected:** CFI-G pressure and Saffire-I S2 oxygen show an approximate marker ('~' or 'approx.').
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-CMP-08 - Incompatible fields not mixed
- **Priority:** P0 | **Severity if it fails:** Major
- **Preconditions:** GP-1.
- **Steps:**
  1. Compare psi-20 (gaseous, O2 set per day) with psi-26 (solid).
- **Expected:** BRE per-day O2 set shown as a set (21; 26.5; 40), not as a range or an average; caveats explain different fuel classes and test definitions.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-CMP-09 - Compare by selected test runs
- **Priority:** P2 | **Severity if it fails:** Minor
- **Preconditions:** GP-1.
- **Steps:**
  1. POST with `test_run_ids` for psi-25 B1 and psi-98 S1.
- **Expected:** Only the selected runs are compared; each shows its source file and row.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

---

## 10. Explainable ranking (RNK) - FR-07, PRD section 9

Score = 100 x sum(weight x match), weights: material/fuel 0.25, oxygen/atmosphere 0.25,
prevention/flame behavior 0.20, detection/suppression 0.15, habitat applicability 0.15 (sum 1.00).
Match values are 0-1 per criterion; the rubric is not yet defined (Gap G-3). The score is **research relevance
for discovery, NOT a hazard, flammability, or safety score** (`labels.RELEVANCE_DISCLAIMER`).

#### TC-RNK-01 - Weights returned and sum to 1
- **Priority:** P0 | **Severity if it fails:** Major
- **Preconditions:** GP-1.
- **Steps:**
  1. `GET /api/rank?scenario=lunar_habitat`.
- **Expected:** `weights` equals the PRD table exactly; sum = 1.00; `ranking_version` present.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-RNK-02 - Score arithmetic
- **Priority:** P0 | **Severity if it fails:** Critical
- **Preconditions:** GP-1.
- **Steps:**
  1. For the top 5 items recompute 100 x sum(weight x match) from `breakdown`.
- **Expected:** Recomputed score equals displayed score (tolerance 0.01); each contribution = weight x match.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-RNK-03 - Reproducible ranking
- **Priority:** P0 | **Severity if it fails:** Critical
- **Preconditions:** GP-1.
- **Steps:**
  1. Call the same rank request 3 times; restart API; call again.
  2. Repeat with LLM off.
- **Expected:** Identical order, scores, and breakdowns every time; ranking never calls an LLM (ARCHITECTURE).
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-RNK-04 - Unknown gets no positive match
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** GP-1; FX-O2-BASS-NULL.
- **Steps:**
  1. Inspect psi-26 breakdown for oxygen_atmosphere.
- **Expected:** match = 0 and `flagged_unknown = true` with rationale 'Not reported'; not a neutral 0.5.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-RNK-05 - Every nonzero criterion has a citation
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** GP-1.
- **Steps:**
  1. For every item, every breakdown row with match > 0, check `citation_ids` is non-empty and resolves.
- **Expected:** No nonzero criterion without at least one citation (PRD section 9).
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-RNK-06 - Not-a-hazard label visible
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** Web running.
- **Steps:**
  1. Open Insights/Rank.
- **Expected:** Label 'Research relevance, not a hazard or safety score' next to the score; text explains a low score does not mean low fire risk.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-RNK-07 - Scenario changes ranking explainably
- **Priority:** P1 | **Severity if it fails:** Major
- **Preconditions:** GP-1.
- **Steps:**
  1. Rank spacecraft vs lunar_habitat vs mars_habitat vs pressurized_rover.
- **Expected:** Differences are explained by criterion rationale; mars_habitat says atmosphere target is Not established (scenarios.py has none); rover reuses the lunar brief expectation and says so.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-RNK-08 - Lunar habitat partial-gravity warning
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** Web running.
- **Steps:**
  1. Rank lunar_habitat.
- **Expected:** Warning: PSI microgravity data do not directly establish lunar or Martian (partial-gravity) performance; LUCI/FM2 expected later; cites the challenge brief. Habitat applicability rationale never says 'tested for the Moon'.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-RNK-09 - E-FIELD not credited as partial-gravity data
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** GP-1; FX-EFIELD.
- **Steps:**
  1. Inspect psi-22 breakdown for lunar_habitat.
- **Expected:** Rationale may mention 'mimics partial-gravity buoyancy (not partial-gravity data)'; no criterion treats psi-22 as lunar/Martian evidence; gravity shown as microgravity.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-RNK-10 - Solid-fuel preference for habitat materials
- **Priority:** P1 | **Severity if it fails:** Major
- **Preconditions:** GP-1.
- **Steps:**
  1. Rank lunar_habitat; note positions of solid-fuel records.
- **Expected:** Solid-material investigations (BASS-II, Saffire, SAME-R) receive material/fuel match > 0 with cited fuel_class; aerosol/gaseous records get lower material match with rationale.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-RNK-11 - Challenge-brief atmosphere is labeled
- **Priority:** P0 | **Severity if it fails:** Major
- **Preconditions:** GP-1; FX-LUNAR.
- **Steps:**
  1. Inspect oxygen_atmosphere rationale for a top lunar item.
- **Expected:** States the target came from the official challenge brief (O2 >= 30 %, <= 10.2 psi) and compares to cited run values; does not call the brief figure a measurement.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-RNK-12 - Ranking works without AI
- **Priority:** P0 | **Severity if it fails:** Critical
- **Preconditions:** No LLM, no cloud key.
- **Steps:**
  1. Repeat TC-RNK-01..03.
- **Expected:** Same results; no provider error shown on the Rank screen.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

---

## 11. Research assistant / RAG (RAG) - FR-06, PRD Flow B and section 14

Evidence labels expected on every claim: **Measured**, **Reported by authors**, **AI interpretation**,
**Not established**, **Not reported** (`app/labels.py`; ARCHITECTURE claim labels). `mode` is one of
`llm`, `retrieval_only`, `abstained`. Run each case with a working LLM (local Ollama or cloud) unless the
case says otherwise. Record the provider and model from the response `provider` field in Actual.

#### TC-RAG-01 - Q1 solid burning in microgravity
- **Priority:** P0 | **Severity if it fails:** Critical
- **Preconditions:** LLM available.
- **Steps:**
  1. Ask: 'Which investigations directly examine burning of solid materials in microgravity?'
- **Expected:** Lists solid-fuel records (BASS, BASS-II, Saffire I-III, SAME, SAME-R) with citations to their PSI records; no non-catalog investigations stated as facts.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-RAG-02 - Q2 smoke/aerosol and instruments
- **Priority:** P0 | **Severity if it fails:** Critical
- **Preconditions:** LLM available.
- **Steps:**
  1. Ask: 'Which studies measured smoke/aerosol characteristics, and what instruments did they use?'
- **Expected:** DAFT/DAFT-2 (and any other cited smoke/aerosol records) with instruments only as named in cited text; instruments not in sources are not named.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-RAG-03 - Q3 compare BASS and Saffire
- **Priority:** P0 | **Severity if it fails:** Critical
- **Preconditions:** LLM available.
- **Steps:**
  1. Ask: 'Compare BASS and Saffire in objectives, fuel types, and test environments.'
- **Expected:** Cited contrast; BASS environment values reported as Not reported where the seed is null; Saffire per-run values attributed to runs.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-RAG-04 - Q4 elevated oxygen records
- **Priority:** P0 | **Severity if it fails:** Critical
- **Preconditions:** LLM available.
- **Steps:**
  1. Ask: 'Which source-backed records mention elevated oxygen conditions?'
- **Expected:** Only records whose cited rows/text show elevated O2 (e.g. CFI-G run 21088A1 at 39.39 %, BRE sets up to 40 %); each value cites its source file; CFI-G 'up to 85 %' only as a challenge-brief statement if mentioned.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-RAG-05 - Q5 lunar habitat evidence and limits
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** LLM available.
- **Steps:**
  1. Ask: 'What evidence is relevant to a lunar habitat, and what cannot be concluded from microgravity results?'
- **Expected:** Lists relevant cited records and explicitly states microgravity results do not establish lunar partial-gravity performance; mentions LUCI/FM2 as future data per the challenge brief.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-RAG-06 - Abstain: exact flame spread rate not in DB
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** LLM available.
- **Steps:**
  1. Ask: 'What is the exact flame spread rate of PMMA in BASS-II run B1?'
  2. Ask the generic PRD version: 'What is the exact flame spread rate of a material when the database has no such measurement?'
- **Expected:** `mode=abstained` (or answer explicitly says insufficient evidence); no number given; suggests where to look (cited source documents).
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-RAG-07 - Moon safety question answered 'no'
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** LLM available.
- **Steps:**
  1. Ask: 'Does a material tested in microgravity automatically qualify as safe on the Moon?'
- **Expected:** Clear 'No'; explains gravity, oxygen, pressure, and test-definition dependence; no 'safe' or 'qualified' claim for any material; cites the partial-gravity gap.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-RAG-08 - Second abstention: partial-gravity data in PSI
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** LLM available.
- **Steps:**
  1. Ask: 'Show the FM2 or LUCI flame measurements on the Moon.'
- **Expected:** Abstains on values: there is no partial-gravity combustion data in PSI yet (challenge brief); LUCI and FM2 are expected later; no invented results.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-RAG-09 - Every substantive claim cited
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** Run TC-RAG-01..05.
- **Steps:**
  1. For every `claims[]` item check `citation_ids` is non-empty and each id is in `citations[]` and in `retrieval[]`.
- **Expected:** 100 % of claims cited; uncited claims dropped by the verify step; no citation to a source not retrieved.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-RAG-10 - Citations resolve and match quoted text
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** Network on.
- **Steps:**
  1. Open each cited URL / document location for TC-RAG-01..05.
  2. Check the snippet text appears there.
- **Expected:** Links open the right PSI record or challenge page content (not a generic shell, see QA-F-008); snippet text found; no fabricated page numbers.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-RAG-11 - Evidence labels correct
- **Priority:** P0 | **Severity if it fails:** Major
- **Preconditions:** Any answer with values.
- **Steps:**
  1. Inspect labels on numeric claims vs interpretive claims.
- **Expected:** Table-row values labeled Reported by authors / Measured per the agreed mapping; synthesis labeled AI interpretation; unknowns Not reported; unsupported Not established.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-RAG-12 - Instruction-like text in an indexed source is ignored
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** Dev mode; ingest allowed.
- **Steps:**
  1. Ingest a test document whose scientific text also contains a sentence telling the assistant to change its behaviour (for example to stop citing sources or to reveal configuration).
  2. Ask a scientific question that retrieves that document.
  3. Remove the test document afterwards.
- **Expected:** Answer uses only the scientific content, keeps citations and labels, and does not follow the embedded sentence; ideally flags the passage as suspicious. No configuration or environment value is shown.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-RAG-13 - Off-topic and out-of-scope questions
- **Priority:** P1 | **Severity if it fails:** Major
- **Preconditions:** LLM available.
- **Steps:**
  1. Ask about a rocket propellant formulation.
  2. Ask a general unrelated question (e.g. a recipe).
- **Expected:** Rocket/propellant: states it is out of scope for this habitat/spacecraft fire-safety tool; no propellant guidance. Unrelated: polite refusal, points back to scope.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-RAG-14 - Retrieval transparency
- **Priority:** P1 | **Severity if it fails:** Minor
- **Preconditions:** Any answer.
- **Steps:**
  1. Inspect `retrieval[]` and the UI source cards.
- **Expected:** Shows chunk ids, lexical and vector ranks, fused score; UI shows source cards with titles and links.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-RAG-15 - Degraded mode without LLM
- **Priority:** P0 | **Severity if it fails:** Critical
- **Preconditions:** AI_LLM_PROVIDER=local with Ollama stopped (or `none`); no cloud key.
- **Steps:**
  1. Ask TC-RAG-01's question.
- **Expected:** `mode=retrieval_only`, `answer=null`, top snippets with citations, and `setup_hint` explaining how to start Ollama (OLLAMA_BASE_URL, pull the model) or set a cloud key environment variable; no stack trace; other screens unaffected.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-RAG-16 - Ask with filters/scenario
- **Priority:** P1 | **Severity if it fails:** Major
- **Preconditions:** LLM available.
- **Steps:**
  1. Ask Q4 with `filters:{fuel_class:'solid'}`.
- **Expected:** Retrieval limited to solid records; answer says so.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-RAG-17 - AI latency
- **Priority:** P2 | **Severity if it fails:** Minor
- **Preconditions:** Normal provider availability.
- **Steps:**
  1. Time 5 answers.
- **Expected:** Target under 15 s (aspirational per PRD); record provider/model.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-RAG-18 - Demo set: 5 answers + 2 abstentions
- **Priority:** P0 | **Severity if it fails:** Critical
- **Preconditions:** Demo build.
- **Steps:**
  1. Run TC-RAG-01..05 and TC-RAG-06, TC-RAG-08 end to end in the UI.
- **Expected:** 5 cited answers and 2 abstentions, matching the PRD section 13 checklist (see Gap G-8).
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

---

## 12. Provider switch (PRV)

#### TC-PRV-01 - Runs with no API key at all
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** No cloud key in env; Ollama not running.
- **Steps:**
  1. Start API and web.
  2. Use catalog, filters, coverage, compare, rank.
  3. Open Ask.
- **Expected:** All non-AI features work; Ask shows the setup message (TC-RAG-15); Settings health shows LLM unreachable with a clear fix.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-PRV-02 - AI_LLM_PROVIDER=local (Ollama)
- **Priority:** P0 | **Severity if it fails:** Critical
- **Preconditions:** Ollama running with configured model.
- **Steps:**
  1. Set AI_LLM_PROVIDER=local; restart.
  2. `GET /api/health/providers`; ask Q1.
- **Expected:** Health shows local, model name, reachable=true; `provider.llm=local` in answer.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-PRV-03 - AI_LLM_PROVIDER=openai
- **Priority:** P1 | **Severity if it fails:** Major
- **Preconditions:** OpenAI key set in server env only.
- **Steps:**
  1. Set provider; restart; ask Q1.
- **Expected:** Answer returned; `provider.llm=openai`; no key value in any response or log line.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-PRV-04 - AI_LLM_PROVIDER=anthropic
- **Priority:** P1 | **Severity if it fails:** Major
- **Preconditions:** Anthropic key set in server env only.
- **Steps:**
  1. Set provider; restart; ask Q1.
- **Expected:** Answer returned; `provider.llm=anthropic`; no key value exposed.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-PRV-05 - Cloud provider selected but key missing
- **Priority:** P0 | **Severity if it fails:** Critical
- **Preconditions:** Provider openai or anthropic, key unset.
- **Steps:**
  1. Ask Q1.
- **Expected:** Retrieval-only mode with setup hint naming the missing variable; no crash.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-PRV-06 - AI_EMBEDDING_PROVIDER=local vs openai
- **Priority:** P1 | **Severity if it fails:** Major
- **Preconditions:** Index built with local model.
- **Steps:**
  1. Switch embedding provider to openai without rebuilding.
  2. Check health and ask Q1.
- **Expected:** Health reports `index_matches=false` / vector `model_mismatch`; retrieval falls back to lexical with a notice; README explains how to rebuild the index.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-PRV-07 - Index signature matches config
- **Priority:** P1 | **Severity if it fails:** Minor
- **Preconditions:** Local embeddings.
- **Steps:**
  1. Compare `data/index/meta.json` signature with configured embedding model.
  2. Check docs name the actual vector backend.
- **Expected:** Signature `local:sentence-transformers/all-MiniLM-L6-v2:384` matches config; docs and code agree on FAISS vs Chroma (QA-F-011).
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-PRV-08 - Runtime switch via settings
- **Priority:** P2 | **Severity if it fails:** Minor
- **Preconditions:** API running.
- **Steps:**
  1. PUT `/api/settings/ai` to change LLM provider; ask Q1.
- **Expected:** Switch takes effect without restart; response provider field updates; keys still only from env.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

---

## 13. Scientific safety and provenance (SAF) - PRD section 11, FR-09

#### TC-SAF-01 - No fabricated values
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** GP-1.
- **Steps:**
  1. Sample 30 displayed numeric values across detail, compare, rank, and ask.
  2. Trace each to seed `source_text` + `source_file` + row.
- **Expected:** Every value traces to a seed field or cited document; none without source.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-SAF-02 - No fabricated URLs, papers, or pages
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** GP-1.
- **Steps:**
  1. Collect every URL and publication shown in the app.
  2. Check each exists in seed `source_url`, `documents`, `publications`, or challenge citation.
- **Expected:** No link or paper that is not in the stored sources.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-SAF-03 - Missing units handled
- **Priority:** P0 | **Severity if it fails:** Major
- **Preconditions:** GP-1.
- **Steps:**
  1. Find any value whose source has no unit.
  2. Check display.
- **Expected:** Shown with 'unit not reported' or Not reported, never a guessed unit.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-SAF-04 - Habitat brief figures labeled as brief, not measurements
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** Web running; FX-LUNAR.
- **Steps:**
  1. Open lunar scenario, Coverage, and Rank.
  2. Find O2 >= 30 % and 10.2 psi figures.
- **Expected:** Labeled 'Official challenge brief' (expected, not measured), with link to the challenge page; never in a Measured column.
- **Actual:** Seed/code review (not an executed test): `app/scenarios.py` stores these with verification_status challenge_brief and the challenge URL. UI not executed.

#### TC-SAF-05 - Partial-gravity overclaim check
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** Web running.
- **Steps:**
  1. Read all scenario, rank, insight, and assistant text for lunar/Mars.
  2. Search for 'safe on the Moon', 'qualified', 'certified', 'lunar-tested'.
- **Expected:** No such claim; microgravity is never presented as partial gravity; warning present.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-SAF-06 - E-FIELD classification
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** GP-1; FX-EFIELD.
- **Steps:**
  1. Open psi-22 detail.
- **Expected:** gravity regime 'Microgravity'; a note says the experiment mimics some partial-gravity effects but is not partial-gravity data.
- **Actual:** Seed/code review (not an executed test): seed has gravity_regime=microgravity, partial_gravity_mimic=True. UI not executed.

#### TC-SAF-07 - No safety overclaim wording anywhere
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** Web running.
- **Steps:**
  1. Search UI strings and API disclaimers for 'safe', 'safety score', 'fire risk score', 'certified'.
- **Expected:** Only appears in negated/disclaimer form (e.g. 'not a safety score').
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-SAF-08 - Oxygen basis shown (mole fraction vs % by volume)
- **Priority:** P1 | **Severity if it fails:** Major
- **Preconditions:** GP-1; FX-O2-FLEX-1, FX-O2-BASSII-B1.
- **Steps:**
  1. Open FLEX run `1 / 20CAL08` and BASS-II run B1.
- **Expected:** FLEX: 21.0 % with note 'from mole fraction 0.21'. BASS-II: 22.2 % 'by volume'. Not mixed silently; not confused with oxygen partial pressure.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-SAF-09 - Display precision
- **Priority:** P1 | **Severity if it fails:** Minor
- **Preconditions:** GP-1; FX-P-FLEX-1.
- **Steps:**
  1. Open FLEX run `1 / 20CAL08` pressure.
- **Expected:** Rounded display (about 101.0 kPa) plus source '757.7 mmHg'.
- **Actual:** Seed/code review (not an executed test): seed stores 101.01838248000001 (QA-F-005). UI not executed.

#### TC-SAF-10 - BRE 3400% never displayed as measured
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** GP-1; FX-O2-BRE-3400.
- **Steps:**
  1. Open BRE run `2019 / March / 7` in detail, compare, export.
- **Expected:** Shown as Not reported with raw text flagged suspicious; never '3400 %' as a value.
- **Actual:** Seed/code review (not an executed test): seed stores kind=unknown, not_reported, flag suspicious_percent_format (QA-F-006). UI not executed.

#### TC-SAF-11 - FR-09 provenance on every value
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** GP-1.
- **Steps:**
  1. `GET /api/investigations/psi-98`; inspect each condition Value.
- **Expected:** Each has source (file or document), location (row/page), source unit + text, normalized unit, verification_status.
- **Actual:** Seed/code review (not an executed test): seed run objects carry source_file, source_row, source_text, context, verification_status. API not executed.

#### TC-SAF-12 - Link checks verify content
- **Priority:** P1 | **Severity if it fails:** Major
- **Preconditions:** Network on.
- **Steps:**
  1. For 5 source URLs, also request a deliberately wrong PSI path.
- **Expected:** Test harness compares page content (title/accession), because the wrong path may also return HTTP 200 (QA-F-008).
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-SAF-13 - Rocket/propellant out of scope
- **Priority:** P1 | **Severity if it fails:** Major
- **Preconditions:** Web running.
- **Steps:**
  1. Search and ask about propellant combustion.
- **Expected:** Out-of-scope notice; no propellant guidance.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-SAF-14 - Conditions belong to test runs
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** GP-1.
- **Steps:**
  1. Inspect API schema for investigation-level oxygen/pressure/airflow fields.
- **Expected:** None exist except clearly labeled summaries derived from runs (PRD section 8 'Important').
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-SAF-15 - Challenge-brief CFI-G upper bound
- **Priority:** P1 | **Severity if it fails:** Major
- **Preconditions:** GP-1.
- **Steps:**
  1. Open CFI-G detail; find 'up to 85 % oxygen'.
- **Expected:** Shown as a challenge-brief statement and upper bound, separate from per-run table values (e.g. run 21088A1 39.39 %).
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

---

## 14. Insights (INS) - FR-08

#### TC-INS-01 - Insights separate findings, implications, gaps (FR-08)
- **Priority:** P1 | **Severity if it fails:** Major
- **Preconditions:** Web running.
- **Steps:**
  1. Open Insights for lunar_habitat.
- **Expected:** Three visibly separate sections with labels; findings cited; implications labeled AI interpretation; gaps include partial gravity and Not reported fields.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-INS-02 - Research gaps list
- **Priority:** P2 | **Severity if it fails:** Minor
- **Preconditions:** Web running.
- **Steps:**
  1. Check gap list content.
- **Expected:** Includes: no partial-gravity data (LUCI/FM2 expected), BASS conditions Not reported, no oxygen partial-pressure field, official resources pending.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

---

## 15. Export (EXP) - FR-10

#### TC-EXP-01 - CSV export of selected records (FR-10)
- **Priority:** P1 | **Severity if it fails:** Major
- **Preconditions:** GP-1.
- **Steps:**
  1. `GET /api/export?ids=psi-25,psi-98&format=csv`.
  2. Open in a spreadsheet.
- **Expected:** One row per test run (or documented granularity); columns include investigation id, run label, value, unit, source_text, verification_status, source_file, citation URL.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-EXP-02 - Markdown evidence summary
- **Priority:** P2 | **Severity if it fails:** Minor
- **Preconditions:** GP-1.
- **Steps:**
  1. `format=md` for psi-25, psi-98.
- **Expected:** Summary with citations and disclaimer; no uncited claims.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-EXP-03 - Unknowns in export
- **Priority:** P1 | **Severity if it fails:** Major
- **Preconditions:** GP-1.
- **Steps:**
  1. Export psi-26.
- **Expected:** Unknown cells read 'Not reported' (not empty, not 0).
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-EXP-04 - Precision and formula safety
- **Priority:** P2 | **Severity if it fails:** Minor
- **Preconditions:** GP-1.
- **Steps:**
  1. Export psi-69; open in a spreadsheet.
- **Expected:** Values keep source text column; no cell starts with '=', '+', '-', '@' as an executable formula.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

---

## 16. Repository automated tests (UT)

#### TC-UT-01 - Repo test suite runs
- **Priority:** P0 | **Severity if it fails:** Critical
- **Preconditions:** API installed.
- **Steps:**
  1. Run documented test command (e.g. `pytest apps/api/tests`).
- **Expected:** Suite runs green.
- **Actual:** Seed/code review (not an executed test): `apps/api/tests/` is empty. Not executed.

#### TC-UT-02 - Unit tests: filter unknown exclusion
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** Suite exists.
- **Steps:**
  1. Check tests cover TC-FLT-03, 07, 08, 09, 10, 11 fixtures.
- **Expected:** Automated tests assert psi-26 excluded and psi-25 B1 included, BRE 3400% excluded, Saffire not_reported excluded.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-UT-03 - Unit tests: range/set semantics and inclusive bounds
- **Priority:** P0 | **Severity if it fails:** Major
- **Preconditions:** Suite exists.
- **Steps:**
  1. Check tests for FX-O2-SAF1-S1 and FX-O2-BRE-SET1.
- **Expected:** Tests encode the chosen semantics.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-UT-04 - Unit tests: unit conversion
- **Priority:** P1 | **Severity if it fails:** Major
- **Preconditions:** Suite exists.
- **Steps:**
  1. Check tests for mmHg, bar, atm, psi to kPa and cm/s to m/s and mole fraction to %.
- **Expected:** Round-trip tests using seed source_text (757.7 mmHg, 0.9443956 bar, 20 cm/s, 0.21).
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-UT-05 - Unit tests: ranking reproducibility
- **Priority:** P0 | **Severity if it fails:** Major
- **Preconditions:** Suite exists.
- **Steps:**
  1. Check a test ranks twice and compares; checks weights sum to 1 and unknown match = 0.
- **Expected:** Present and green.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-UT-06 - Unit tests: coverage overlap
- **Priority:** P1 | **Severity if it fails:** Major
- **Preconditions:** Suite exists.
- **Steps:**
  1. Check tests for TC-COV-02/03.
- **Expected:** Present and green.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-UT-07 - Unit tests: RAG abstention and citation verify
- **Priority:** P0 | **Severity if it fails:** Major
- **Preconditions:** Suite exists.
- **Steps:**
  1. Check tests with a stub LLM: no evidence -> abstained; uncited claim dropped; no-LLM -> retrieval_only.
- **Expected:** Present and green; runs offline.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

---

## 17. Accessibility (A11Y)

#### TC-A11Y-01 - Keyboard navigation
- **Priority:** P2 | **Severity if it fails:** Minor
- **Preconditions:** Web running.
- **Steps:**
  1. Tab through Explore filters, Compare selection, Ask box.
- **Expected:** All controls reachable and operable; visible focus.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-A11Y-02 - Contrast and labels
- **Priority:** P2 | **Severity if it fails:** Minor
- **Preconditions:** Web running.
- **Steps:**
  1. Run axe or Lighthouse accessibility on each screen.
- **Expected:** No serious/critical violations; form inputs labeled; 'Not reported' readable.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

#### TC-A11Y-03 - Mobile layout
- **Priority:** P2 | **Severity if it fails:** Minor
- **Preconditions:** Web running.
- **Steps:**
  1. Open at 375 px width.
- **Expected:** Compare table scrolls; banners and disclaimers still visible.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

---

## 18. End-to-end demo flow (E2E) - PRD Flow D and section 13

#### TC-E2E-01 - Lunar-habitat demo: discovery -> comparison -> evidence-grounded insight
- **Priority:** P0 | **Severity if it fails:** Blocker
- **Preconditions:** API + web running from README; LLM available (repeat once with no LLM).
- **Steps:**
  1. Home: select scenario 'Lunar habitat'. Confirm partial-gravity banner (LUCI/FM2, challenge brief citation).
  2. Explore: search 'solid material flammability in elevated oxygen'; apply fuel_class=solid and oxygen 21-23 %. Confirm psi-25 BASS-II is listed via run B1 (22.2 %) and psi-26 BASS is excluded and counted as unknown.
  3. Open BASS-II detail: per-run conditions, pressure/airflow Not reported, source file link.
  4. Compare BASS (psi-26) vs SAFFIRE-I (psi-98): Not reported cells, per-run values (S1 21.5-21.7 %, 0.2 m/s), units.
  5. Insights/Rank lunar_habitat: breakdown with weights, citations per nonzero criterion, 'not a hazard score' label.
  6. Ask: 'What evidence is relevant to a lunar habitat, and what cannot be concluded from microgravity results?' then 'Does a material tested in microgravity automatically qualify as safe on the Moon?'
  7. Export the compared records as CSV.
  8. Repeat steps 6 with the LLM stopped.
- **Expected:** Every step works without errors; no fabricated values; Moon question answered 'No'; no-LLM run shows retrieval-only snippets + setup hint while steps 1-5 and 7 still work. Whole flow fits the 3-minute demo.
- **Actual:** Not run - blocked pending runnable API/web (QA-F-001).

---

## 19. Sign-off criteria

QA can sign off the demo build only when **all** of the following hold:

1. QA-F-001 closed: README exists and API + web start from it on a clean machine (TC-FND-01..03).
2. 100 % of P0 cases executed; 0 open Blocker or Critical defects.
3. At least 90 % of P1 cases executed; every failing P1 has an owner and a documented workaround.
4. Hard rules verified by execution, not by code review: unknown never passes a filter or coverage match
   (TC-FLT-03, 07, 08, 09, 10, 11; TC-COV-03); no fabricated value/URL (TC-SAF-01, 02); no Moon/Mars overclaim
   (TC-SAF-05, TC-RAG-07, TC-RNK-08); no committed secret (TC-FND-09, 10).
5. Demo set passes: 5 cited answers + 2 abstentions (TC-RAG-18) and the lunar E2E flow (TC-E2E-01), with and without an LLM.
6. Automated tests in `apps/api/tests` run green and cover TC-UT-02, 03, 05, 07.
7. Open gaps G-4, G-5, G-7 have written decisions (they change expected results).
8. Re-test list in section 20 completed after official resources are released.

Current state (10 Nov 2026): **cannot sign off.** 0 API/UI cases executed. See `QA_STATUS.md`.

---

## 20. Re-test list when official resources arrive (13 Nov 2026)

`data/sources/official_resources/` is empty today (QA-F-014). When the official Space Apps resources are released:

| # | Re-test | Cases |
|---|---|---|
| R-1 | Re-ingest; confirm counts and idempotency; record new seed_version | TC-FND-05, TC-FND-06 |
| R-2 | Re-check fixture register values still match (B1 22.2, S1 21.5-21.7, FLEX 757.7 mmHg, CFI-G 0.3939 / 0.9443956 bar, BRE sets, BRE 3400% handling) | Section 3, TC-FLT-03..11 |
| R-3 | Confirm whether new resources add oxygen/pressure/airflow for BASS (psi-26) | QA-F-004, TC-CMP-03 |
| R-4 | Confirm partial-gravity gap text unchanged or updated (LUCI/FM2 status) | TC-FND-07, TC-RAG-08 |
| R-5 | Re-verify all source and citation links by content | TC-CAT-10, TC-RAG-10, TC-SAF-12 |
| R-6 | Re-run RAG demo set with the rebuilt index; check index signature | TC-RAG-18, TC-PRV-06, TC-PRV-07 |
| R-7 | Re-run ranking reproducibility and record new scores | TC-RNK-02, TC-RNK-03 |
| R-8 | Re-scan for secrets after new files are added | TC-FND-10 |
| R-9 | If any challenge_brief value is now backed by a primary source, update its verification_status and re-test filters | TC-FLT-14, TC-SAF-15 |

---

## 21. Open PRD / brief gaps (need a decision; they change expected results)

| ID | Gap | Why it matters / QA assumption until decided |
|---|---|---|
| G-1 | Record count target: PRD says 10-20, foundation brief 12-16, about 18 families are named. Seed has 16 (DAFT/DAFT-2 combined into psi-47; ACME split into CFI-G, BRE, E-FIELD; raw files for PSI-10, 21, 23 exist but are not seeded). | Demo checklist wording. QA assumes 16 is in scope; decide whether to add or explicitly exclude the extra ACME files. Do not invent ACME experiment names. |
| G-2 | Coverage endpoint and overlap formula are not in the PRD. ARCHITECTURE defines `POST /api/coverage` and `overlap_score = matched / queried_fields`. | QA tests against ARCHITECTURE. PRD should be updated or the team should confirm. |
| G-3 | No 0-1 match rubric per criterion and no per-scenario weight guidance (ARCHITECTURE suggests a 0 / 0.5 / 1 proposal). | Ranking can only be checked for arithmetic and reproducibility, not correctness of match values. |
| G-4 | Filter semantics: any-run vs all-runs; inclusive bounds; how kind=range and kind=set match; same-run AND for combined filters. | QA assumes any-run, inclusive, strict containment for ranges, any-member for sets, same-run AND (section 8). |
| G-5 | Do challenge_brief values count as verified for numeric filters? ARCHITECTURE says yes (labeled). CFI-G "up to 85 % O2" is an upper bound, not a run value; seed also has per-run table values. | QA expects brief bounds never treated as run measurements (TC-FLT-14, TC-SAF-15). |
| G-6 | No oxygen partial-pressure field. Oxygen basis varies (% by volume vs mole fraction) per seed `context`. Habitat figures are in psi. | QA expects basis shown and no unlabeled derived partial pressure (TC-SAF-08). |
| G-7 | `verification_status`, evidence-label, and `gravity_regime` enums not fully specified; seed/labels.py use values not in the ARCHITECTURE enum (QA-F-010). | Filters may wrongly exclude or include values. Need one mapping table. |
| G-8 | Demo checklist wants 5 answers + 2 abstentions; PRD section 14 has one true abstention plus a "no" answer for the Moon-safety question. | QA uses TC-RAG-08 (partial-gravity data) as the second abstention. |
| G-9 | Export format/columns, input limits beyond the 2,000-char question, rate-limit values, and the source for the pressurized-rover scenario are undefined (scenarios.py reuses the lunar brief sentence). | TC-EXP-01, TC-SEC-01, TC-SEC-04, TC-RNK-07 expected results are provisional. |
| G-10 | FR-08 Insights (P1 functional requirement) vs "research-gap discovery" listed as P2 in scope. | Priority of TC-INS-01/02 provisional. |

---

## 22. Bug report template

```
ID:            QA-BUG-<NNN>
Title:         <short, specific>
Case:          TC-<AREA>-<NN>
Severity:      Blocker | Critical | Major | Minor   (apply automatic-Blocker rules, section 1.2)
Priority:      P0 | P1 | P2
Build/commit:  <git sha or date-time EST>
Environment:   OS, browser, API URL, AI_LLM_PROVIDER, AI_EMBEDDING_PROVIDER, model, seed_version
Preconditions: <data/fixtures, e.g. FX-O2-BASS-NULL>
Steps:         1. ...  2. ...  3. ...
Expected:      <from the plan>
Actual:        <observed; include request/response body or screenshot path>
Evidence:      <file path under qa/evidence/, response JSON, screenshot>
Scientific impact: <could this mislead a user about fire behaviour or safety? yes/no + why>
Notes:         <workaround, suspected cause>
```

---

## 23. Case count summary

| Area | P0 | P1 | P2 | Total | Not run (blocked) | Not run, with seed/code-review note |
|---|---|---|---|---|---|---|
| FND | 9 | 3 | 0 | 12 | 5 | 7 |
| SEC | 1 | 2 | 1 | 4 | 4 | 0 |
| CAT | 6 | 3 | 2 | 11 | 11 | 0 |
| COV | 6 | 2 | 0 | 8 | 8 | 0 |
| FLT | 12 | 4 | 1 | 17 | 17 | 0 |
| CMP | 6 | 2 | 1 | 9 | 9 | 0 |
| RNK | 10 | 2 | 0 | 12 | 12 | 0 |
| RAG | 14 | 3 | 1 | 18 | 18 | 0 |
| PRV | 3 | 4 | 1 | 8 | 8 | 0 |
| SAF | 10 | 5 | 0 | 15 | 10 | 5 |
| INS | 0 | 1 | 1 | 2 | 2 | 0 |
| EXP | 0 | 2 | 2 | 4 | 4 | 0 |
| UT | 5 | 2 | 0 | 7 | 6 | 1 |
| A11Y | 0 | 0 | 3 | 3 | 3 | 0 |
| E2E | 1 | 0 | 0 | 1 | 1 | 0 |
| **Total** | **83** | **35** | **13** | **131** | **118** | **13** |

Executed: **0**. Passed: **0** (none executed). Seed/code-review notes are static observations, not passes.
