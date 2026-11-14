"""Deterministic, explainable scenario-fit ranking (PRD section 9), version sfsri-v0.4.

Scenario fit = 100 x sum(weight x match), match in [0, 1], weights sum to 1. The score alone fixes the order
(highest first; ties -> more rows at target, then data completeness, then acronym), so a higher number is never
listed below a lower one. When the official brief gives a target atmosphere (Moon Base / pressurized rover), one
criterion is "Tests at target conditions": PSI experimental-table rows meeting the O2 AND pressure target on the
SAME row, log-scaled by row count and saturating at TARGET_SATURATION_ROWS. Weights are product hypotheses to be
reviewed by a fire-safety domain expert; they are NOT hazard coefficients. Unknown evidence receives no positive
match and is flagged. Every non-zero criterion carries >= 1 citation.
"""
from __future__ import annotations

import math

from sqlalchemy.orm import Session

from app.ingest.curation import CHALLENGE_URL
from app.labels import PARTIAL_GRAVITY_WARNING, RELEVANCE_DISCLAIMER, label
from app.models import Investigation
from app.scenarios import SCENARIOS

# Scenarios whose official brief gives a target atmosphere (lunar habitat, pressurized rover).
WEIGHTS_TARGET = {
    "target_conditions": 0.35,
    "material_fuel": 0.20,
    "oxygen_atmosphere": 0.10,
    "prevention_flame_behavior": 0.15,
    "detection_suppression": 0.10,
    "habitat_applicability": 0.10,
}
# Scenarios with no atmosphere target in the brief (spacecraft cabin, Mars): no target criterion exists.
WEIGHTS_NO_TARGET = {
    "material_fuel": 0.25,
    "oxygen_atmosphere": 0.25,
    "prevention_flame_behavior": 0.20,
    "detection_suppression": 0.15,
    "habitat_applicability": 0.15,
}
WEIGHTS = WEIGHTS_TARGET
# Rows at target needed for a full "Tests at target conditions" match. Log scale: the first rows count most
# (1 row = 0.18, 8 rows = 0.56, 18 rows = 0.75, 48 rows = 0.99, >= 50 rows = 1.0).
TARGET_SATURATION_ROWS = 50
CRITERIA_LABELS = {
    "target_conditions": "Tests at target conditions",
    "material_fuel": "Material / fuel match",
    "oxygen_atmosphere": "Oxygen / atmosphere match",
    "prevention_flame_behavior": "Prevention / flame behavior",
    "detection_suppression": "Detection / suppression",
    "habitat_applicability": "Habitat applicability",
}
CRITERIA_SHORT = {
    "target_conditions": "Target tests",
    "material_fuel": "Fuel",
    "oxygen_atmosphere": "O2/pressure",
    "prevention_flame_behavior": "Flame behavior",
    "detection_suppression": "Detect/suppress",
    "habitat_applicability": "Habitat",
}
FUEL_MATCH = {"solid": 1.0, "liquid": 0.4, "gaseous": 0.3, "aerosol": 0.0}
RANKING_VERSION = "sfsri-v0.4"
SCORE_LABEL = "scenario fit"


def target_match(n_rows: int) -> float:
    """Evidence strength of n same-row target matches: log(1+n)/log(1+TARGET_SATURATION_ROWS), capped at 1."""
    if n_rows <= 0:
        return 0.0
    return round(min(1.0, math.log1p(n_rows) / math.log1p(TARGET_SATURATION_ROWS)), 3)


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


def _target(inv: Investigation, scen: dict) -> tuple[float, list[dict], list[str]]:
    from app.services.coverage import countable, target_rows

    atm = scen["atmosphere"]
    o_min, p_max = atm["oxygen_pct_min"], atm["pressure_kpa_max"]
    runs = countable(inv.test_runs)
    t = target_rows(runs, o_min, p_max, include_stream=True)
    n = len(t["both"])
    if not n:
        return 0.0, [], [f"No PSI table row meets O2 >= {o_min:g} % and pressure <= {p_max:.2f} kPa on the same row."]
    m = target_match(n)
    cites = [{"type": "psi_experimental_table", "label": label("psi_experimental_table"), "url": inv.source_url,
              "excerpt": (f"{n} of {len(runs)} PSI table rows meet O2 >= {o_min:g} % AND pressure <= {p_max:.2f} kPa on the "
                          f"same row; match = log(1+{n})/log(1+{TARGET_SATURATION_ROWS}), capped at 1."),
              "rows": [r.source_row for r in t["both"][:50]]},
             {"type": "challenge_brief", "label": label("challenge_brief"), "excerpt": atm["source_text"], "url": CHALLENGE_URL}]
    return m, cites, []


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
    weights = WEIGHTS_TARGET if scen.get("atmosphere") else WEIGHTS_NO_TARGET
    parts = {
        **({"target_conditions": _target(inv, scen)} if scen.get("atmosphere") else {}),
        "material_fuel": _material(inv),
        "oxygen_atmosphere": _oxygen(inv, scen),
        "prevention_flame_behavior": _prevention(inv),
        "detection_suppression": _detect_suppress(inv),
        "habitat_applicability": _habitat(inv),
    }
    breakdown, total, flags = [], 0.0, []
    for k, (m, cites, fl) in parts.items():
        contrib = 100 * weights[k] * m
        total += contrib
        flags += fl
        breakdown.append({"criterion": k, "label": CRITERIA_LABELS[k], "short_label": CRITERIA_SHORT[k],
                          "weight": weights[k], "match": m,
                          "contribution": round(contrib, 1), "citations": cites, "flags": fl})
    lunar_rows = None
    if scen.get("atmosphere"):
        from app.services.coverage import target_rows
        lunar_rows = len(target_rows(inv.test_runs, scen["atmosphere"]["oxygen_pct_min"], scen["atmosphere"]["pressure_kpa_max"])["both"])
    return {"investigation": {"id": inv.id, "acronym": inv.acronym, "title": inv.title, "family": inv.family,
                              "fuel_class": inv.fuel_class, "source_url": inv.source_url, "is_ground": inv.is_ground,
                              "platform": inv.platform, "lenses": sorted((inv.lenses or {}).keys())},
            "score": round(total, 1), "score_label": SCORE_LABEL, "breakdown": breakdown, "flags": flags, "target_rows": lunar_rows}


def rank(session: Session, scenario: str = "lunar_habitat", ids: list[str] | None = None, lens: str | None = None,
         include_ground: bool = True) -> dict:
    if scenario not in SCENARIOS:
        raise KeyError(scenario)
    from app.services import snapshot

    # Scores depend only on the catalog, so each (scenario, filter) ranking is computed once per loaded catalog and
    # reused (every Explorer search ranks the whole catalog). The returned dict is shared: read it, don't mutate it.
    from app.services.lenses import LENSES

    build = lambda: _rank(snapshot.investigations(session), scenario, ids, lens, include_ground)  # noqa: E731
    if ids or (lens and lens not in LENSES):
        return build()  # caller-specific subsets are cheap and not worth a cache slot (keeps the cache bounded)
    return snapshot.memo(("rank", scenario, lens, include_ground), build)


def _rank(catalog: dict[str, Investigation], scenario: str, ids: list[str] | None, lens: str | None,
          include_ground: bool) -> dict:
    invs = [i for i in catalog.values() if not ids or i.id in ids]
    if lens:
        invs = [i for i in invs if lens in (i.lenses or {})]
    if not include_ground:
        invs = [i for i in invs if not i.is_ground]
    scen = SCENARIOS[scenario]
    rows = [score(i, scenario) for i in invs]
    tiered = bool(scen.get("atmosphere"))
    from app.services.serialize import completeness

    for r, inv in zip(rows, invs):
        # "tier" is a badge only (does any row meet the target on the same row?); it no longer affects the order.
        r["tier"] = ("documented_at_target" if r["target_rows"] else "not_at_target") if tiered else None
        r["data_completeness"] = completeness(inv)
    # sfsri-v0.4: the displayed score alone fixes the order (strictly by score, highest first). Ties: more rows at
    # target, then higher data completeness, then acronym, then id, so the order is deterministic.
    rows.sort(key=lambda r: (-r["score"], -(r["target_rows"] or 0), -r["data_completeness"],
                             r["investigation"]["acronym"].lower(), r["investigation"]["id"]))
    for n, r in enumerate(rows, 1):
        r["rank"] = n
    warnings = [RELEVANCE_DISCLAIMER]
    if scen.get("partial_gravity"):
        warnings.append(PARTIAL_GRAVITY_WARNING)
    if not scen.get("atmosphere"):
        warnings.append("Not established: the official brief gives no atmosphere target for this scenario.")
    return {"scenario": scenario, "scenario_label": scen["label"], "scenario_atmosphere": scen.get("atmosphere"),
            "ranking_version": RANKING_VERSION, "score_label": SCORE_LABEL,
            "weights": WEIGHTS_TARGET if tiered else WEIGHTS_NO_TARGET, "criteria_labels": CRITERIA_LABELS,
            "criteria_short": CRITERIA_SHORT,
            "score_formula": "scenario fit = 100 x sum(weight x match); match in [0,1]",
            "weights_note": "Weights are product hypotheses from the team PRD (section 9), pending domain-expert review.",
            "target_rule": (f"Tests at target conditions: match = log(1+n)/log(1+{TARGET_SATURATION_ROWS}), capped at 1, where n is "
                            "the number of PSI table rows meeting the O2 and pressure target on the same row.") if tiered else None,
            "order_note": ("Ordered by scenario fit alone, highest first. Ties go to more rows at the target, then higher data "
                           "completeness, then name."
                           + (" Tests at the brief's target conditions are part of the score (35 %), so investigations with "
                              "more such rows score higher." if tiered else "")),
            "warnings": warnings, "results": rows}
