"""Parameter coverage: "has work already been done for these parameters?"

For each investigation we evaluate every requested parameter against
 - investigation-level fields (fuel class, family, hardware, gravity regime, measurement type), and
 - test-run-level conditions (material, oxygen %, pressure kPa, airflow m/s), requiring all run-level
   constraints to hold on the SAME run.
Each parameter ends up as matched / mismatched / unknown. Unknown never counts as a match.
overlap_score = matched / requested (best run). Verdicts never claim that work does not exist anywhere,
only that the indexed catalog does not document it.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.labels import PARTIAL_GRAVITY_WARNING
from app.models import Investigation, TestRun
from app.services.serialize import run_out
from app.units import to_kpa, to_m_s

RUN_PARAMS = ("material", "oxygen", "pressure", "airflow")


@dataclass
class CoverageQuery:
    fuel_class: str | None = None
    material: str | None = None
    oxygen_min: float | None = None
    oxygen_max: float | None = None
    pressure_min: float | None = None
    pressure_max: float | None = None
    pressure_unit: str = "kPa"
    airflow_min: float | None = None
    airflow_max: float | None = None
    airflow_unit: str = "m/s"
    gravity_regime: str | None = None
    hardware: str | None = None
    measurement_type: str | None = None
    family: str | None = None
    application_scenario: str | None = None
    max_runs: int = 10
    extras: dict = field(default_factory=dict)

    def requested(self) -> list[str]:
        r = []
        for k in ("fuel_class", "family", "hardware", "gravity_regime", "measurement_type", "material"):
            if getattr(self, k):
                r.append(k)
        if self.oxygen_min is not None or self.oxygen_max is not None:
            r.append("oxygen")
        if self.pressure_min is not None or self.pressure_max is not None:
            r.append("pressure")
        if self.airflow_min is not None or self.airflow_max is not None:
            r.append("airflow")
        return r


def _range_status(vmin, vmax, lo, hi) -> str:
    if vmin is None or vmax is None:
        return "unknown"
    if lo is not None and vmax < lo:
        return "mismatch"
    if hi is not None and vmin > hi:
        return "mismatch"
    return "match"


def _run_eval(r: TestRun, q: CoverageQuery, p_lo, p_hi, a_lo, a_hi) -> dict[str, str]:
    out: dict[str, str] = {}
    if q.material:
        out["material"] = "unknown" if not r.material else ("match" if q.material.lower() in r.material.lower() else "mismatch")
    if q.oxygen_min is not None or q.oxygen_max is not None:
        out["oxygen"] = _range_status(r.oxygen_pct_min, r.oxygen_pct_max, q.oxygen_min, q.oxygen_max)
    if p_lo is not None or p_hi is not None:
        out["pressure"] = _range_status(r.pressure_kpa_min, r.pressure_kpa_max, p_lo, p_hi)
    if a_lo is not None or a_hi is not None:
        out["airflow"] = _range_status(r.airflow_m_s_min, r.airflow_m_s_max, a_lo, a_hi)
    return out


def _inv_eval(inv: Investigation, q: CoverageQuery) -> dict[str, dict]:
    out: dict[str, dict] = {}
    if q.fuel_class:
        out["fuel_class"] = {"status": "match" if inv.fuel_class == q.fuel_class else "mismatch", "value": inv.fuel_class}
    if q.family:
        out["family"] = {"status": "match" if inv.family == q.family else "mismatch", "value": inv.family}
    if q.hardware:
        if not inv.hardware:
            out["hardware"] = {"status": "unknown", "value": None}
        else:
            out["hardware"] = {"status": "match" if q.hardware.lower() in inv.hardware.lower() else "mismatch", "value": inv.hardware}
    if q.gravity_regime:
        g = inv.gravity_regime
        out["gravity_regime"] = {"status": "unknown" if g == "unknown" else ("match" if g == q.gravity_regime else "mismatch"),
                                 "value": g}
    if q.measurement_type:
        mts = list((inv.measurement_types or {}).keys())
        hit = [m for m in mts if q.measurement_type.lower() in m.lower()]
        out["measurement_type"] = {"status": "match" if hit else ("unknown" if not mts else "mismatch"), "value": mts}
    return out


def coverage(session: Session, q: CoverageQuery) -> dict:
    requested = q.requested()
    p_lo, p_hi = to_kpa(q.pressure_min, q.pressure_unit), to_kpa(q.pressure_max, q.pressure_unit)
    a_lo, a_hi = to_m_s(q.airflow_min, q.airflow_unit), to_m_s(q.airflow_max, q.airflow_unit)
    invs = session.scalars(select(Investigation).options(selectinload(Investigation.test_runs)
                                                          .selectinload(TestRun.measurements))).all()
    results = []
    for inv in sorted(invs, key=lambda i: i.accession):
        inv_level = _inv_eval(inv, q)
        run_params = [p for p in requested if p in RUN_PARAMS]
        best_runs: list[tuple[int, TestRun, dict]] = []
        counts = {p: {"match": 0, "mismatch": 0, "unknown": 0} for p in run_params}
        for r in inv.test_runs:
            ev = _run_eval(r, q, p_lo, p_hi, a_lo, a_hi)
            for p, st in ev.items():
                counts[p][st] += 1
            n_match = sum(1 for st in ev.values() if st == "match")
            best_runs.append((n_match, r, ev))
        full = [(n, r, ev) for n, r, ev in best_runs if run_params and n == len(run_params)]
        best = max((n for n, _, _ in best_runs), default=0)
        param_status: dict[str, str] = {k: v["status"] for k, v in inv_level.items()}
        for p in run_params:
            c = counts[p]
            if full:
                param_status[p] = "match"
            elif c["match"]:
                param_status[p] = "match_in_other_runs"
            elif c["mismatch"]:
                param_status[p] = "mismatch"
            else:
                param_status[p] = "unknown"
        inv_matched = sum(1 for k in inv_level if inv_level[k]["status"] == "match")
        run_matched = len(run_params) if full else best
        n_req = len(requested) or 1
        overlap = (inv_matched + run_matched) / n_req if requested else 0.0
        if requested and all(v == "match" for v in param_status.values()):
            verdict = "documented_match"
        elif any(v in ("match", "match_in_other_runs") for v in param_status.values()):
            verdict = "partial_overlap"
        else:
            verdict = "no_documented_overlap"
        unknown = [k for k, v in param_status.items() if v == "unknown"]
        show = full if full else sorted(best_runs, key=lambda t: (-t[0], t[1].id))[: q.max_runs if best else 0]
        results.append({
            "investigation": {"id": inv.id, "acronym": inv.acronym, "title": inv.title, "family": inv.family,
                              "fuel_class": inv.fuel_class, "source_url": inv.source_url},
            "verdict": verdict, "overlap_score": round(overlap, 3),
            "parameters": param_status, "investigation_level": inv_level,
            "run_counts": counts, "n_runs_full_match": len(full), "n_runs_total": len(inv.test_runs),
            "unknown_parameters": unknown,
            "matching_runs": [dict(run_out(r), evaluation=ev) for _, r, ev in show[: q.max_runs]],
        })
    results.sort(key=lambda x: ({"documented_match": 0, "partial_overlap": 1, "no_documented_overlap": 2}[x["verdict"]],
                                -x["overlap_score"], -x["n_runs_full_match"], x["investigation"]["acronym"] or ""))
    n_full = sum(1 for x in results if x["verdict"] == "documented_match")
    if not requested:
        summary = "No parameters given. Add at least one parameter to check coverage."
    elif n_full:
        summary = (f"{n_full} investigation(s) in the indexed catalog document work matching ALL requested parameters "
                   f"(numeric conditions on the same test run).")
    else:
        summary = ("No investigation in the indexed catalog documents ALL requested parameters together. This is not proof "
                   "that no such work exists — the catalog is a 16-investigation PSI seed, and many values are Not reported.")
    caveats = ["Unknown / Not reported values never count as matches.",
               "Range-valued rows (test matrices, per-day sets) match by range overlap; check the source text.",
               "Oxygen for CFI-G inverse flames is the oxidizer stream from the burner, not the ambient atmosphere."]
    if q.gravity_regime in ("lunar", "martian", "partial") or q.application_scenario in ("lunar_habitat", "mars_habitat",
                                                                                          "pressurized_rover"):
        caveats.insert(0, PARTIAL_GRAVITY_WARNING)
    return {"requested_parameters": requested,
            "normalized_query": {"oxygen_pct": [q.oxygen_min, q.oxygen_max], "pressure_kpa": [p_lo, p_hi],
                                 "airflow_m_s": [a_lo, a_hi]},
            "summary": summary, "results": results, "caveats": caveats}
