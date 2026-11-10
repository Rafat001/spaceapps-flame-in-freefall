"""Load versioned seed JSON into SQLite and (re)build lexical + vector indexes.

Run:  python -m app.ingest            (idempotent: drops and recreates tables)
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone

from app.ai.providers.embeddings import get_embedder
from app.config import settings
from app.db import Base, SessionLocal, engine
from app.models import Chunk, Document, Investigation, Measurement, TestRun
from app.retrieval import lexical
from app.retrieval.vector import VectorIndex
from app.units import sig

SECTION_LABELS = {"objective": "Objectives", "approach": "Approach", "hypothesis": "Hypothesis",
                  "research_impacts": "Research impacts / Earth benefits"}


def split_text(t: str, size: int = 900, overlap: int = 150) -> list[str]:
    t = re.sub(r"\s+", " ", t).strip()
    if len(t) <= size:
        return [t] if t else []
    out, i = [], 0
    while i < len(t):
        j = min(len(t), i + size)
        if j < len(t):
            k = t.rfind(". ", i + size // 2, j)
            j = k + 1 if k > 0 else j
        out.append(t[i:j].strip())
        if j >= len(t):
            break
        i = max(j - overlap, i + 1)
    return out


def _cond_summary(runs: list[dict], key: str, unit: str) -> str:
    vals = [r[key] for r in runs if r.get(key) and r[key]["min"] is not None]
    if not vals:
        return f"{key.split('_')[0]}: Not reported in the PSI experimental table"
    lo, hi = min(v["min"] for v in vals), max(v["max"] for v in vals)
    ctx = sorted({v.get("context") or "" for v in vals})
    return f"{key.split('_')[0]}: {sig(lo)}-{sig(hi)} {unit} across {len(vals)} of {len(runs)} rows ({'; '.join(c for c in ctx if c)})"


def table_summary(inv: dict) -> str | None:
    runs = inv["test_runs"]
    if not runs:
        return None
    mats = sorted({(r["material"] or "")[:60] for r in runs if r.get("material")})
    parts = [f"PSI experimental table summary for {inv['acronym']} ({inv['accession']}): {len(runs)} rows.",
             f"Materials/fuels listed: {', '.join(mats[:15])}{' ...' if len(mats) > 15 else ''}.",
             _cond_summary(runs, "oxygen_pct", "% O2 by volume") + ".",
             _cond_summary(runs, "pressure_kpa", "kPa") + ".",
             _cond_summary(runs, "airflow_m_s", "m/s") + ".",
             "Values are as listed in the PSI table (source text kept per row); ranges here are normalised for search."]
    return " ".join(parts)


def load(seed_path=None, brief_path=None, build_vectors: bool = True) -> dict:
    seed_path = seed_path or settings.data_dir / "seed" / "investigations.v1.json"
    brief_path = brief_path or settings.data_dir / "seed" / "challenge_brief_chunks.v1.json"
    seed = json.loads(seed_path.read_text())
    brief = json.loads(brief_path.read_text())
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    s = SessionLocal()
    n_chunks = 0
    for inv in seed["investigations"]:
        row = Investigation(
            id=inv["id"], accession=inv["accession"], acronym=inv["acronym"], title=inv["title"], family=inv["family"],
            objective=inv["objective"], approach=inv["approach"], hypothesis=inv["hypothesis"],
            research_impacts=inv["research_impacts"], fuel_class=inv["fuel_class"], fuel_class_basis=inv["fuel_class_basis"],
            fuel_class_note=inv.get("fuel_class_note"), solid_emulation=inv["solid_emulation"],
            partial_gravity_mimic=inv["partial_gravity_mimic"], hardware=inv["hardware"], hardware_link=inv["hardware_link"],
            flight_platform=inv["flight_platform"], project_type=inv["project_type"], gravity_regime=inv["gravity_regime"],
            gravity_regime_basis=inv["gravity_regime_basis"], sub_research_area=inv["sub_research_area"], doi=inv["doi"],
            source_url=inv["source_url"], api_url=inv["api_url"], license=inv["license"], release_date=inv["release_date"],
            investigation_start=inv["investigation_start"], investigation_end=inv["investigation_end"],
            last_checked_at=seed.get("psi_accessed_at") or now, raw_source_path=inv["raw_source_path"],
            topics=inv["topics"], measurement_types=inv["measurement_types"], brief_facts=inv["brief_facts"],
            data_availability=inv["data_availability"])
        s.add(row)
        meta_doc = Document(id=f"{inv['id']}-psi-metadata", investigation_id=inv["id"], title=f"PSI investigation record {inv['accession']}",
                            url=inv["source_url"], doi=inv["doi"], type="psi_metadata", local_path=inv["raw_source_path"])
        s.add(meta_doc)
        ci = 0

        def add_chunk(doc_id, text_, section, status, url):
            nonlocal ci, n_chunks
            s.add(Chunk(id=f"{inv['id']}-c{ci:03d}", document_id=doc_id, investigation_id=inv["id"], text=text_,
                        section=section, page=None, source_url=url, verification_status=status))
            ci += 1
            n_chunks += 1

        head = (f"{inv['acronym']} — {inv['title']} ({inv['accession']}). Family: {inv['family']}. Hardware: "
                f"{inv['hardware'] or 'Not reported'}. Platform: {inv['flight_platform'] or 'Not reported'}. "
                f"Sub-area: {inv['sub_research_area'] or 'Not reported'}. Project type: {inv['project_type']}.")
        add_chunk(meta_doc.id, head, "Overview", "psi_metadata", inv["source_url"])
        for key, label in SECTION_LABELS.items():
            for part in split_text(inv.get(key) or ""):
                add_chunk(meta_doc.id, f"[{inv['acronym']}] {part}", label, "psi_metadata", inv["source_url"])
        if inv["publications"]:
            lines = [f"{p['title']}" + (f" (doi:{p['doi']})" if p.get("doi") else "") for p in inv["publications"]]
            for part in split_text(f"[{inv['acronym']}] Publications listed in PSI: " + "; ".join(lines), size=1200, overlap=0):
                add_chunk(meta_doc.id, part, "Publications (titles as listed by PSI)", "psi_metadata", inv["source_url"])
        for n, p in enumerate(inv["publications"]):
            s.add(Document(id=f"{inv['id']}-pub{n:02d}", investigation_id=inv["id"], title=p["title"], url=p.get("url"),
                           doi=p.get("doi"), authors=p.get("authors"), type="publication"))
        doc_ids = {}
        for n, d in enumerate(inv["documents"]):
            did = f"{inv['id']}-table{n}"
            doc_ids[d["title"]] = did
            s.add(Document(id=did, investigation_id=inv["id"], title=d["title"], url=d["url"], type=d["type"],
                           local_path=d["local_path"], checksum=d["checksum"]))
        summ = table_summary(inv)
        if summ and doc_ids:
            add_chunk(next(iter(doc_ids.values())), summ, "Experimental table summary", "psi_experimental_table", inv["source_url"])
        for r in inv["test_runs"]:
            o, p, a = r.get("oxygen_pct") or {}, r.get("pressure_kpa") or {}, r.get("airflow_m_s") or {}
            tr = TestRun(
                investigation_id=inv["id"], run_label=r["run_label"], row_kind=r["row_kind"], material=r["material"],
                sample_geometry=r["sample_geometry"], flow_direction=r["flow_direction"], gravity_regime=r["gravity_regime"],
                oxygen_pct_min=o.get("min"), oxygen_pct_max=o.get("max"), oxygen_source_text=o.get("source_text"),
                oxygen_context=o.get("context"), oxygen_meta=o or None,
                pressure_kpa_min=p.get("min"), pressure_kpa_max=p.get("max"), pressure_source_text=p.get("source_text"),
                pressure_meta=p or None,
                airflow_m_s_min=a.get("min"), airflow_m_s_max=a.get("max"), airflow_source_text=a.get("source_text"),
                airflow_context=a.get("context"), airflow_meta=a or None,
                source_document_id=doc_ids.get(r["source_file"]), source_row=r["source_row"], raw=r["raw"])
            for m in r["measurements"]:
                tr.measurements.append(Measurement(variable=m["variable"], value=m["value"], value_text=m["value_text"],
                                                   unit=m["unit"], source_column=m["source_column"],
                                                   source_document_id=doc_ids.get(r["source_file"]),
                                                   verification_status=m["verification_status"]))
            s.add(tr)
    bdoc = Document(id="challenge-brief", investigation_id=None, title="NASA Space Apps 2026 — Flame in Freefall (official details)",
                    url=brief[0]["source_url"] if brief else None, type="challenge_brief",
                    local_path="data/sources/spaceapps_challenge_details.md")
    s.add(bdoc)
    for b in brief:
        s.add(Chunk(id=b["id"], document_id=bdoc.id, investigation_id=None, text=b["text"], section=b["section"],
                    page=None, source_url=b["source_url"], verification_status="challenge_brief"))
        n_chunks += 1
    s.commit()
    lexical.rebuild(s)
    info = {"investigations": len(seed["investigations"]), "chunks": n_chunks,
            "test_runs": s.query(TestRun).count(), "measurements": s.query(Measurement).count()}
    if build_vectors:
        embedder, status = get_embedder(settings)
        chunks = s.query(Chunk).order_by(Chunk.id).all()
        vecs = embedder.embed([c.text for c in chunks])
        for i, c in enumerate(chunks):
            c.embedding_id = i
        s.commit()
        backend = VectorIndex(settings.index_dir).build([c.id for c in chunks], vecs, embedder.signature, settings.vector_backend)
        info.update({"embedder": status, "vector_backend": backend})
    s.close()
    return info


def main() -> None:
    print(json.dumps(load(), indent=1))


if __name__ == "__main__":
    main()
