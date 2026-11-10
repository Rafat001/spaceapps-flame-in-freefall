"""Deterministic, explainable research-relevance ranking (PRD section 9).

Score = 100 x sum(weight x match), match in [0, 1]. Weights are product hypotheses to be
reviewed by a fire-safety domain expert; they are NOT hazard coefficients. Unknown evidence
receives no positive match and is flagged. Every non-zero criterion carries >= 1 citation.
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.ingest.curation import CHALLENGE_URL
from app.labels import PARTIAL_GRAVITY_WARNING, RELEVANCE_DISCLAIMER, label
from app.models import Investigation
from app.scenarios import SCENARIOS

WEIGHTS = {
    "material_fuel": 0.25,
    "oxygen_atmosphere": 0.25,
    "prevention_flame_behavior": 0.20,
    "detection_suppression": 0.15,
    "habitat_applicability": 0.15,
}
CRITERIA_LABELS = {
    "material_fuel": "Material / fuel match",
    "oxygen_atmosphere": "Oxygen / atmosphere match",
    "prevention_flame_behavior": "Prevention / flame behavior",
    "detection_suppression": "Detection / suppression",
    "habitat_applicability": "Habitat applicability",
}
FUEL_MATCH = {"solid": 1.0, "liquid": 0.4, "gaseous": 0.3, "aerosol": 0.0}
RANKING_VERSION = "sfsri-v0.1"


def _tag_cite(inv: Investigation, tag: str) -> dict:
    t = inv.topics[tag]
    return {"type": "psi_metadata", "label": label("rule_tag"), "field": t["field"], "excerpt": t["excerpt"],
            "url": inv.source_url, "tag": tag}


def _material(inv: Investigation) -> tuple[float, list[dict], list[str]]:
    flags: list[str] = []
    cite = [{"type": "challenge_brief", "label": label("challenge_brief"), "excerpt": inv.fuel_class_basis, "url": CHALLENGE_URL}]
    m = FUEL_MATCH.get(inv.fuel_class, 0.0)
    if inv.solid_emulation:
        m = max(m, 0.7)
        flags.append("Gaseous burner emulating solid-material burning (per official brief).")
    if inv.fuel_class == "aerosol":
        flags.append("No combustion fuel (dust aerosol instrument test).")
    return m, cite if m > 0 else [], flags


def _oxygen(inv: Investigation, scen: dict) -> tuple[float, list[dict], list[str]]:
    runs = inv.test_runs
    o2 = [r for r in runs if r.oxygen_pct_min is not None]
    pr = [r for r in runs if r.pressure_kpa_min is not None]
    flags: list[str] = []
    if not o2 and not pr:
        return 0.0, [], ["Oxygen and pressure: Not reported in the PSI experimental table (no positive match)."]
    atm = scen.get("atmosphere")
    table_cite = {"type": "psi_experimental_table", "label": label("psi_experimental_table"), "url": inv.source_url,
                  "excerpt": f"{len(o2)} rows with oxygen, {len(pr)} rows with pressure in PSI experimental table(s)."}
    if not atm:
        # no target atmosphere in the official brief: reward documented variation of conditions
        o_var = len({(r.oxygen_pct_min, r.oxygen_pct_max) for r in o2}) > 1
        p_var = len({(r.pressure_kpa_min, r.pressure_kpa_max) for r in pr}) > 1
        m = 0.6 * (1.0 if o_var else 0.5 if o2 else 0.0) + 0.4 * (1.0 if p_var else 0.5 if pr else 0.0)
        flags.append("Scenario has no atmosphere target in the official brief; scored on documented O2/pressure variation.")
        return round(m, 3), [table_cite], flags
    o_min, p_max = atm["oxygen_pct_min"], atm["pressure_kpa_max"]
    amb = [r for r in o2 if not (r.oxygen_context or "").lower().startswith("oxidizer stream")]
    stream = [r for r in o2 if (r.oxygen_context or "").lower().startswith("oxidizer stream")]
    o_hit_amb = [r for r in amb if r.oxygen_pct_max >= o_min]
    o_hit_stream = [r for r in stream if r.oxygen_pct_max >= o_min]
    p_hit = [r for r in pr if r.pressure_kpa_min <= p_max]
    both = [r for r in o_hit_amb if r.pressure_kpa_min is not None and r.pressure_kpa_min <= p_max]
    oc = 1.0 if o_hit_amb else 0.7 if o_hit_stream else (0.4 if o2 else 0.0)
    pc = 1.0 if p_hit else (0.4 if pr else 0.0)
    if o_hit_stream and not o_hit_amb:
        flags.append("High O2 only in the burner oxidizer stream (inverse flames), not in the ambient atmosphere.")
    if not pr:
        flags.append("Pressure: Not reported in the PSI experimental table.")
    if not o2:
        flags.append("Oxygen: Not reported in the PSI experimental table.")
    m = 1.0 if both else 0.6 * oc + 0.4 * pc
    cites = [table_cite, {"type": "challenge_brief", "label": label("challenge_brief"), "excerpt": atm["source_text"],
                          "url": CHALLENGE_URL}]
    detail = (f"{len(o_hit_amb)} ambient rows with O2 >= {o_min:g} %, {len(o_hit_stream)} oxidizer-stream rows, "
              f"{len(p_hit)} rows with pressure <= {p_max:g} kPa, {len(both)} rows meeting both.")
    cites[0] = {**table_cite, "excerpt": detail}
    return round(m, 3), cites, flags


def _prevention(inv: Investigation) -> tuple[float, list[dict], list[str]]:
    t = inv.topics or {}
    for tag in ("flame_spread", "flammability"):
        if tag in t:
            return 1.0, [_tag_cite(inv, tag)], []
    for tag in ("ignition", "extinction", "burning_rate"):
        if tag in t:
            return 0.6, [_tag_cite(inv, tag)], []
    for tag in ("cool_flames", "droplet_combustion"):
        if tag in t:
            return 0.3, [_tag_cite(inv, tag)], []
    return 0.0, [], ["No prevention / flame-behaviour terms found in PSI text."]


def _detect_suppress(inv: Investigation) -> tuple[float, list[dict], list[str]]:
    t = inv.topics or {}
    best, cites = 0.0, []
    if "suppression" in t:
        best, cites = 1.0, [_tag_cite(inv, "suppression")]
    elif "smoke_detection" in t:
        best, cites = 0.8, [_tag_cite(inv, "smoke_detection")]
    elif "extinction" in t:
        best, cites = 0.4, [_tag_cite(inv, "extinction")]
    elif "soot" in t:
        best, cites = 0.3, [_tag_cite(inv, "soot")]
    return best, cites, ([] if best else ["No detection / suppression terms found in PSI text."])


def _habitat(inv: Investigation) -> tuple[float, list[dict], list[str]]:
    m, cites = 0.0, []
    sub = (inv.sub_research_area or "").lower()
    if "fire" in sub:
        m += 0.5
        cites.append({"type": "psi_metadata", "label": label("psi_metadata"), "field": "subResearchArea",
                      "excerpt": inv.sub_research_area, "url": inv.source_url})
    for tag, w in (("crew_habitat", 0.3), ("spacecraft_scale", 0.2)):
        if tag in (inv.topics or {}):
            m += w
            cites.append(_tag_cite(inv, tag))
    return round(min(m, 1.0), 3), cites, ([] if m else ["No crew-environment terms found in PSI text."])


def score(inv: Investigation, scenario: str) -> dict:
    scen = SCENARIOS[scenario]
    parts = {
        "material_fuel": _material(inv),
        "oxygen_atmosphere": _oxygen(inv, scen),
        "prevention_flame_behavior": _prevention(inv),
        "detection_suppression": _detect_suppress(inv),
        "habitat_applicability": _habitat(inv),
    }
    breakdown, total, flags = [], 0.0, []
    for k, (m, cites, fl) in parts.items():
        contrib = 100 * WEIGHTS[k] * m
        total += contrib
        flags += fl
        breakdown.append({"criterion": k, "label": CRITERIA_LABELS[k], "weight": WEIGHTS[k], "match": m,
                          "contribution": round(contrib, 1), "citations": cites, "flags": fl})
    return {"investigation": {"id": inv.id, "acronym": inv.acronym, "title": inv.title, "family": inv.family,
                              "fuel_class": inv.fuel_class, "source_url": inv.source_url},
            "score": round(total, 1), "breakdown": breakdown, "flags": flags}


def rank(session: Session, scenario: str = "lunar_habitat", ids: list[str] | None = None) -> dict:
    if scenario not in SCENARIOS:
        raise KeyError(scenario)
    stmt = select(Investigation).options(selectinload(Investigation.test_runs))
    if ids:
        stmt = stmt.where(Investigation.id.in_(ids))
    invs = session.scalars(stmt).all()
    rows = sorted((score(i, scenario) for i in invs), key=lambda r: (-r["score"], r["investigation"]["id"]))
    for n, r in enumerate(rows, 1):
        r["rank"] = n
    scen = SCENARIOS[scenario]
    warnings = [RELEVANCE_DISCLAIMER]
    if scen.get("partial_gravity"):
        warnings.append(PARTIAL_GRAVITY_WARNING)
    if not scen.get("atmosphere"):
        warnings.append("Not established: the official brief gives no atmosphere target for this scenario.")
    return {"scenario": scenario, "scenario_label": scen["label"], "scenario_atmosphere": scen.get("atmosphere"),
            "ranking_version": RANKING_VERSION, "weights": WEIGHTS, "criteria_labels": CRITERIA_LABELS,
            "score_formula": "score = 100 x sum(weight x match); match in [0,1]",
            "weights_note": "Weights are product hypotheses from the team PRD (section 9), pending domain-expert review.",
            "warnings": warnings, "results": rows}
