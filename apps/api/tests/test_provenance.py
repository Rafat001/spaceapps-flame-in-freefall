"""Scope rule: every indexed item comes from an official resource (or a reference one of them names)."""
from app.models import Chunk, Document, Investigation

ALLOWED_KINDS = {"resource", "reference", "user_supplied_guide"}


def _check(p, where):
    assert isinstance(p, dict) and p, f"{where}: missing provenance"
    assert p.get("kind") in ALLOWED_KINDS, f"{where}: bad kind {p.get('kind')}"
    if p["kind"] == "reference":
        assert p.get("reference_of"), f"{where}: reference without parent resource"
    else:
        assert p.get("resource"), f"{where}: no resource named"


def test_every_chunk_has_provenance_and_citation(session):
    chunks = session.query(Chunk).all()
    assert len(chunks) > 1000
    for c in chunks:
        _check(c.provenance, c.id)
        assert c.source_url and c.source_url.startswith("https://"), c.id
        assert c.locator, f"{c.id}: no page / row / timestamp / field locator"


def test_every_investigation_and_document_has_provenance(session):
    for i in session.query(Investigation).all():
        _check(i.provenance, i.id)
    for d in session.query(Document).all():
        _check(d.provenance, d.id)


def test_corpus_covers_every_official_resource(session):
    types = {t for (t,) in session.query(Chunk.source_type).distinct()}
    for t in ("psi_metadata", "psi_experimental_table", "nasa_fact_sheet", "nasa_guide", "challenge_brief",
              "nasa_history", "nasa_spinoff", "guidance_video", "nasa_program_page"):
        assert t in types, t
    pdf_pages = [c for c in session.query(Chunk).filter(Chunk.source_type.in_(["nasa_fact_sheet", "nasa_guide"]))]
    assert all(c.locator.startswith("p. ") and "#page=" in c.source_url for c in pdf_pages)
    vid = session.query(Chunk).filter_by(source_type="guidance_video").all()
    assert all(c.locator.startswith("[") and "auto-captions" in (c.provenance.get("note") or "").lower() for c in vid)
