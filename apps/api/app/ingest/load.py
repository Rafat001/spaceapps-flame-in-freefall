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
        # overlap: restart at the first sentence boundary inside the last `overlap` chars
        b = t.find(". ", max(j - overlap, i + 1), j)
        i = b + 2 if b != -1 else j
    return out


def _cond_summary(runs: list[dict], key: str, unit: str) -> str:
    vals = [r[key] for r in runs if r.get(key) and r[key]["min"] is not None]
    if not vals:
        return f"{key.split('_')[0]}: Not reported in the PSI experimental table"
    lo, hi = min(v["min"] for v in vals), max(v["max"] for v in vals)
    ctx = sorted({v.get("context") or "" for v in vals})
    return f"{key.split('_')[0]}: {sig(lo)}-{sig(hi)} {unit} across {len(vals)} of {len(runs)} rows ({'; '.join(c for c in ctx if c)})"


def table_summary(inv: dict) -> str | None:
    from app.ingest.table_specs import COUNTABLE_KINDS

    runs = [r for r in inv["test_runs"] if r["row_kind"] in COUNTABLE_KINDS]
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


PSI_LABEL = "PSI Data Repository: Combustion Science"


def row_chunk_text(acr: str, acc: str, r: dict) -> str:
    cells = "; ".join(f"{k}: {v}" for k, v in r["raw"].items() if v)
    sub = f" {r['subtable']}" if r.get("subtable") else ""
    flags = " ".join(f"[flag: {f['code']}]" for f in r.get("flags", []))
    return f"[{acr}{sub} table, CSV record {r['source_row']}, {r['row_kind']}] {cells} {flags}".strip()


def load(seed_path=None, brief_path=None, build_vectors: bool = True) -> dict:
    from app.ingest.corpus import doc_chunks, transcript_chunks
    from app.ingest.official_sources import OFFICIAL_DOCS, VIDEO
    from app.services.lenses import tag_lenses

    seed_path = seed_path or settings.data_dir / "seed" / "investigations.v2.json"
    brief_path = brief_path or settings.data_dir / "seed" / "challenge_brief_chunks.v2.json"
    seed = json.loads(seed_path.read_text())
    brief = json.loads(brief_path.read_text())
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    s = SessionLocal()
    n_chunks = 0
    for inv in seed["investigations"]:
        prov = inv.get("provenance") or {}
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
            data_availability=inv["data_availability"], platform=inv.get("platform"), platform_note=inv.get("platform_note"),
            is_ground=inv.get("is_ground", False), version=inv.get("version") or {}, relationships=inv.get("relationships") or [],
            files=inv.get("files") or {}, images=inv.get("images") or [], table_flags=inv.get("table_flags") or [],
            provenance=prov)
        row.lenses = tag_lenses(inv)
        s.add(row)
        meta_doc = Document(id=f"{inv['id']}-psi-metadata", investigation_id=inv["id"], title=f"PSI investigation record {inv['accession']}",
                            url=inv["source_url"], doi=inv["doi"], type="psi_metadata", local_path=inv["raw_source_path"],
                            provenance=prov)
        s.add(meta_doc)
        ci = 0

        def add_chunk(doc_id, text_, section, status, url, locator, provenance, prefix="c"):
            nonlocal ci, n_chunks
            s.add(Chunk(id=f"{inv['id']}-{prefix}{ci:04d}", document_id=doc_id, investigation_id=inv["id"], text=text_,
                        section=section, page=None, source_url=url, verification_status=status,
                        source_type=status, locator=locator, provenance=provenance))
            ci += 1
            n_chunks += 1

        head = (f"{inv['acronym']} — {inv['title']} ({inv['accession']}). Family: {inv['family']}. Hardware: "
                f"{inv['hardware'] or 'Not reported'}. Platform: {inv['flight_platform'] or 'Not reported'}. "
                f"Sub-area: {inv['sub_research_area'] or 'Not reported'}. Project type: {inv['project_type']}.")
        add_chunk(meta_doc.id, head, "Overview", "psi_metadata", inv["source_url"], "record fields", prov)
        for key, lab in SECTION_LABELS.items():
            for part in split_text(inv.get(key) or ""):
                add_chunk(meta_doc.id, f"[{inv['acronym']}] {part}", lab, "psi_metadata", inv["source_url"], f"field: {lab}", prov)
        for r in inv.get("relationships") or []:
            if r.get("quote"):
                add_chunk(meta_doc.id, f"[{inv['acronym']}] Related PSI investigation {r['to_acronym']} ({r['to']}): {r['quote']}",
                          "Related investigations", "psi_metadata", inv["source_url"], "field: related_glds", prov)
        if inv["publications"]:
            lines = [f"{p['title']}" + (f" (doi:{p['doi']})" if p.get("doi") else "") for p in inv["publications"]]
            pprov = {"kind": "reference", "reference_of": f"PSI record {inv['accession']}", **prov}
            for part in split_text(f"[{inv['acronym']}] Publications listed in PSI: " + "; ".join(lines), size=1200, overlap=0):
                add_chunk(meta_doc.id, part, "Publications (titles as listed by PSI)", "psi_metadata", inv["source_url"],
                          "field: publications", pprov)
        for n, p in enumerate(inv["publications"]):
            s.add(Document(id=f"{inv['id']}-pub{n:02d}", investigation_id=inv["id"], title=p["title"], url=p.get("url"),
                           doi=p.get("doi"), authors=p.get("authors"), type="publication", provenance=p.get("provenance")))
        doc_ids = {}
        for n, d in enumerate(inv["documents"]):
            did = f"{inv['id']}-table{n}"
            doc_ids[d["title"]] = did
            s.add(Document(id=did, investigation_id=inv["id"], title=d["title"], url=d["url"], type=d["type"],
                           local_path=d["local_path"], checksum=d["checksum"], provenance=prov))
        summ = table_summary(inv)
        if summ and doc_ids:
            add_chunk(next(iter(doc_ids.values())), summ, "Experimental table summary", "psi_experimental_table",
                      inv["source_url"], "experimental table (all rows)", prov)
        ri = 0
        for r in inv["test_runs"]:
            o, p, a = r.get("oxygen_pct") or {}, r.get("pressure_kpa") or {}, r.get("airflow_m_s") or {}
            tr = TestRun(
                investigation_id=inv["id"], run_label=r["run_label"], row_kind=r["row_kind"], material=r["material"],
                sample_geometry=r["sample_geometry"], flow_direction=r["flow_direction"], gravity_regime=r["gravity_regime"],
                oxygen_pct_min=o.get("min"), oxygen_pct_max=o.get("max"), oxygen_source_text=o.get("source_text"),
                oxygen_context=o.get("context"), oxygen_meta=o or None, oxygen_is_stream=bool(o.get("stream")),
                pressure_kpa_min=p.get("min"), pressure_kpa_max=p.get("max"), pressure_source_text=p.get("source_text"),
                pressure_meta=p or None,
                airflow_m_s_min=a.get("min"), airflow_m_s_max=a.get("max"), airflow_source_text=a.get("source_text"),
                airflow_context=a.get("context"), airflow_meta=a or None,
                source_document_id=doc_ids.get(r["source_file"]), source_row=r["source_row"], raw=r["raw"],
                subtable=r.get("subtable"), source_file=r["source_file"], parent_row=r.get("parent_row"),
                material_normalized=r.get("material_normalized"), flags=r.get("flags") or [], diluents=r.get("diluents") or {})
            for m in r["measurements"]:
                tr.measurements.append(Measurement(variable=m["variable"], value=m["value"], value_text=m["value_text"],
                                                   unit=m["unit"], source_column=m["source_column"],
                                                   source_document_id=doc_ids.get(r["source_file"]),
                                                   verification_status=m["verification_status"]))
            s.add(tr)
            s.add(Chunk(id=f"{inv['id']}-r{ri:04d}", document_id=doc_ids.get(r["source_file"]) or meta_doc.id,
                        investigation_id=inv["id"], text=row_chunk_text(inv["acronym"], inv["accession"], r),
                        section=f"Experimental table row ({r['source_file']})", page=None, source_url=inv["source_url"],
                        verification_status="psi_experimental_table", source_type="psi_experimental_table",
                        locator=f"CSV record {r['source_row']}", provenance=prov))
            ri += 1
            n_chunks += 1
    # challenge brief -----------------------------------------------------------------------
    bdoc = Document(id="challenge-brief", investigation_id=None, title="NASA Space Apps 2026 — Flame in Freefall (official details)",
                    url=brief[0]["source_url"] if brief else None, type="challenge_brief",
                    local_path="data/sources/spaceapps_challenge_details.md", provenance=brief[0]["provenance"] if brief else None)
    s.add(bdoc)
    for k, b in enumerate(brief, 1):
        s.add(Chunk(id=b["id"], document_id=bdoc.id, investigation_id=None, text=b["text"], section=b["section"],
                    page=None, source_url=b["source_url"], verification_status="challenge_brief", source_type="challenge_brief",
                    locator=f"section: {b['section']}", provenance=b["provenance"]))
        n_chunks += 1
    # official documents + guidance video ---------------------------------------------------------
    acc_to_id = {i["accession"]: i["id"] for i in seed["investigations"]}
    for d in OFFICIAL_DOCS:
        s.add(Document(id=d["id"], investigation_id=None, title=d["title"], url=d["url"], type=d["source_type"],
                       local_path=f"data/sources/official/{'pdf' if d['kind'] == 'pdf' else 'html'}/{d['id']}.{d['kind']}",
                       provenance={"kind": "resource", "resource": d["title"], "resource_url": d["url"]}))
    s.add(Document(id="guidance-video", investigation_id=None, title=VIDEO["title"], url=VIDEO["url"], type="guidance_video",
                   local_path=VIDEO["transcript"], provenance={"kind": "resource", "resource": "Official guidance video",
                                                               "resource_url": VIDEO["url"]}))
    for c in doc_chunks() + transcript_chunks():
        inv_id = acc_to_id.get(c["accessions"][0]) if len(c["accessions"]) == 1 else None
        s.add(Chunk(id=c["id"], document_id=c["document_id"], investigation_id=inv_id, text=c["text"], section=c["section"],
                    page=c["page"], source_url=c["source_url"], verification_status=c["verification_status"],
                    source_type=c["source_type"], locator=c["locator"], provenance=c["provenance"]))
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
