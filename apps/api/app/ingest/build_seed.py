"""Build data/seed/*.v1.json from raw sources saved under data/sources/.

Run:  python -m app.ingest.build_seed
Deterministic: same raw files -> same seed files. Extracts only what is in the sources.
"""
from __future__ import annotations

import csv
import hashlib
import json
import re
from pathlib import Path

from app.config import settings
from app.ingest.curation import (CHALLENGE_LOCAL, CHALLENGE_URL, CURATION, FUTURE_PARTIAL_GRAVITY, SEED_ACCESSIONS)
from app.ingest.table_specs import SPECS
from app.ingest.tagging import MEASUREMENT_RULES, TOPIC_RULES, tag_fields
from app.units import oxygen_pct, pressure_kpa, velocity_m_s

SEED_VERSION = "v1"


def _clean(s: str | None) -> str:
    return re.sub(r"[ \t]+", " ", (s or "").replace("\r", "")).strip()


def _sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _parsed_dict(p, context: str | None, verification: str = "psi_experimental_table") -> dict:
    return {
        "min": p.vmin, "max": p.vmax, "source_text": p.source_text.strip(), "approximate": p.approximate,
        "kind": p.kind, "flags": p.flags, "context": context, "verification_status": verification if p.known else "not_reported",
    }


def _read_csv(path: Path) -> list[dict]:
    with path.open(encoding="utf-8-sig", errors="replace", newline="") as fh:
        return list(csv.DictReader(fh))


def build_test_runs(acc: str, src_dir: Path) -> tuple[list[dict], list[dict]]:
    runs, docs = [], []
    for spec in SPECS.get(acc, []):
        path = src_dir / "psi" / "experimental_tables" / spec["file"]
        if not path.exists():
            continue
        rel = str(path.relative_to(src_dir.parent.parent)) if src_dir.parent.parent in path.parents else str(path)
        docs.append({"title": spec["file"], "type": "psi_experimental_table", "local_path": rel,
                     "url": f"https://psi.nasa.gov/physci/repo/data/investigations/{acc}", "checksum": _sha(path)})
        for i, row in enumerate(_read_csv(path), start=2):  # row 1 is header
            row = {(k or "").strip(): (v or "").strip() for k, v in row.items() if k is not None}
            if not any(row.values()):
                continue
            if spec.get("require") and not row.get(spec["require"].strip()):
                continue
            label = " / ".join(row.get(c.strip(), "") for c in spec["label"]).strip(" /") or f"row {i}"
            material = _clean(row.get(spec["material"].strip()))
            if spec.get("extra_material") and row.get(spec["extra_material"]):
                material = f"{material} (fuel conc. {row[spec['extra_material']]})".strip()
            geometry = None
            if spec.get("geometry"):
                parts = [f"{c.strip()}: {row.get(c.strip())}" for c in spec["geometry"] if row.get(c.strip())]
                geometry = "; ".join(parts) or None
            run = {
                "run_label": label, "material": material or None, "sample_geometry": geometry,
                "flow_direction": row.get(spec["flow_direction"].strip()) if spec.get("flow_direction") else None,
                "gravity_regime": "microgravity",
                "source_file": spec["file"], "source_row": i,
                "row_kind": ("pretest_data" if re.match(r"pre-?test", material or "", flags=re.I) else
                             "test_matrix" if spec.get("matrix") else ("session" if spec.get("row_is_session") else "test")),
                "raw": row,
            }
            o = spec.get("oxygen")
            run["oxygen_pct"] = (_parsed_dict(oxygen_pct(row.get(o["col"].strip()), o["kind"]), o["context"]) if o else None)
            pr = spec.get("pressure")
            if pr:
                p = pressure_kpa(row.get(pr["col"].strip()), pr["unit"])
                if pr.get("approximate") and p.known:
                    p.approximate = True
                run["pressure_kpa"] = _parsed_dict(p, "ambient")
            else:
                run["pressure_kpa"] = None
            af = spec.get("airflow")
            run["airflow_m_s"] = (_parsed_dict(velocity_m_s(row.get(af["col"].strip()), af["unit"]), af["context"]) if af else None)
            meas = []
            for m in spec.get("measurements", []):
                txt = row.get(m["col"].strip(), "")
                from app.units import parse_numeric
                pv = parse_numeric(txt)
                if pv.known and pv.kind == "point":
                    meas.append({"variable": m["variable"], "value": pv.vmin, "value_text": txt, "unit": m["unit"],
                                 "source_column": m["col"].strip(), "verification_status": "psi_experimental_table"})
            run["measurements"] = meas
            runs.append(run)
    return runs, docs


def build() -> dict:
    src_dir = settings.data_dir / "sources"
    investigations = []
    for acc in SEED_ACCESSIONS:
        raw_path = src_dir / "psi" / f"{acc}.json"
        d = json.loads(raw_path.read_text())
        cur = CURATION[acc]
        fields = {
            "objective": _clean(d.get("objective")), "approach": _clean(d.get("approach")),
            "hypothesis": _clean(d.get("hypothesis")), "research_impacts": _clean(d.get("researchImpacts")),
        }
        tag_text = dict(fields)
        tag_text["sub_research_area"] = d.get("subResearchArea") or ""
        topics = tag_fields(tag_text, TOPIC_RULES)
        runs, table_docs = build_test_runs(acc, src_dir)
        header_text = " ".join(sorted({k for r in runs for k in r["raw"].keys()}))
        mtypes = tag_fields({**fields, "experimental_table_headers": header_text}, MEASUREMENT_RULES)
        pubs = []
        for p in d.get("publications") or []:
            title = _clean(p.get("title"))
            if not title:
                continue
            doi = _clean(p.get("doi"))
            pubs.append({"title": title, "doi": doi or None, "url": f"https://doi.org/{doi}" if doi else None,
                         "authors": _clean(p.get("authorList")) or None, "type": "publication (listed in PSI metadata)"})
        url = f"https://psi.nasa.gov/physci/repo/data/investigations/{acc}"
        investigations.append({
            "id": acc.lower(), "accession": acc, "acronym": d.get("investigationAcronym"), "title": _clean(d.get("title")),
            "family": cur["family"], **fields,
            "fuel_class": cur["fuel_class"], "fuel_class_basis": cur["basis"], "fuel_class_note": cur.get("fuel_class_note"),
            "solid_emulation": bool(cur.get("solid_emulation")), "partial_gravity_mimic": bool(cur.get("partial_gravity_mimic")),
            "hardware": _clean(d.get("experimentHardware")) or None, "hardware_link": _clean(d.get("experimentHardwareLink")) or None,
            "flight_platform": _clean(d.get("flightProgram")) or None,
            "project_type": d.get("projectType"),
            "gravity_regime": "microgravity" if (d.get("projectType") or "").lower().startswith("microgravity") else "unknown",
            "gravity_regime_basis": f"PSI projectType = '{d.get('projectType')}'",
            "sub_research_area": d.get("subResearchArea") or None,
            "doi": d.get("doi") or None, "source_url": url,
            "api_url": f"https://psi.nasa.gov/geode-py/ws/repo/investigations/{acc}",
            "license": d.get("licenseName") or None, "release_date": d.get("releaseDate") or None,
            "investigation_start": d.get("investigationStartDate") or None, "investigation_end": d.get("investigationEndDate") or None,
            "raw_source_path": f"data/sources/psi/{acc}.json", "raw_source_sha256": _sha(raw_path),
            "topics": topics, "measurement_types": mtypes,
            "brief_facts": [{"text": t, "verification_status": "challenge_brief", "citation_url": CHALLENGE_URL,
                             "local_copy": CHALLENGE_LOCAL} for t in cur.get("brief_facts", [])],
            "data_availability": {
                "experimental_tables": [x["file_name"] for x in d.get("experimentalTable") or []],
                "total_file_size_bytes_reported_by_psi": d.get("totalFileSize"),
                "note": "Raw data files are listed by PSI; only experimental tables were downloaded for this seed.",
            },
            "publications": pubs, "documents": table_docs, "test_runs": runs,
        })
    accessed = (src_dir / "psi" / "ACCESSED_AT.txt").read_text().strip() if (src_dir / "psi" / "ACCESSED_AT.txt").exists() else None
    seed = {
        "seed_version": SEED_VERSION, "psi_accessed_at": accessed,
        "provenance": "Built by app.ingest.build_seed from raw PSI API JSON + PSI experimental table CSVs in data/sources/psi/.",
        "investigations": investigations,
        "partial_gravity_gap": {**FUTURE_PARTIAL_GRAVITY, "verification_status": "challenge_brief", "citation_url": CHALLENGE_URL},
    }
    return seed


def challenge_chunks() -> list[dict]:
    """Paragraph-level chunks of the official challenge text (verification_status=challenge_brief)."""
    path = settings.data_dir / "sources" / "spaceapps_challenge_details.md"
    text = path.read_text()
    body = text.split("---", 1)[1] if "---" in text else text
    chunks, section = [], "Overview"
    for block in re.split(r"\n\s*\n", body):
        b = block.strip()
        if not b:
            continue
        if b.startswith("## "):
            section = b[3:].strip()
            continue
        if b.startswith("#") or b.startswith("[") or len(b) < 60:
            continue
        if re.match(r"^- ", b):
            # split bullet lists at top-level bullets, keeping nested sub-bullets with their parent
            items = re.split(r"\n(?=- )", b)
            for it in items:
                it = re.sub(r"\s+", " ", it.lstrip("- ").strip())
                if len(it) >= 60:
                    chunks.append({"section": section, "text": it})
            continue
        chunks.append({"section": section, "text": re.sub(r"\s+", " ", b)})
    return [{"id": f"brief-{i:02d}", **c, "verification_status": "challenge_brief", "source_url": CHALLENGE_URL,
             "local_path": "data/sources/spaceapps_challenge_details.md"} for i, c in enumerate(chunks)]


def main() -> None:
    out = settings.data_dir / "seed"
    out.mkdir(parents=True, exist_ok=True)
    seed = build()
    (out / f"investigations.{SEED_VERSION}.json").write_text(json.dumps(seed, indent=1, ensure_ascii=False))
    (out / f"challenge_brief_chunks.{SEED_VERSION}.json").write_text(json.dumps(challenge_chunks(), indent=1, ensure_ascii=False))
    n_runs = sum(len(i["test_runs"]) for i in seed["investigations"])
    print(f"wrote {len(seed['investigations'])} investigations, {n_runs} test runs")


if __name__ == "__main__":
    main()
