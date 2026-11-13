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
RANKING_VERSION = "sfsri-v0.3"


def _tag_cite(inv: Investigation, tag: str) -> dict:
    t = inv.topics[tag]
    return {"type": "psi_metadata", "label": label("rule_tag"), "field": t["field"], "excerpt": t["excerpt"],
            "url": inv.source_url, "tag": tag}


def _material(inv: Investigation) -> tuple[float, list[dict], list[str]]:
    flags: list[str] = []
    cite = [{"type": "challenge_brief", "label": label("challenge_brief"), "excerpt": inv.fuel_class_basis, "url": CHALLENGE_URL}]
    if inv.is_ground:
        cite = [{"type": "psi_metadata", "label": label("psi_metadata"), "excerpt": inv.fuel_class_basis, "url": inv.source_url}]
        flags.append("Ground (modeling / lab) study: fuel class inherited from the flight data it reuses.")
    m = FUEL_MATCH.get(inv.fuel_class, 0.0)
    if inv.solid_emulation:
        m = max(m, 0.7)
        flags.append("Gaseous burner emulating solid-material burning (per official brief).")
    if inv.fuel_class == "aerosol":
        flags.append("No combustion fuel (dust aerosol instrument test).")
    return m, cite if m > 0 else [], flags


def _oxygen(inv: Investigation, scen: dict) -> tuple[float, list[dict], list[str]]:
    from app.services.coverage import countable

    runs = countable(inv.test_runs)
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
    from app.services.coverage import target_rows

    o_min, p_max = atm["oxygen_pct_min"], atm["pressure_kpa_max"]
    t = target_rows(runs, o_min, p_max, include_stream=True)
    both, stream, matrix = t["both"], t["stream"], t["matrix"]
    if both:
        m = 1.0
        if stream and len(stream) == len(both):
            flags.append("Lunar-target rows use burner oxidizer-stream O2 (inverse flames), counted per team decision D5; "
                         "this is not the ambient atmosphere.")
        elif stream:
            flags.append(f"{len(stream)} of {len(both)} matching rows are burner oxidizer-stream O2 (inverse flames).")
        if matrix:
            flags.append("Match comes from a planned test matrix (ranges), not individual runs.")
    else:
        # no single row meets both: partial credit only, capped at 0.5 (fixes FLEX getting full credit from separate rows)
        m = 0.3 * (1.0 if t["o_only"] else 0.0) + 0.2 * (1.0 if t["p_only"] else 0.0)
        if t["o_only"] and t["p_only"]:
            flags.append("Oxygen and pressure targets are each met on different rows, never on the same row.")
    if not pr:
        flags.append("Pressure: Not reported in the PSI experimental table.")
    if not o2:
        flags.append("Oxygen: Not reported in the PSI experimental table.")
    cites = [table_cite, {"type": "challenge_brief", "label": label("challenge_brief"), "excerpt": atm["source_text"],
                          "url": CHALLENGE_URL}]
    cm = t["closest_miss"]
    detail = (f"{len(both)} rows meet O2 >= {o_min:g} % AND pressure <= {p_max:.2f} kPa on the same row "
              f"({len(both) - len(stream)} ambient, {len(stream)} burner oxidizer stream); "
              f"{len(t['o_only'])} other rows meet only the O2 target, {len(t['p_only'])} only the pressure target."
              + (f" Closest miss: CSV record {cm.source_row} ({cm.oxygen_source_text} O2 at {cm.pressure_source_text})." if (cm and not both) else ""))
    cites[0] = {**table_cite, "excerpt": detail, "rows": [r.source_row for r in both[:50]]}
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
    lunar_rows = None
    if scen.get("atmosphere"):
        from app.services.coverage import target_rows
        lunar_rows = len(target_rows(inv.test_runs, scen["atmosphere"]["oxygen_pct_min"], scen["atmosphere"]["pressure_kpa_max"])["both"])
    return {"investigation": {"id": inv.id, "acronym": inv.acronym, "title": inv.title, "family": inv.family,
                              "fuel_class": inv.fuel_class, "source_url": inv.source_url, "is_ground": inv.is_ground,
                              "platform": inv.platform, "lenses": sorted((inv.lenses or {}).keys())},
            "score": round(total, 1), "breakdown": breakdown, "flags": flags, "target_rows": lunar_rows}


def rank(session: Session, scenario: str = "lunar_habitat", ids: list[str] | None = None, lens: str | None = None,
         include_ground: bool = True) -> dict:
    if scenario not in SCENARIOS:
        raise KeyError(scenario)
    stmt = select(Investigation).options(selectinload(Investigation.test_runs))
    if ids:
        stmt = stmt.where(Investigation.id.in_(ids))
    invs = session.scalars(stmt).all()
    if lens:
        invs = [i for i in invs if lens in (i.lenses or {})]
    if not include_ground:
        invs = [i for i in invs if not i.is_ground]
    scen = SCENARIOS[scenario]
    rows = [score(i, scenario) for i in invs]
    tiered = bool(scen.get("atmosphere"))
    for r in rows:
        r["tier"] = ("documented_at_target" if r["target_rows"] else "not_at_target") if tiered else None
    # D5: when the brief gives an atmosphere target, investigations with rows meeting it on the same row come first,
    # so the ranking cannot contradict the "Has it been done?" answer; the weighted score orders within each tier.
    rows.sort(key=lambda r: (0 if r["tier"] in (None, "documented_at_target") else 1, -r["score"], r["investigation"]["id"]))
    for n, r in enumerate(rows, 1):
        r["rank"] = n
    warnings = [RELEVANCE_DISCLAIMER]
    if scen.get("partial_gravity"):
        warnings.append(PARTIAL_GRAVITY_WARNING)
    if not scen.get("atmosphere"):
        warnings.append("Not established: the official brief gives no atmosphere target for this scenario.")
    return {"scenario": scenario, "scenario_label": scen["label"], "scenario_atmosphere": scen.get("atmosphere"),
            "ranking_version": RANKING_VERSION, "weights": WEIGHTS, "criteria_labels": CRITERIA_LABELS,
            "score_formula": "score = 100 x sum(weight x match); match in [0,1]",
            "weights_note": "Weights are product hypotheses from the team PRD (section 9), pending domain-expert review.",
            "tier_note": ("Investigations with PSI table rows that meet the brief's target on the same row are listed first; "
                          "the weighted score orders investigations within each group.") if tiered else None,
            "warnings": warnings, "results": rows}
