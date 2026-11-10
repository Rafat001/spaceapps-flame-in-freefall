from __future__ import annotations

from app.labels import NOT_REPORTED, label
from app.models import Investigation, TestRun
from app.units import sig


def cond(vmin, vmax, src, meta, unit, context=None) -> dict:
    if vmin is None or vmax is None:
        return {"known": False, "display": NOT_REPORTED, "unit": unit, "source_text": src or None,
                "flags": (meta or {}).get("flags", []), "label": label("not_reported")}
    disp = f"{sig(vmin)}" if vmin == vmax else f"{sig(vmin)}–{sig(vmax)}"
    approx = bool((meta or {}).get("approximate"))
    return {"known": True, "min": vmin, "max": vmax, "display": ("~" if approx else "") + f"{disp} {unit}", "unit": unit,
            "source_text": src, "context": context or (meta or {}).get("context"), "approximate": approx,
            "kind": (meta or {}).get("kind"), "flags": (meta or {}).get("flags", []), "label": label("psi_experimental_table")}


def run_out(r: TestRun) -> dict:
    return {
        "id": r.id, "run_label": r.run_label, "row_kind": r.row_kind, "material": r.material or NOT_REPORTED,
        "sample_geometry": r.sample_geometry or NOT_REPORTED, "flow_direction": r.flow_direction,
        "gravity_regime": r.gravity_regime,
        "oxygen": cond(r.oxygen_pct_min, r.oxygen_pct_max, r.oxygen_source_text, r.oxygen_meta, "% O2 (by volume)", r.oxygen_context),
        "pressure": cond(r.pressure_kpa_min, r.pressure_kpa_max, r.pressure_source_text, r.pressure_meta, "kPa"),
        "airflow": cond(r.airflow_m_s_min, r.airflow_m_s_max, r.airflow_source_text, r.airflow_meta, "m/s", r.airflow_context),
        "measurements": [{"variable": m.variable, "value_text": m.value_text, "unit": m.unit, "source_column": m.source_column,
                          "label": label("measured_psi_table")} for m in r.measurements],
        "source": {"document_id": r.source_document_id, "row": r.source_row, "label": label(r.verification_status)},
    }


def _agg(runs: list[TestRun], lo: str, hi: str, unit: str, ctx_attr: str | None = None) -> dict:
    vals = [(getattr(r, lo), getattr(r, hi)) for r in runs if getattr(r, lo) is not None and getattr(r, hi) is not None]
    if not vals:
        return {"known": False, "display": NOT_REPORTED, "unit": unit, "n_rows": 0, "n_total": len(runs),
                "label": label("not_reported")}
    a, b = min(v[0] for v in vals), max(v[1] for v in vals)
    ctx = sorted({getattr(r, ctx_attr) for r in runs if ctx_attr and getattr(r, ctx_attr)}) if ctx_attr else []
    return {"known": True, "min": a, "max": b, "display": (f"{sig(a)}" if a == b else f"{sig(a)}–{sig(b)}") + f" {unit}",
            "unit": unit, "n_rows": len(vals), "n_total": len(runs), "contexts": ctx,
            "note": "Range across individual PSI table rows; not a single experiment-wide condition.",
            "label": label("psi_experimental_table")}


def conditions_summary(inv: Investigation) -> dict:
    runs = inv.test_runs
    return {
        "oxygen": _agg(runs, "oxygen_pct_min", "oxygen_pct_max", "% O2 (by volume)", "oxygen_context"),
        "pressure": _agg(runs, "pressure_kpa_min", "pressure_kpa_max", "kPa"),
        "airflow": _agg(runs, "airflow_m_s_min", "airflow_m_s_max", "m/s", "airflow_context"),
    }


def completeness(inv: Investigation) -> float:
    c = conditions_summary(inv)
    checks = [bool(inv.objective), bool(inv.approach), bool(inv.hardware), bool(inv.test_runs),
              any(r.material for r in inv.test_runs), c["oxygen"]["known"], c["pressure"]["known"], c["airflow"]["known"],
              bool(inv.measurement_types), bool(inv.documents)]
    return round(sum(checks) / len(checks), 2)


def materials(inv: Investigation, limit: int = 12) -> list[str]:
    seen: list[str] = []
    for r in inv.test_runs:
        if r.row_kind == "pretest_data":
            continue
        m = (r.material or "").strip()
        if m and m not in seen:
            seen.append(m)
    return seen[:limit]


def inv_card(inv: Investigation) -> dict:
    return {
        "id": inv.id, "accession": inv.accession, "acronym": inv.acronym, "title": inv.title, "family": inv.family,
        "objective_short": (inv.objective or "")[:280] + ("…" if inv.objective and len(inv.objective) > 280 else ""),
        "fuel_class": inv.fuel_class, "hardware": inv.hardware or NOT_REPORTED, "gravity_regime": inv.gravity_regime,
        "flight_platform": inv.flight_platform or NOT_REPORTED,
        "topics": sorted(inv.topics.keys()), "measurement_types": sorted(inv.measurement_types.keys()),
        "conditions": conditions_summary(inv), "n_test_runs": len(inv.test_runs),
        "data_completeness": completeness(inv), "source_url": inv.source_url, "doi": inv.doi,
    }


def inv_detail(inv: Investigation, max_runs: int = 200) -> dict:
    d = inv_card(inv)
    d.update({
        "objective": inv.objective or NOT_REPORTED, "approach": inv.approach or NOT_REPORTED,
        "hypothesis": inv.hypothesis or NOT_REPORTED, "research_impacts": inv.research_impacts or NOT_REPORTED,
        "text_label": label("psi_metadata"),
        "fuel_class_basis": {"text": inv.fuel_class_basis, "label": label("challenge_brief"), "note": inv.fuel_class_note},
        "hardware_link": inv.hardware_link, "project_type": inv.project_type, "sub_research_area": inv.sub_research_area,
        "gravity_regime_basis": inv.gravity_regime_basis, "license": inv.license, "release_date": inv.release_date,
        "investigation_period": [inv.investigation_start, inv.investigation_end], "last_checked_at": inv.last_checked_at,
        "api_url": inv.api_url, "raw_source_path": inv.raw_source_path,
        "topics_evidence": {k: {**v, "label": label("rule_tag")} for k, v in inv.topics.items()},
        "measurement_types_evidence": {k: {**v, "label": label("rule_tag")} for k, v in inv.measurement_types.items()},
        "brief_facts": inv.brief_facts, "data_availability": inv.data_availability,
        "materials": materials(inv, 40),
        "documents": [{"id": x.id, "title": x.title, "url": x.url, "doi": x.doi, "type": x.type, "authors": x.authors,
                       "local_path": x.local_path} for x in inv.documents],
        "test_runs": [run_out(r) for r in inv.test_runs[:max_runs]],
        "test_runs_truncated": len(inv.test_runs) > max_runs,
        "missing_fields": [k for k, v in conditions_summary(inv).items() if not v["known"]],
        "caveats": ["Numeric conditions are per PSI table row and keep the source text; verify against PSI before use.",
                    "Gravity regime: microgravity only. Not evidence of lunar/Martian (partial-gravity) behaviour."],
    })
    if inv.partial_gravity_mimic:
        d["caveats"].append("Official brief: E-FIELD Flames mimicked partial gravity via electric-field effects on flame "
                            "ions. This is an analogue, not a partial-gravity test.")
    return d
