# Changelog & Agent Context

All notable changes to the **Flame in Freefall** microgravity combustion evidence explorer are documented here. This document serves as both a human-readable release log and persistent architectural context for AI agent sessions.

---

## [PR #1] - 2026-11-14 — Investigation AI Overview, Evidence Citations & Explorer Fixes
**Branch**: `feat/investigation-ai-overview`  
**PR**: [#1](https://github.com/Rafat001/spaceapps-flame-in-freefall/pull/1)  

### Highlights & Summary
Introduced query-aware AI overviews for individual combustion investigations, grounded responses with structured dataset rows and publication metadata, unified markdown citation rendering across the web app, fixed search result match sorting/ranking confusion in the Explorer, and streamlined the navigation bar.

### Detailed Changes

#### 1. Investigation AI Overview
- **Backend Endpoint**: `GET /api/investigations/{id}/overview?q={query}`
  - Implemented in `apps/api/app/routers/api.py`.
  - Generates a 2–3 paragraph evidence-grounded summary tailored to the search query `q` (e.g., "Heat Release Rate", "soot formation") or falls back to an overview of the investigation's core objectives if `q` is absent.
  - Leverages hybrid retrieval (BM25 + chunk embeddings scoped to the investigation `id`).
  - Graceful fallback: If no server LLM key (Groq) or user BYOK key is provided, returns a structured retrieval summary based on top evidence chunks without failing.
- **Frontend Component**: `apps/web/components/InvestigationOverview.tsx`
  - Rendered at the top of `/investigations/[id]`.
  - Parses query parameter `?from_q=` passed from the Explorer so the overview matches the user's active search context.
  - Includes a link back to `/explorer?q=...` to preserve search momentum.

#### 2. Dataset & Publication Structured Context (Ask + Overview)
- **New Service**: `apps/api/app/services/overview_context.py`
  - Extracts structured PSI experimental table condition rows (O2 %, pressure, airflow, fuel, flame behavior, test counts) and lists documented publications/citations for any investigation.
  - Formats these into synthetic citation records `[S#]` so the LLM explicitly cites real experimental test rows and peer-reviewed papers alongside narrative chunks.
- **Ask Integration**: Updated `apps/api/app/services/ask.py` to inject structured table rows and publication citations when user questions name or retrieve specific investigations.

#### 3. Shared Markdown & Citation Normalisation
- **Component**: `apps/web/components/Markdown.tsx`
  - Created a shared markdown renderer using `react-markdown` and `remark-gfm`.
  - Normalises model citation output across different LLM formats (`【S1】`, `[S1]`, `【S2】`) into interactive numbered badges.
  - Replaced inline custom renderers in both `/assistant` (Ask page) and `/investigations/[id]` (Investigation Overview) to eliminate blank lines, unstyled tables, and unparsed tags.

#### 4. Explorer Search Match Ordering & Rank Clarification
- **Default to Text Match**: In `apps/web/app/explorer/page.tsx`, searches containing `q` now automatically default to `sort=match` instead of static query-independent scenario relevance. Queries like `smoke detection` now place matching investigations (SAME, DAFT, SPICE) at the top of the list.
- **Sequential Match Rank (`#1`, `#2`, ...)**:
  - Cards in text match sort now display sequential match position (`#1 · PSI-102`, `#2 · PSI-47`) in the card header and footer (`Match rank #1 of 13`).
  - Scenario relevance is explicitly qualified as background scenario score (e.g. `Scenario rank #9 (relevance 67/100)`), resolving user confusion where the top search hit showed `Rank #9`.
- **Legend Update**: Explains the difference between search match position and scenario research relevance.

#### 5. Navigation Bar Cleanup
- **Top Rail**: Removed the `PSI catalog 24 inv.` status badge from `apps/web/app/layout.tsx` and updated `apps/web/app/globals.css`.
- Frees horizontal space for the 10 main navigation links on laptop and tablet viewports without cluttering the wordmark.

#### 6. Navigation Redesign & AndroFlame Intro Page
- **AndroFlame Intro Page (`/androflame` & `/intro`)**: Dedicated mission overview covering the 2026 Space Apps Challenge, microgravity combustion physics (buoyancy absence, spherical diffusion, cool flames, partial-gravity exploration targets), and zero-hallucination grounding standards.
- **Waffle Apps Launcher (Microsoft 365 style)**: Collapsed 7 research tools (Catalog Explorer, Coverage Matrix, Compare Studies, Scenario Ranking, Earth vs Freefall, SpaceFire Evolution, Beyond PSI) into an interactive 9-dot dropdown popover.
- **Fully Opaque Backdrop & Hover Fixes**: Made `.apps-popover` and `.app-card` 100% solid (`#07173F` / `#0B2154`) with `z-index: 999` on `.rail` to prevent underlying page text bleed-through, and overrode button hover to remove generic white backgrounds.
- **Clean 4-Tab Navbar**: Structured as `AndroFlame` (00), `Apps` (Waffle Launcher), `Ask` (01), and `AI Config` (02, renamed from Settings).
- **Team & Academic Collaboration Section**: Documented project team members (Sayket Dey & Kapilkumar Patil — Doctoral Students & Members of Research group of Fire Safety Science & Engineering, Ghent University, Belgium; Mohammed Majharul Islam from Genesys USA; and Md Emrul Chowdhury from Amazon UK — Software Development Engineer L5) on the AndroFlame intro page.
- **Removed Lunar Tab**: Retired the standalone `/lunar` navbar item and redirected home page discovery directly to Scenario Ranking (`/insights`).

#### 7. Search Synthesis, Query Routing & Introduction Page Enhancements
- **Search Findings & Evidence Synthesis**: Added a prominent AI evidence synthesis card on `/explorer?q=...` that renders literature synthesis, cited investigation badges (SAME, DAFT-2, etc.), and match indicators (`Match #n for "query"`).
- **Query Parameter Passing**: Passing `?q=...` from search cards, chips, and Ask citations into `/investigations/[id]`, which powers query-scoped AI overviews and contextual back navigation.
- **Ask Page Suggested Questions Background Fix**: Reverted button selector specificity in `globals.css` and enforced transparent backgrounds on `.prompts button`.
- **Navbar Alignment & Apps Popover Fix**: Fixed logo and tab alignment across viewports (single-line horizon layout) and anchored the Apps launcher directly under the 9-dot waffle button.
- **AndroFlame Intro Page (PDF Spec)**: Formatted `/androflame` with split Objective & embedded YouTube video (*NASA ScienceCasts: The Power of Studying Combustion on the ISS*), Scope & Target Audience, Limitations, and 3-tier researcher level tips & tricks.

#### 8. Documentation
- Created `docs/AI_OVERVIEW.md` detailing endpoint contracts, context building pipeline, citation format specifications, and error handling.
- Created `CHANGELOG.md` maintaining persistent architectural and PR context for developers and AI agents.

---

## [Milestone: Foundation & Space Apps Challenge Core] - Pre-PR #1

### 1. Ingestion & PSI Database
- Ingested 24 NASA Physical Sciences Informatics (PSI) combustion investigations.
- Extracted experimental condition tables, test runs (O2 %, pressure, airflow, fuels), and data-quality flags.
- SQLite database backing with full-text search (`FTS5`) and FAISS / sentence-transformers vector embeddings.

### 2. Assistant & BYOK (Bring Your Own Key)
- `/api/ask` grounded question-answering with exact computed data checks.
- Support for Groq free-tier provider with daily/rate quotas and BYOK headers for Anthropic and OpenAI.

### 3. Scenario Relevance Ranking
- Research relevance scoring (0–100) across spaceflight fire safety scenarios (`lunar_habitat`, `mars_transit`, etc.).
- Categorises test runs into documented-at-target vs out-of-range conditions.

### 4. Modeling CSV Export
- `/api/export/modeling.csv` and `/api/export/dictionary` providing full tabular datasets with SI unit normalisation.

---

### Key Architectural Invariants for Agents
1. **Citation Conventions**:
   - Chunks and tables are indexed as `[S1]`, `[S2]`, etc.
   - LLM prompts must instruct the model to use brackets `[S#]` and NOT invent citation numbers outside the provided context sources.
2. **Sort Defaults**:
   - Without search query: `sort=relevance` (scenario research relevance).
   - With search query (`q` present): `sort=match` (BM25 full-text match score).
3. **NASA Attribution & Scope**:
   - Research relevance is not a certification or hazard rating.
   - All ground and flight data must preserve PSI provenance links.
