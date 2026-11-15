"""Build data/seed/*.v2.json from raw sources saved under data/sources/.

Run:  python -m app.ingest.build_seed
Deterministic: same raw files -> same seed files. Extracts only what is in the sources.

Scope rule: every record, row and chunk comes from an official resource-tab link (or the challenge brief /
guidance video) or from a reference that those resources list. Each carries a `provenance` block.
"""
from __future__ import annotations

import csv
import hashlib
import io
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import quote

from app.config import settings
from app.ingest.analyzed import adjacent_records, analyzed_block
from app.ingest.curation import (CHALLENGE_LOCAL, CHALLENGE_URL, CURATION, FUTURE_PARTIAL_GRAVITY, GROUND_ACCESSIONS,
                                 MATERIAL_ALIASES, ROW_FLAG_RULES, SEED_ACCESSIONS)
from app.ingest.table_specs import SPECS
from app.ingest.tagging import MEASUREMENT_RULES, TOPIC_RULES, tag_fields
from app.units import oxygen_pct, parse_numeric, pressure_kpa, velocity_m_s

SEED_VERSION = "v2"
PSI_SEARCH_URL = "https://psi.nasa.gov/physci/repo/search?q=combustion"
PSI_PROV = {"kind": "resource", "resource": "PSI Data Repository: Combustion Science", "resource_url": PSI_SEARCH_URL}


def _clean(s: str | None) -> str:
    return re.sub(r"[ \t]+", " ", (s or "").replace("\r", "")).strip()


def _sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def psi_download_url(acc: str, file_name: str) -> str:
    return f"https://psi.nasa.gov/geode-py/ws/studies/{acc}/download?file={quote(file_name)}"


def _parsed_dict(p, context: str | None, verification: str = "psi_experimental_table") -> dict:
    return {
        "min": p.vmin, "max": p.vmax, "source_text": p.source_text.strip(), "approximate": p.approximate,
        "kind": p.kind, "flags": p.flags, "context": context, "verification_status": verification if p.known else "not_reported",
    }


def read_table(path: Path, encoding: str | None = None) -> tuple[list[str], list[tuple[int, dict]]]:
    """(header, [(csv_record_number, row)]) with blank rows skipped. Record 1 is the header.
    FLEX is cp1252 (0x96 en dashes); decoding it properly keeps '–' instead of U+FFFD."""
    raw = path.read_bytes()
    text = raw.decode(encoding) if encoding else raw.decode("utf-8-sig")
    reader = csv.reader(io.StringIO(text))
    rows = list(reader)
    header = [h.strip() for h in rows[0]]
    out = []
    for i, r in enumerate(rows[1:], start=2):
        if not any(c.strip() for c in r):
            continue
        d = {}
        for k, v in zip(header, r):
            if k and k not in d:
                d[k] = v.strip()
        out.append((i, d))
    return header, out


def _oxygen_from_text(text: str) -> "object":
    """'~21% O2 with N2', '~30% and ~21% O2 with He' -> set of percents (approximate)."""
    from app.units import Parsed

    vals = [float(x) for x in re.findall(r"~?\s*(\d+(?:\.\d+)?)\s*%", text or "")]
    if not vals or not re.search(r"O2", text or ""):
        return Parsed(None, None, text or "", flags=["unparsed"])
    return Parsed(min(vals), max(vals), text, approximate="~" in text, kind="point" if len(set(vals)) == 1 else "set")


_FORMULA = re.compile(r"\b(C\d*H|N)(\d+)\b")


def _autofill_template(s: str) -> list[tuple[str, int, str]]:
    return [(m.group(1), int(m.group(2)), _FORMULA.sub("#", s)) for m in _FORMULA.finditer(s or "")]


def _flag(code: str, message: str, column: str | None = None, suggestion: str | None = None, rule: str = "generic") -> dict:
    return {"code": code, "column": column, "message": message, "suggestion": suggestion,
            "rule": "Curator rule" if rule == "curator" else "Automatic check"}


def build_test_runs(acc: str, src_dir: Path) -> tuple[list[dict], list[dict], list[dict]]:
    runs, docs, table_flags = [], [], []
    for spec in SPECS.get(acc, []):
        path = src_dir / "psi" / "experimental_tables" / spec["file"]
        if not path.exists():
            continue
        rel = f"data/sources/psi/experimental_tables/{spec['file']}"
        docs.append({"title": spec["file"], "type": "psi_experimental_table", "local_path": rel,
                     "url": f"https://psi.nasa.gov/physci/repo/data/investigations/{acc}",
                     "download_url": psi_download_url(acc, spec["file"]), "checksum": _sha(path),
                     "subtable": spec.get("subtable")})
        header, rows = read_table(path, spec.get("encoding"))
        for g in spec.get("garbled_headers", []):
            if g in header:
                table_flags.append(_flag("header_garbled", f"Header '{g}' has a lost character in the PSI file "
                                         "(likely 'µ-g', i.e. microgravity). Shown verbatim.", g))
        table_runs: list[dict] = []
        prev_main: dict | None = None
        for i, row in rows:
            label = " / ".join(row.get(c.strip(), "") for c in spec["label"]).strip(" /") or f"row {i}"
            mcol = spec.get("material")
            material = _clean(row.get(mcol.strip())) if mcol else spec.get("fixed_material")
            cont_col = spec.get("continuation_if_blank")
            if cont_col and not row.get(cont_col) and prev_main is not None:
                kind = "continuation"
            elif spec.get("note_prefix") and label.lower().startswith(spec["note_prefix"].lower()):
                kind = "note"
            elif re.match(r"pre-?test", material or "", flags=re.I):
                kind = "pretest_data"
            elif spec.get("data_index"):
                kind = "data_index"
            elif spec.get("matrix"):
                kind = "test_matrix"
            elif spec.get("row_is_session"):
                kind = "session"
            else:
                kind = "test"
            if spec.get("extra_material") and row.get(spec["extra_material"]) and kind != "continuation":
                material = f"{material} (fuel conc. {row[spec['extra_material']]})".strip()
            geometry = None
            if spec.get("geometry"):
                parts = [f"{c.strip()}: {row.get(c.strip())}" for c in spec["geometry"] if row.get(c.strip())]
                geometry = "; ".join(parts) or None
            run = {
                "run_label": label, "material": material or None, "sample_geometry": geometry,
                "flow_direction": row.get(spec["flow_direction"].strip()) if spec.get("flow_direction") else None,
                "gravity_regime": "microgravity", "subtable": spec.get("subtable"),
                "source_file": spec["file"], "source_row": i, "row_kind": kind, "raw": row, "flags": [],
                "parent_row": prev_main["source_row"] if kind == "continuation" and prev_main else None,
            }
            o = spec.get("oxygen")
            if o and kind not in ("note", "continuation", "pretest_data"):
                p = _oxygen_from_text(row.get(o["col"].strip())) if o["kind"] == "text_pct" else oxygen_pct(row.get(o["col"].strip()), o["kind"])
                run["oxygen_pct"] = _parsed_dict(p, o["context"])
                run["oxygen_pct"]["stream"] = bool(o.get("stream"))
            else:
                run["oxygen_pct"] = None
            pr = spec.get("pressure")
            if pr and kind not in ("note", "continuation", "pretest_data"):
                p = pressure_kpa(row.get(pr["col"].strip()), pr["unit"])
                if pr.get("approximate") and p.known:
                    p.approximate = True
                run["pressure_kpa"] = _parsed_dict(p, "ambient")
            else:
                run["pressure_kpa"] = None
            af = spec.get("airflow")
            run["airflow_m_s"] = (_parsed_dict(velocity_m_s(row.get(af["col"].strip()), af["unit"]), af["context"])
                                  if af and kind not in ("note", "continuation", "pretest_data") else None)
            dil = {}
            for gas, col in (spec.get("diluents") or {}).items():
                pv = parse_numeric(row.get(col))
                dil[gas] = {"value": pv.vmin if pv.known and pv.kind == "point" else None, "source_text": row.get(col, ""),
                            "column": col}
            if acc == "PSI-23":  # diluent named in the Atmosphere text ('with N2' / 'with He')
                atm = row.get("Atmosphere*", "")
                for gas in ("He", "N2"):
                    if re.search(rf"\b{gas}\b", atm):
                        dil[gas] = {"value": None, "source_text": atm, "column": "Atmosphere*", "present": True}
            run["diluents"] = dil
            meas = []
            for m in spec.get("measurements", []):
                txt = row.get(m["col"].strip(), "")
                pv = parse_numeric(txt)
                if pv.known and pv.kind == "point":
                    meas.append({"variable": m["variable"], "value": pv.vmin, "value_text": txt, "unit": m["unit"],
                                 "source_column": m["col"].strip(), "verification_status": "psi_experimental_table"})
            run["measurements"] = meas
            # material normalisation (verbatim never changes)
            norm, mflags = None, []
            for a in MATERIAL_ALIASES:
                if a["accessions"] and acc not in a["accessions"]:
                    continue
                if material and re.search(a["pattern"], material, flags=re.I):
                    norm = a["normalized"]
                    if a["note"]:
                        mflags.append(_flag("alias_rule", a["note"], mcol, a["normalized"], rule="curator"))
                    break
            run["material_normalized"] = norm
            if mcol and not material and kind in ("test", "session"):
                mflags.append(_flag("blank_in_source", "Material cell is blank in the PSI table: Not reported. "
                                    "Not inferred from neighbouring rows.", mcol))
            run["flags"].extend(mflags)
            for key in ("oxygen_pct", "pressure_kpa", "airflow_m_s"):
                c = run.get(key)
                if c and c["flags"]:
                    msg = {"suspicious_percent_format": "Cell reads '{t}' (spreadsheet percent-format artifact). Shown verbatim; not used as a number.",
                           "implausible_pressure_left_unknown": "Cell reads '{t}', physically implausible; excluded from numeric filters.",
                           "negative_velocity_left_unknown": "Negative flow value '{t}' (sign convention unclear); excluded from numeric filters.",
                           "out_of_range_fraction": "Value '{t}' is outside 0–1 for a mole fraction; left unknown.",
                           }.get(c["flags"][0])
                    if msg:
                        run["flags"].append(_flag("implausible_value", msg.format(t=c["source_text"]),
                                                  {"oxygen_pct": (o or {}).get("col"), "pressure_kpa": (pr or {}).get("col"),
                                                   "airflow_m_s": (af or {}).get("col")}[key]))
            for dc in spec.get("date_cols", []):
                v = row.get(dc, "")
                yr = re.search(r"(\d{4})\s*$", v)
                if "`" in v or (yr and not 1990 <= int(yr.group(1)) <= 2026):
                    run["flags"].append(_flag("date_anomaly", f"Date cell reads '{v}' (typo in source). Shown verbatim.", dc))
            if any("\u2013" in v for v in row.values()) and spec.get("encoding") == "cp1252":
                run["flags"].append(_flag("encoding_decoded", "Source uses Windows-1252 dashes ('–', no value); decoded "
                                          "properly instead of showing a replacement character."))
            if kind != "continuation":
                prev_main = run
            table_runs.append(run)
        # table-level checks ------------------------------------------------------------
        idc = spec.get("id_col")
        if idc:
            cnt = Counter(r["raw"].get(idc) for r in table_runs if r["row_kind"] != "continuation" and r["raw"].get(idc))
            for r in table_runs:
                v = r["raw"].get(idc)
                if v and cnt[v] > 1 and r["row_kind"] != "continuation":
                    others = [x["source_row"] for x in table_runs if x["raw"].get(idc) == v and x is not r]
                    r["flags"].append(_flag("duplicate_identifier", f"'{v}' also appears at CSV record(s) "
                                            f"{', '.join(map(str, others))}.", idc))
        if spec.get("duplicate_rows"):
            seen: dict[tuple, int] = {}
            for r in table_runs:
                key = tuple(sorted(r["raw"].items()))
                if key in seen:
                    r["flags"].append(_flag("duplicate_row", f"Identical to CSV record {seen[key]}.", None))
                else:
                    seen[key] = r["source_row"]
        for col in spec.get("autofill_cols", []):
            prev = None
            base: dict[str, str] = {}
            for r in table_runs:
                cur = r["raw"].get(col, "")
                if prev is not None:
                    a, b = _autofill_template(prev), _autofill_template(cur)
                    if a and b and len(a) == len(b) and a[0][2] == b[0][2]:
                        for (pa, na, _), (pb, nb, _) in zip(a, b):
                            if pa == pb and nb == na + 1:
                                key = pa
                                orig = base.get(key) or f"{pa}{na}"
                                base[key] = orig
                                likely = orig if not orig.startswith("N") else "N2"
                                r["flags"].append(_flag("autofill_artifact_suspected",
                                                        f"'{cur}' looks like a spreadsheet auto-fill increment of the row above "
                                                        f"('{prev}'). Likely {likely}. Shown verbatim.", col, likely))
                                break
                        else:
                            base = {}
                    else:
                        base = {}
                prev = cur
        table_flags_rows = [rule for rule in ROW_FLAG_RULES if rule["accession"] == acc]
        for rule in table_flags_rows:
            for r in table_runs:
                if r["source_row"] in rule["rows"] and (not rule.get("file") or rule["file"] == spec["file"]):
                    if not any(f["code"] == rule["code"] for f in r["flags"]):
                        r["flags"].append(_flag(rule["code"], rule["message"], rule.get("column"), rule="curator"))
        if acc == "PSI-25":  # BASS-II final O2 values far from initial: do not interpret, flag for the domain lead
            for r in table_runs:
                ini = parse_numeric(r["raw"].get("Calibrated  initial O2 % by vol", ""))
                fin = parse_numeric(r["raw"].get("Calibrated final O2 % by vol", ""))
                if ini.known and fin.known and (fin.vmin > ini.vmin + 1 or fin.vmin < 5):
                    r["flags"].append(_flag("unexplained_value", f"Final O2 {r['raw'].get('Calibrated final O2 % by vol')} vs "
                                            f"initial {r['raw'].get('Calibrated  initial O2 % by vol')} (% by vol): not "
                                            "explained in the table. Not interpreted; pending domain-lead review.",
                                            "Calibrated final O2 % by vol", rule="curator"))
        runs.extend(table_runs)
    return runs, docs, table_flags


def _file_summary(acc: str, d: dict) -> dict:
    added = d.get("added") or []
    cats: dict[str, dict] = defaultdict(lambda: {"files": 0, "bytes": 0})
    tree: dict[str, dict] = {}
    docs = []
    for a in added:
        parts = (a.get("remote_path") or "").split("/")
        cat = parts[4] if len(parts) > 5 else "Other"
        size = float(a.get("file_size") or 0)
        cats[cat]["files"] += 1
        cats[cat]["bytes"] += size
        sub = (a.get("subcategory") or "").strip()
        if sub:
            key = f"{cat}/{sub}"
            node = tree.setdefault(key, {"path": key, "files": 0, "bytes": 0})
            node["files"] += 1
            node["bytes"] += size
        if cat in ("Reports", "Science Documents", "Presentations", "Engineering Documents") or cat.startswith("Analyzed"):
            docs.append({"category": cat, "file_name": a.get("file_name"), "size_bytes": size, "subcategory": sub or None,
                         "url": psi_download_url(acc, a.get("file_name") or "")})
    return {
        "total_file_size_bytes": float(d.get("totalFileSize") or 0),
        "listed_files": len(added),
        "listing_note": ("PSI lists no per-file entries in this record (its 'added' version list is empty or near-empty); "
                         "browse the files on PSI.") if len(added) <= 1 else
                        "File list from the record's version list ('added'); it may not include every file. Metadata only.",
        "categories": {k: {"files": v["files"], "bytes": v["bytes"]} for k, v in sorted(cats.items())},
        "tree": sorted(tree.values(), key=lambda n: n["path"])[:400],
        "documents": sorted(docs, key=lambda x: (x["category"], x["file_name"] or ""))[:200],
        "experimental_tables": [x["file_name"] for x in d.get("experimentalTable") or []],
    }


def _images(acc: str, d: dict) -> list[dict]:
    out = []
    for im in d.get("images") or []:
        name = im.get("file_name") or ""
        if re.search(r"logo", name, flags=re.I):  # brand rule: no logos
            continue
        out.append({"file_name": name, "size_bytes": im.get("file_size"), "url": psi_download_url(acc, name),
                    "credit": f"NASA PSI ({d.get('licenseIdentifier') or 'license as listed'})",
                    "caption": re.sub(r"^PSI-\d+_Representative Image\(s\)_", "", name).rsplit(".", 1)[0]})
    return out


def _relationships(acc: str, d: dict, records: dict[str, dict]) -> list[dict]:
    rel = [x.strip() for x in (d.get("related_glds") or "").split(",") if x.strip()]
    out = []
    text = " ".join(_clean(d.get(k)) for k in ("title", "objective", "approach"))
    sents = re.split(r"(?<=[.!?])\s+", text)
    for r in rel:
        other = records.get(r) or {}
        acr = (other.get("investigationAcronym") or "").split("/")[-1].strip()
        title = _clean(other.get("title"))
        quote_ = next((s for s in sents if (acr and re.search(rf"\b{re.escape(acr)}\b", s)) or (title and title[:30] in s)), None)
        out.append({"to": r, "to_acronym": other.get("investigationAcronym") or r,
                    "kind": "uses_flight_data_of" if acc in GROUND_ACCESSIONS else "related_in_psi",
                    "quote": quote_[:400] if quote_ else None,
                    "source": f"PSI record field related_glds ({acc})"})
    return out


def platform_of(d: dict) -> str:
    if (d.get("projectType") or "").lower().startswith("ground"):
        return "Ground lab / model"
    fp = _clean(d.get("flightProgram"))
    if "Space Station" in fp:
        return "ISS"
    if "Cygnus" in fp:
        return "Cygnus spacecraft"
    return "Not reported"


def build() -> dict:
    src_dir = settings.data_dir / "sources"
    records = {a: json.loads((src_dir / "psi" / f"{a}.json").read_text()) for a in SEED_ACCESSIONS}
    accessed = (src_dir / "psi" / "ACCESSED_AT.txt").read_text().strip().splitlines()[0]
    investigations = []
    for acc in SEED_ACCESSIONS:
        raw_path = src_dir / "psi" / f"{acc}.json"
        d = records[acc]
        cur = CURATION[acc]
        ground = bool(cur.get("ground"))
        fields = {
            "objective": _clean(d.get("objective")), "approach": _clean(d.get("approach")),
            "hypothesis": _clean(d.get("hypothesis")), "research_impacts": _clean(d.get("researchImpacts")),
        }
        tag_text = dict(fields)
        tag_text["sub_research_area"] = d.get("subResearchArea") or ""
        topics = tag_fields(tag_text, TOPIC_RULES)
        runs, table_docs, table_flags = build_test_runs(acc, src_dir)
        if ground:
            for r in runs:
                r["gravity_regime"] = "1g_lab_or_model"
        header_text = " ".join(sorted({k for r in runs for k in r["raw"].keys()}))
        mtypes = tag_fields({**fields, "experimental_table_headers": header_text}, MEASUREMENT_RULES)
        pubs = []
        for p in d.get("publications") or []:
            title = _clean(p.get("title"))
            if not title:
                continue
            doi = _clean(p.get("doi"))
            pubs.append({"title": title, "doi": doi or None, "url": f"https://doi.org/{doi}" if doi else None,
                         "authors": _clean(p.get("authorList")) or None, "type": "publication (listed in PSI metadata)",
                         "provenance": {"kind": "reference", "reference_of": f"PSI record {acc}", **PSI_PROV}})
        url = f"https://psi.nasa.gov/physci/repo/data/investigations/{acc}"
        acronym = d.get("investigationAcronym") or None
        if ground and not acronym:
            acronym = f"{acc} (ground)"
        rels = _relationships(acc, d, records)
        basis = cur["basis"]
        if ground:
            rq = next((r["quote"] for r in rels if r["quote"]), None)
            basis = rq or _clean(d.get("title"))
        hw = _clean(d.get("experimentHardware"))
        platform_note = None
        if "Cygnus" in hw and "Space Station" in _clean(d.get("flightProgram")):
            platform_note = (f"PSI lists the flight platform as '{_clean(d.get('flightProgram'))}' while the hardware is "
                             f"'{hw}'. Both shown as listed.")
        investigations.append({
            "id": acc.lower(), "accession": acc, "acronym": acronym, "title": _clean(d.get("title")),
            "family": cur["family"], **fields,
            "fuel_class": cur["fuel_class"], "fuel_class_basis": basis, "fuel_class_note": cur.get("fuel_class_note"),
            "solid_emulation": bool(cur.get("solid_emulation")), "partial_gravity_mimic": bool(cur.get("partial_gravity_mimic")),
            "hardware": hw or None, "hardware_link": _clean(d.get("experimentHardwareLink")) or None,
            "flight_platform": _clean(d.get("flightProgram")) or None, "platform": platform_of(d), "platform_note": platform_note,
            "project_type": d.get("projectType"), "is_ground": ground,
            "gravity_regime": "1g_lab_or_model" if ground else (
                "microgravity" if (d.get("projectType") or "").lower().startswith("microgravity") else "unknown"),
            "gravity_regime_basis": f"PSI projectType = '{d.get('projectType')}'",
            "sub_research_area": d.get("subResearchArea") or None,
            "doi": d.get("doi") or None, "source_url": url,
            "api_url": f"https://psi.nasa.gov/geode-py/ws/repo/investigations/{acc}",
            "license": d.get("licenseName") or None, "release_date": d.get("releaseDate") or None,
            "investigation_start": d.get("investigationStartDate") or None, "investigation_end": d.get("investigationEndDate") or None,
            "version": {"version": d.get("version"), "reason": d.get("versionReason"), "release_date": d.get("releaseDate"),
                        "modified_date": d.get("modifiedDate")},
            "raw_source_path": f"data/sources/psi/{acc}.json", "raw_source_sha256": _sha(raw_path),
            "topics": topics, "measurement_types": mtypes,
            "brief_facts": [{"text": t, "verification_status": "challenge_brief", "citation_url": CHALLENGE_URL,
                             "local_copy": CHALLENGE_LOCAL} for t in cur.get("brief_facts", [])],
            "relationships": rels,
            "files": _file_summary(acc, d), "images": _images(acc, d), "table_flags": table_flags,
            "analyzed_data": analyzed_block(acc, src_dir),
            "data_availability": {
                "experimental_tables": [x["file_name"] for x in d.get("experimentalTable") or []],
                "total_file_size_bytes_reported_by_psi": d.get("totalFileSize"),
                "note": "Raw data files are listed by PSI and linked, never downloaded. Experimental tables are ingested.",
            },
            "provenance": PSI_PROV,
            "publications": pubs, "documents": table_docs, "test_runs": runs,
        })
    seed = {
        "seed_version": SEED_VERSION, "psi_accessed_at": accessed,
        "provenance": ("Built by app.ingest.build_seed from raw PSI API JSON, PSI experimental table CSVs and PSI analyzed-data "
                       "files (PSI-39, PSI-47) in data/sources/psi/."),
        "investigations": investigations,
        "catalog_stats": catalog_stats(src_dir, records, accessed),
        "partial_gravity_gap": {**FUTURE_PARTIAL_GRAVITY, "verification_status": "challenge_brief", "citation_url": CHALLENGE_URL},
    }
    return seed


def catalog_stats(src_dir: Path, records: dict[str, dict], accessed: str) -> dict:
    """Every number here is computed from saved PSI files; nothing is typed by hand."""
    srch = json.loads((src_dir / "psi" / "search_research_area_combustion_science.json").read_text())
    hits = [h["_source"] for h in srch["hits"]["hits"]]
    total_bytes = sum(float(r.get("totalFileSize") or 0) for r in records.values())
    allareas = json.loads((src_dir / "psi" / "search_q_combustion_all_areas.json").read_text())
    areas = Counter(h["_source"].get("Research Area") for h in allareas["hits"]["hits"])
    return {
        "combustion_science_total": srch["hits"]["total"],
        "by_project_type": dict(Counter(h.get("Project Type") for h in hits)),
        "flight_platform_listing": dict(Counter(h.get("Flight Platform") or "(blank)" for h in hits)),
        "total_file_size_bytes": total_bytes, "total_tb": round(total_bytes / 1e12, 2), "total_tib": round(total_bytes / 2**40, 2),
        "as_of": accessed[:10],
        "research_areas": sorted(a for a in areas if a), "research_areas_count": len([a for a in areas if a]),
        "all_areas_search_hits": allareas["hits"]["total"] if isinstance(allareas["hits"]["total"], int) else len(allareas["hits"]["hits"]),
        "sources": {"listing": "data/sources/psi/search_research_area_combustion_science.json (hits.total, Project Type, Flight Platform)",
                    "volume": "sum of totalFileSize over data/sources/psi/PSI-*.json (24 records)",
                    "research_areas": "distinct 'Research Area' in data/sources/psi/search_q_combustion_all_areas.json"},
        "adjacent_records": adjacent_records(src_dir),
        "adjacent_records_note": ("The PSI web search behind the official link (q=combustion) lists these records besides the "
                                  "Combustion Science investigations. They belong to other research areas and match only because "
                                  "their text mentions combustion. Listed for completeness; never counted, ranked or indexed."),
        "provenance": PSI_PROV,
    }


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
            items = re.split(r"\n(?=- )", b)
            for it in items:
                it = re.sub(r"\s+", " ", it.lstrip("- ").strip())
                if len(it) >= 60:
                    chunks.append({"section": section, "text": it})
            continue
        chunks.append({"section": section, "text": re.sub(r"\s+", " ", b)})
    return [{"id": f"brief-{i:02d}", **c, "verification_status": "challenge_brief", "source_url": CHALLENGE_URL,
             "local_path": "data/sources/spaceapps_challenge_details.md",
             "provenance": {"kind": "resource", "resource": "Challenge brief (details tab)", "resource_url": CHALLENGE_URL}}
            for i, c in enumerate(chunks)]


def main() -> None:
    out = settings.data_dir / "seed"
    out.mkdir(parents=True, exist_ok=True)
    for old in out.glob("*.v1.json"):
        old.unlink()
    seed = build()
    (out / f"investigations.{SEED_VERSION}.json").write_text(json.dumps(seed, indent=1, ensure_ascii=False))
    (out / f"challenge_brief_chunks.{SEED_VERSION}.json").write_text(json.dumps(challenge_chunks(), indent=1, ensure_ascii=False))
    n_runs = sum(len(i["test_runs"]) for i in seed["investigations"])
    print(f"wrote {len(seed['investigations'])} investigations, {n_runs} test runs")


if __name__ == "__main__":
    main()
