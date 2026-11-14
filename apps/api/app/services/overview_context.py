"""Dataset + publication context for an investigation.

Retrieved text chunks cover the PSI record and NASA documents. Two further sources are held
structurally and are otherwise invisible to the LLM:

- the PSI experimental table (``TestRun.raw``): the dataset the investigators published, and
- the publications listed on the PSI record (``Document`` rows of type ``publication``): only
  title/authors/date/DOI are indexed, not the full text.

``context_citations`` renders both as citation-shaped dicts (same shape as ``ask._citation``) so
they flow through the existing prompt, citation validation and UI unchanged. Nothing here is
generated: every line is copied from a stored row or record.
"""
from __future__ import annotations

import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Document, Investigation, TestRun
from app.retrieval import lexical

MAX_DATASET_ROWS = 6
MAX_PUBLICATIONS = 8
EXCERPT_CHARS = 1400
_SKIP_COLS = {"", "nan", "none"}


def _terms(q: str) -> list[str]:
    return [t.lower() for t in lexical.query_terms(q or "")]


def _score(blob: str, terms: list[str]) -> int:
    blob = blob.lower()
    return sum(1 for t in terms if t[:5] in blob)


def _row_text(raw: dict) -> str:
    return "; ".join(f"{k}: {v}" for k, v in raw.items() if str(v).strip().lower() not in _SKIP_COLS)


def dataset_citation(session: Session, inv: Investigation, q: str) -> dict | None:
    runs = session.scalars(select(TestRun).where(TestRun.investigation_id == inv.id)
                           .order_by(TestRun.source_row, TestRun.id)).all()
    runs = [r for r in runs if r.raw]
    if not runs:
        return None
    terms = _terms(q)
    scored = [(_score(_row_text(r.raw), terms), i, r) for i, r in enumerate(runs)]
    matching = [x for x in scored if x[0] > 0]
    picked = sorted(matching, key=lambda x: (-x[0], x[1]))[:MAX_DATASET_ROWS] if matching else scored[:MAX_DATASET_ROWS]
    columns = list(dict.fromkeys(k for r in runs for k in r.raw))
    kinds: dict[str, int] = {}
    for r in runs:
        kinds[r.row_kind] = kinds.get(r.row_kind, 0) + 1
    head = (f"PSI experimental table for {inv.acronym or inv.accession}: {len(runs)} rows "
            f"({', '.join(f'{n} {k}' for k, n in kinds.items())}). Columns: {', '.join(columns[:12])}.")
    if terms and not matching:
        head += f" No row mentions '{q}'; showing the first rows instead."
    body = "\n".join(f"- row {r.source_row or '?'} ({r.run_label}): {_row_text(r.raw)}" for _, _, r in picked)
    text = f"{head}\n{body}"
    first = picked[0][2]
    return {"chunk_id": f"{inv.id}-dataset-context", "section": "Experimental table (dataset)",
            "page": "Not applicable", "locator": f"CSV rows {', '.join(str(r.source_row) for _, _, r in picked if r.source_row)}",
            "source_type": "psi_experimental_table", "verification_status": "psi_experimental_table",
            "source_url": inv.source_url, "excerpt": text[:EXCERPT_CHARS],
            "provenance": {"kind": "resource", "resource": first.source_document_id or "PSI experimental table"}}


def publication_citation(session: Session, inv: Investigation, q: str) -> dict | None:
    docs = session.scalars(select(Document).where(Document.investigation_id == inv.id,
                                                  Document.type == "publication")).all()
    if not docs:
        return None
    terms = _terms(q)
    ranked = sorted(((_score(f"{d.title} {d.authors or ''}", terms), i, d) for i, d in enumerate(docs)),
                    key=lambda x: (-x[0], x[1]))
    matching = [x for x in ranked if x[0] > 0]
    picked = (matching if matching else ranked)[:MAX_PUBLICATIONS]
    lines = []
    for _, _, d in picked:
        year = re.search(r"(19|20)\d{2}", d.publication_date or "")
        bits = [f"\"{d.title}\""]
        if d.authors:
            bits.append(d.authors)
        if year:
            bits.append(year.group(0))
        if d.doi:
            bits.append(f"doi:{d.doi}")
        lines.append("- " + ", ".join(bits))
    head = (f"{len(docs)} publications are listed on the PSI record for {inv.acronym or inv.accession}"
            f" (titles/authors/DOIs only; full text is not indexed). ")
    head += (f"{len(matching)} match '{q}'; the most relevant are:" if terms and matching
             else "None of the titles mention the search term; the first listed are:" if terms
             else "First listed:")
    url = next((d.url for _, _, d in picked if d.url), inv.source_url)
    return {"chunk_id": f"{inv.id}-publication-context", "section": "Publications (PSI record)",
            "page": "Not applicable", "locator": f"{len(picked)} of {len(docs)} publications",
            "source_type": "psi_publication_listing", "verification_status": "psi_publication_listing",
            "source_url": url, "excerpt": (head + "\n" + "\n".join(lines))[:EXCERPT_CHARS],
            "provenance": {"kind": "resource", "resource": "PSI record publication list"},
            "label_override": "Listed on PSI record (publication metadata only)"}


def context_citations(session: Session, inv_ids: list[str], q: str) -> list[dict]:
    """Dataset then publication citation-parts for each investigation, in order."""
    out: list[dict] = []
    for inv_id in inv_ids:
        inv = session.get(Investigation, inv_id)
        if not inv:
            continue
        for build in (dataset_citation, publication_citation):
            c = build(session, inv, q)
            if c:
                out.append({**c, "investigation_id": inv.id, "acronym": inv.acronym})
    return out
