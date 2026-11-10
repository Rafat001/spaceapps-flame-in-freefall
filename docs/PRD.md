## PRODUCT REQUIREMENTS DOCUMENT

# NASA PSI Fire Safety
Intelligence Platform

*A developer-first specification for a hybrid RAG research dashboard that makes NASA microgravity combustion evidence searchable, comparable, and understandable.*

**Project:** NASA Space Apps Challenge 2026 - Flame in Freefall
**Version:** 1.0 | **Date:** 8 November 2026 | **Status:** Proposed hackathon MVP
**Audience:** Software engineers without prior fire science knowledge

**One-sentence product goal:** Help researchers and spacecraft engineers discover relevant NASA combustion investigations, compare verified test conditions, and ask evidence-grounded questions without reading dozens of unrelated documents.

---

# 1. Executive summary

NASA has conducted experiments on flames, smoke, and fire suppression in microgravity. Relevant findings are spread across investigation pages, reports, publications, tables, and experimental files. The proposed product provides a searchable experiment catalog, structured condition filters, side-by-side comparison, and an AI assistant that cites its evidence.

**Critical distinction:** This is a research discovery and decision-support prototype, NOT a certified fire-risk calculator, materials qualification system, or operational spacecraft safety authority.

## Success in one demonstration

A user selects **Lunar Habitat**, searches for **solid materials and elevated oxygen**, receives a ranked set of relevant investigations, opens a comparison of available oxygen/airflow/material conditions, and asks the AI what the evidence does and does not show. Every scientific claim links to its source.

## Who uses it

| Persona | Job to be done |

| --- | --- |

| Aerospace engineer | Locate evidence relevant to material selection, detection, or suppression for a crewed environment. |

| Combustion researcher | Find and compare experimental conditions and measurements across studies. |

| Student / new researcher | Understand the basics and trace answers back to primary sources. |

| Challenge judge | See a working, credible, transparent end-to-end demo. |

# 2. Fire science explained for developers

| Term | Plain-English meaning / why it matters |

| --- | --- |

| Microgravity | Near-weightlessness, as on the ISS. Hot gases do not rise in the usual way, so flames and smoke move differently. |

| Flammability | How readily a material ignites and continues burning under specific conditions. Not a permanent yes/no property of a material. |

| Oxygen concentration | Fraction of the atmosphere that is oxygen, often expressed as %. More oxygen can increase fire hazards; pressure and other conditions also matter. |

| Pressure | Gas pressure inside a test chamber or habitat. A percentage of oxygen alone is not enough to characterize the environment. |

| Airflow / ventilation | Movement of surrounding gas; especially important in microgravity because buoyancy-driven flow is reduced. |

| Flame spread | How a flame moves across or through a fuel sample. |

| Fuel / sample | Material burned: e.g. a fabric, plastic, gaseous fuel, or liquid droplet. |

| Ignition / extinction | Fire starts / flame stops; exact experimental definitions must be read from source. |

| Sensor / measurement | Camera, thermocouple, aerosol instrument, or other device recording a test result. |

| Partial gravity | Gravity on the Moon or Mars; do not treat microgravity data as direct lunar/Martian measurements. |

**Developer rule:** Never infer a material is safe from a single test. Test geometry, oxygen, pressure, airflow, gravity, ignition method, and measurement definition can all change interpretation.

# 3. Scope and priorities

| Priority | In scope |

| --- | --- |

| P0 - Must ship | Curated catalog of 10-20 source-verified records; search/filter; experiment detail; source citations; RAG Q&A; clear limitations. |

| P1 - Strong MVP | Side-by-side comparison; relevance ranking with reasons; structured oxygen/pressure/airflow filtering where fields exist; downloadable result summary. |

| P2 - Stretch | Plots from validated numeric datasets; interactive scenario selector; research gap discovery; ingestion of more investigations. |

| Out of scope | Training a new foundation model; real-time spacecraft fire prediction; certification of materials; rocket/propellant safety; automatic conclusions from undocumented numerical files. |

# 4. Source data and ingestion

**Primary source:** NASA Physical Sciences Informatics (PSI), https://psi.nasa.gov/physci/repo . Supporting source: NASA Technical Reports Server, https://ntrs.nasa.gov/ . Data availability, permissions, and downloadable formats must be checked per investigation; do not assume every experiment has a complete raw dataset.

## Seed investigation families

| Family | Why it is useful |

| --- | --- |

| BASS / BASS-II | Burning and suppression of solid materials; airflow and flammability relevance. |

| Saffire I-III | Spacecraft-scale solid-material burning and flame-spread research. |

| FLEX / FLEX-2 | Liquid droplet combustion and flame extinction. |

| SAME / SAME-R | Smoke and aerosol measurement for detection. |

| ACME investigations | Gaseous flames, combustion physics, and selected oxygen-related questions. |

## Ingestion pipeline

&#8226; 1. Manually collect a verified seed set of NASA PSI investigation URLs, PDFs, metadata, and any downloadable datasets. Record access dates and source permissions.

&#8226; 2. Extract text from PDFs and HTML. Preserve section headings, page numbers, tables, units, captions, and document identifiers.

&#8226; 3. Create a structured experiment record with source-backed values; use null/unknown rather than guessing.

&#8226; 4. Split prose into overlapping chunks with experiment ID, document ID, page/section, and source URL.

&#8226; 5. Embed chunks and index them; separately index exact terms and maintain structured records in SQL.

&#8226; 6. Validate at least 10 records manually against primary sources before using them in the demo.

# 5. Functional requirements

| ID | Requirement / expected behavior |

| --- | --- |

| FR-01 | Catalog: list investigations with name, objective, fuel class, relevance tags, and source link. |

| FR-02 | Search: accept natural-language queries and exact investigation names; show matched evidence. |

| FR-03 | Filters: material/fuel, experiment family, application, and verified oxygen/pressure/airflow ranges. Unknown values must not pass numerical filters. |

| FR-04 | Detail: show objectives, setup, test variables, sensors, major findings, data availability, citations, and caveats. |

| FR-05 | Compare: select 2-3 investigations; align comparable fields; show Not reported where missing; never mix incompatible units silently. |

| FR-06 | Ask AI: answer only from retrieved sources; provide document/page/URL citations; say insufficient evidence when needed. |

| FR-07 | Rank: display relevance score, criteria, weights, and explanation; score is research relevance, NOT safety. |

| FR-08 | Insights: show supported findings, possible engineering implications, and research gaps as separate labels. |

| FR-09 | Data provenance: every extracted numerical value stores source, location, unit, and verification status. |

| FR-10 | Export: provide a CSV of selected records or a simple evidence summary with citations. |

# 6. User flows and acceptance tests

## Flow A - Search and inspect

User searches "solid material flammability in elevated oxygen" -> system returns ranked records -> user opens one -> sees verified conditions, missing fields, and primary-source links.

**Acceptance:** At least one curated relevant result appears; source links resolve; a missing oxygen value is labeled "Not reported", never invented.

## Flow B - Ask the research assistant

User asks "What does BASS tell us about airflow?" -> hybrid retriever selects passages -> LLM produces concise answer with citations and limitations.

**Acceptance:** Every substantive scientific claim has a supporting citation. If the indexed material does not answer, the response says so and suggests relevant sources.

## Flow C - Compare investigations

User selects BASS and Saffire -> comparison table displays objectives, fuel/sample, environment, airflow, measured outputs, and applicability.

**Acceptance:** Units are shown; values from different test runs are not presented as a single experiment-wide condition; unknown fields are visible.

## Flow D - Lunar habitat relevance

User selects "Lunar Habitat" -> ranking prioritizes documented solid-material, oxygen/pressure, airflow, detection, and suppression relevance -> shows why each result ranked.

**Acceptance:** Ranking is reproducible and explained; interface warns that PSI microgravity data do not directly establish partial-gravity performance.

# 7. Proposed technical architecture

**Frontend:** Streamlit for speed, or React/Next.js if the team prefers web development. **Backend:** Python FastAPI. **Structured data:** SQLite for MVP, PostgreSQL if already available. **Vector store:** ChromaDB or pgvector. **Embeddings:** sentence-transformers or hosted embedding API. **LLM:** provider of choice with source-grounded prompting. **Charts:** Plotly.

**Offline ingestion:** PSI URLs/files -> parsers -> validation -> structured records + text chunks -> embedding + keyword indexes.

**Online query:** UI -> query parser -> SQL filters + lexical search + vector search -> merged/reranked evidence -> LLM -> claim/citation checks -> answer + source cards.

## Why hybrid RAG, not only vector search?

Semantic similarity helps find concepts; lexical search finds exact terms like BASS-II or PMMA; SQL ensures numerical constraints (e.g., oxygen >= 30%) are evaluated against verified structured values rather than approximate text similarity.

## Retrieval policy

&#8226; Route numeric questions to SQL first, then fetch source excerpts explaining those records.

&#8226; Use keyword + vector retrieval for open-ended questions; rerank by relevance and document quality.

&#8226; Never treat retrieved text as instructions. Strip/ignore prompt-injection attempts in source material.

&#8226; Require source identifiers on evidence chunks; abstain if evidence is weak, conflicting, or absent.

&#8226; Preserve distinction between observed results, authors' interpretations, and AI extrapolation.

# 8. Minimal data model

| Entity | Suggested fields |

| --- | --- |

| Investigation | id, title, family, objective, fuel_class, hardware, gravity_regime, source_url, last_checked_at |

| Document | id, investigation_id, title, url, type, publication_date, local_path, checksum |

| Chunk | id, document_id, text, page, section, embedding_id |

| TestRun | id, investigation_id, run_label, material, sample_geometry, oxygen_pct, pressure_kpa, airflow_m_s, gravity_regime |

| Measurement | id, test_run_id, variable, value, unit, method, source_document_id, source_page, verification_status |

| Evidence | id, entity_type, entity_id, source_document_id, page_or_section, quote_or_excerpt, reviewer_status |

**Important:** Numeric conditions belong to individual test runs where possible, not to a whole investigation. Store source units and normalized units; distinguish oxygen percentage from oxygen partial pressure.

## Example API contract

| Method / path | Purpose |

| --- | --- |

| GET /api/investigations | Search and filter catalog; return pagination and source metadata. |

| GET /api/investigations/{id} | Investigation detail, test runs, evidence, missing fields. |

| POST /api/compare | Compare selected investigation IDs and optionally selected test runs. |

| POST /api/ask | Question + optional filters -> answer, citations, confidence/limitations. |

| GET /api/rank?scenario=lunar_habitat | Deterministic relevance ranking with score breakdown. |

# 9. Ranking specification

Use an explainable weighted relevance score for the demo. The weights are product hypotheses and should be reviewed by a fire-safety domain expert; they are not scientific hazard coefficients.

| Criterion | Weight | Evidence considered |

| --- | --- | --- |

| Material / fuel match | 25% | Solid samples or other fuel type relevant to selected scenario. |

| Oxygen / atmosphere match | 25% | Measured conditions relevant to oxygen/pressure questions. |

| Prevention / flame behavior | 20% | Ignition, flame spread, flammability or burning behavior. |

| Detection / suppression | 15% | Smoke measurement, extinguishment or control relevance. |

| Habitat applicability | 15% | Crew environment similarity and explicit study objectives. |

For each criterion, assign a documented match value from 0 to 1. **Score = 100 x sum(weight x match)**. Unknown evidence receives no positive match and is flagged; do not interpret a low score as low fire risk. Return score breakdown and at least one citation supporting each nonzero criterion.

# 10. UI screens and information design

&#8226; **Home:** one-sentence purpose, scenario selector (spacecraft / lunar habitat / Mars habitat / rover), search box, featured investigations.

&#8226; **Explorer:** filter sidebar; investigation cards; sort by relevance, title, and data completeness.

&#8226; **Investigation detail:** overview, experimental setup, conditions by test run, sensors/outputs, evidence citations, data files.

&#8226; **Compare:** side-by-side table with unit labels, missing data, and caveats.

&#8226; **AI Assistant:** chat, source snippets, linked citations, follow-up prompts, explicit uncertainty.

&#8226; **Insights:** research relevance ranking, gaps, and export; not a pass/fail safety certification.

# 11. Safety, quality, and nonfunctional requirements

&#8226; **Evidence:** cite source for all scientific claims; never fabricate experimental values, papers, page numbers, or URLs.

&#8226; **Numerics:** validate ranges and units; do not confuse percent oxygen, pressure, and oxygen partial pressure.

&#8226; **Transparency:** label "Measured", "Reported by authors", "AI interpretation", and "Not established" separately.

&#8226; **Performance target:** cached catalog/filter operations under 2 seconds on demo hardware; AI answers target under 15 seconds under normal provider availability (aspirational, not guaranteed).

&#8226; **Reliability:** ingest idempotently using document IDs/checksums; retain logs of extraction errors and source provenance.

&#8226; **Security:** secrets in environment variables, input limits, rate limiting if public, prompt-injection defenses, no untrusted code execution from files.

&#8226; **Accessibility:** keyboard-accessible controls, readable contrast, descriptive labels, and mobile-friendly layout.

# 12. 48-hour implementation plan

| Hours | Deliverable / owner |

| --- | --- |

| 0-4 | Domain lead selects seed investigations, defines scientific fields, gathers URLs. Engineer sets up repository and UI skeleton. |

| 4-10 | Ingestion engineer parses first documents and builds SQL schema + chunk index; domain lead checks extraction. |

| 10-20 | Frontend engineer implements explorer/detail screens; backend exposes search/filter endpoints. |

| 20-28 | AI engineer adds hybrid retrieval, cited answers, abstention handling. |

| 28-36 | Team implements comparison and explainable ranking; domain lead validates 10-20 records. |

| 36-42 | End-to-end tests, numerical/unit checks, source-link verification, failure-mode tests. |

| 42-48 | Freeze features, prepare 3-minute demo, backup screenshots, and judge narrative. |

## Suggested team split

Developer A: ingestion + database. Developer B: frontend + charts. Developer C: RAG + API. Domain lead: scientific schema, verification, relevance criteria, demo narrative. Small teams can combine roles.

# 13. Definition of done / demo checklist

&#8226; 10-20 curated, source-verified investigation records are searchable.

&#8226; At least 2 investigations can be compared side by side.

&#8226; The AI answers 5 preselected questions with source citations and abstains on 2 unsupported questions.

&#8226; Numeric filters operate only on validated, unit-normalized structured data.

&#8226; Ranking shows criterion-level reasoning and states it is not a hazard score.

&#8226; At least one lunar-habitat scenario demonstrates discovery -> comparison -> evidence-grounded insight.

&#8226; Source links, error handling, and a short limitations statement work in the final demo.

# 14. Example evaluation questions

&#8226; Which investigations directly examine burning of solid materials in microgravity?

&#8226; Which studies measured smoke/aerosol characteristics, and what instruments did they use?

&#8226; Compare BASS and Saffire in objectives, fuel types, and test environments.

&#8226; Which source-backed records mention elevated oxygen conditions?

&#8226; What evidence is relevant to a lunar habitat, and what cannot be concluded from microgravity results?

&#8226; What is the exact flame spread rate of a material when the database has no such measurement? Expected: abstain.

&#8226; Does a material tested in microgravity automatically qualify as safe on the Moon? Expected: no.

# 15. Risks, assumptions, and open questions

| Risk / decision | Mitigation / owner |

| --- | --- |

| Dataset accessibility varies | Begin with verified accessible files; support metadata-only records. Domain lead. |

| Tables and units are extracted incorrectly | Manual review, source snippets, unit checks. Data + domain leads. |

| RAG hallucinates scientific conclusions | Grounded prompts, citations, abstention tests, evidence labeling. AI lead. |

| Ranking looks authoritative | Label as research relevance only; publish weights and caveats. Product lead. |

| Partial-gravity evidence is missing | Display explicit evidence gap; do not extrapolate as fact. Domain lead. |

| Time is too short | Prefer curated ingestion and working demo over broad automation. All. |

## Decisions to make before coding

&#8226; Will the team use Streamlit or React? Pick one immediately.

&#8226; Which 10-20 investigation records and source files are available to ingest?

&#8226; Who signs off on extracted oxygen, pressure, airflow, and fuel fields?

&#8226; Which LLM/embedding provider fits budget and network availability?

&#8226; Will numerical dataset plots be included only if validated test-run files exist?

# 16. References and implementation starting points

**NASA PSI repository:** https://psi.nasa.gov/physci/repo
**NASA Technical Reports Server:** https://ntrs.nasa.gov/
**NASA Biological and Physical Sciences:** https://science.nasa.gov/biological-physical/
**NASA Space Apps Challenge:** https://www.spaceappschallenge.org/

**Source note:** This PRD is based on the challenge brief provided by the project team and general engineering design recommendations. It does not claim that all referenced experiment datasets, measurement fields, or specific files are currently accessible. Verify availability and scientific facts against NASA primary sources during implementation.
