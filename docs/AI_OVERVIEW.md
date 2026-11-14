# AI Overview (investigation page and Ask)

The first section of every investigation page (`/investigations/[id]`) is an
**AI Overview**: an evidence-grounded summary of the work done in that
investigation, focused on the search term that brought the user there.

Example: searching "Heat Release Rate" in the Explorer and opening FLEX-2
summarises what FLEX-2 reports about heat release rate, with citations.

## Data flow

1. Explorer (`apps/web/app/explorer/page.tsx`) links to
   `/investigations/<id>?from_q=<query>` when a query is set.
2. The investigation page (`apps/web/app/investigations/[id]/page.tsx`) reads
   `from_q` and renders `<InvestigationOverview invId query />` first.
   The "← Explorer" link returns to `/explorer?q=<from_q>`.
3. `InvestigationOverview` (`apps/web/components/InvestigationOverview.tsx`)
   calls `GET /api/investigations/{id}/overview?q=<query>` with the BYOK
   headers from `lib/byok.ts` (`assistantHeaders`).
4. The API handler (`investigation_overview` in
   `apps/api/app/routers/api.py`) builds a focused question from the
   investigation acronym, title and query, then calls `ask_svc.ask(...)` with
   `k=8` and `investigation_ids=[id]`, so retrieval is limited to that
   investigation.
5. The response is the normal ask result plus `investigation_id`, `acronym`,
   `title`, `query`.

## Dataset and publication context

Text retrieval alone only sees the PSI record and NASA documents. Two structured
sources are added by `apps/api/app/services/overview_context.py` and appear as
extra numbered citations (so they are validated and shown like any other source):

- **Dataset** (`psi_experimental_table`): rows from the investigation's PSI
  experimental table (`TestRun.raw`) that mention the query terms (otherwise the
  first rows), with the column names and row count.
- **Publications** (`psi_publication_listing`): publications listed on the PSI
  record, ranked by query-term overlap on title/authors, with authors, year and
  DOI. Only metadata is indexed, so the model is told not to claim findings
  beyond a title.

The prompt asks for **Dataset** and **Publications** headings. Nothing in these
blocks is generated; it is copied from stored rows.

## Ask page

`ask_svc.ask` adds the same dataset/publication citations whenever the question
names an investigation (e.g. "FLEX-2", up to 3) or the caller scopes it with
`investigation_ids` (as the overview does). The Ask page renders AI answers as
markdown through the shared `components/Markdown.tsx`.

## Response behaviour

| Situation | `mode` | UI |
|---|---|---|
| LLM available, evidence found | `llm` | Markdown answer + sources |
| LLM available, evidence insufficient | `abstained` | Answer states what is missing |
| No LLM configured | `retrieval_only` | Template summary, setup message, cited passages |

The answer is markdown and is rendered with `react-markdown`. Citations written
as `【S3】` are normalised to bold `[S3]`. The "Sources used" list shows each
cited passage and a link to the PSI record.

The app is decision-support only: the overview must stay grounded in cited
sources, and the existing disclaimers and abstain behaviour apply.

## LLM setup

Without a key the overview falls back to retrieval-only. Two options:

- **Server key:** in the repo-root `.env` (copy from `.env.example`) set
  `AI_LLM_PROVIDER=groq` and `GROQ_API_KEY=...`. **Restart `make dev`**: the
  API reads `.env` at startup, and auto-reload does not pick up `.env` changes.
  Other providers: `openai`, `anthropic`, `local` (Ollama).
- **Bring your own key:** paste a key in Settings. It is kept in
  sessionStorage only and sent per request.

## Known gaps

- The overview endpoint does not apply the `QuotaGuardLLM` rate limit used by
  `/api/ask` when the server key is used.
- Results are not cached; each page view makes an LLM call.
- The detail page uses `useSearchParams` without a `<Suspense>` boundary, which
  may fail `next build`.

## Styling notes

Styles are `.overview-*` and `.shimmer-line` in `apps/web/app/globals.css`.
The global `.prose` class sets `white-space: pre-line`, so
`.overview-answer` overrides it to `normal`; otherwise rendered markdown shows
extra blank lines.
