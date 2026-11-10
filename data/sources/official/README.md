# Official Space Apps resources (placeholder)

The official "Resources" tab for Flame in Freefall says resources will be available on **Friday 13 Nov 2026**.
Nothing here yet — do not add invented files.

When they arrive:
1. Save each raw file here unchanged (PDF/CSV/HTML), plus a line in `MANIFEST.md`: file, source URL, access date (ET).
2. If it is a PSI investigation not in the seed, save its JSON from
   `https://psi.nasa.gov/geode-py/ws/repo/investigations/<PSI-ID>` to `data/sources/psi/` and its experimental
   table CSV to `data/sources/psi/experimental_tables/`, add the accession to `SEED_ACCESSIONS` +
   `CURATION` (apps/api/app/ingest/curation.py) and a column mapping in `table_specs.py`.
3. `make seed && make ingest` (rebuilds seed JSON, SQLite, FTS and vector index).
