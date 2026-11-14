"""Deterministic, explainable scenario-fit ranking (PRD section 9), version sfsri-v0.5.

Scenario fit = sum of points, points = 100 x weight x match, match in [0, 1], weights sum to 1. Every scenario is
scored on the SAME six criteria, led by atmospheric and testing relevance read from the PSI experimental tables:

  Tests at target atmosphere 30 %  rows meeting the scenario's O2 AND pressure target on the SAME row
  Oxygen match               15 %  rows whose O2 matches the target (any pressure)
  Pressure match             10 %  rows whose pressure matches the target (any O2)
  Tested materials           25 %  named spacecraft materials tested (per NASA resources) > other solids > liquids/gases
  Flame behaviour evidence   10 %  flame spread / flammability / ignition / extinction terms in the PSI record
  Detection / suppression    10 %  suppression / smoke detection terms in the PSI record

The three atmosphere criteria are log-scaled by row count: match = log(1+n)/log(1+50), capped at 1, so the first
rows count most and more rows always earn more. Target atmospheres come only from official resources (see
app/scenarios.py). The score alone fixes the order (highest first; ties -> more rows at target, then data
completeness, then name). Weights are product hypotheses pending domain-expert review; they are NOT hazard
coefficients. Unknown values never match. Every non-zero criterion carries >= 1 citation.
"""
from __future__ import annotations

import math
import re

from sqlalchemy.orm import Session

from app.ingest.curation import CHALLENGE_URL
from app.labels import PARTIAL_GRAVITY_WARNING, RELEVANCE_DISCLAIMER, label
from app.models import Investigation
from app.scenarios import SCENARIOS, SPACECRAFT_MATERIALS

WEIGHTS = {
    "target_conditions": 0.30,
    "oxygen_match": 0.15,
    "pressure_match": 0.10,
    "material_fuel": 0.25,
    "prevention_flame_behavior": 0.10,
    "detection_suppression": 0.10,
}
# Rows needed for a full match on the atmosphere criteria. Log scale: the first rows count most
# (1 row = 0.18, 8 rows = 0.56, 18 rows = 0.75, 48 rows = 0.99, >= 50 rows = 1.0).
TARGET_SATURATION_ROWS = 50
CRITERIA_LABELS = {
    "target_conditions": "Tests at target atmosphere (O2 and pressure on the same row)",
    "oxygen_match": "Oxygen match",
    "pressure_match": "Pressure match",
    "material_fuel": "Tested materials",
    "prevention_flame_behavior": "Flame behaviour evidence",
    "detection_suppression": "Detection / suppression evidence",
}
CRITERIA_SHORT = {
    "target_conditions": "Target tests",
    "oxygen_match": "O2",
    "pressure_match": "Pressure",
    "material_fuel": "Materials",
    "prevention_flame_behavior": "Flame",
    "detection_suppression": "Detect/suppress",
}
# Tested-materials match. "named" = the PSI table names a material the NASA resources list as found on spacecraft.
MATERIAL_MATCH = {"named": 1.0, "solid": 0.8, "emulation": 0.6, "liquid": 0.4, "gaseous": 0.3, "aerosol": 0.0}
RANKING_VERSION = "sfsri-v0.5"
SCORE_LABEL = "scenario fit"
_MAT_RES = [(m, re.compile(m["pattern"], re.I)) for m in SPACECRAFT_MATERIALS]


def target_match(n_rows: int) -> float:
    """Evidence strength of n matching rows: log(1+n)/log(1+TARGET_SATURATION_ROWS), capped at 1."""
    if n_rows <= 0:
        return 0.0
    return round(min(1.0, math.log1p(n_rows) / math.log1p(TARGET_SATURATION_ROWS)), 3)


def _rows(n: int) -> str:
    return f"{n} test row{'' if n == 1 else 's'}"


def _tag_cite(inv: Investigation, tag: str) -> dict:
    t = inv.topics[tag]
    return {"type": "psi_metadata", "label": label("rule_tag"), "field": t["field"], "excerpt": t["excerpt"],
            "url": inv.source_url, "tag": tag}


def _o2_ok(r, atm: dict) -> bool:
    if r.oxygen_pct_min is None or r.oxygen_pct_max is None:
        return False
    lo, hi = atm.get("o2_min"), atm.get("o2_max")
    if lo is not None and (r.oxygen_pct_max <= lo if atm.get("o2_strict") else r.oxygen_pct_max < lo):
        return False
    return not (hi is not None and r.oxygen_pct_min > hi)


def _p_ok(r, atm: dict) -> bool:
    if r.pressure_kpa_min is None or r.pressure_kpa_max is None:
        return False
    lo, hi = atm.get("p_min_kpa"), atm.get("p_max_kpa")
    if hi is not None and (r.pressure_kpa_min >= hi if atm.get("p_strict") else r.pressure_kpa_min > hi):
        return False
    return not (lo is not None and r.pressure_kpa_max < lo)


def atmosphere_rows(inv: Investigation, atm: dict) -> dict:
    """Row counts against a scenario atmosphere (range overlap; unknown never matches). For the lunar target this is
    identical to coverage.target_rows (O2 max >= 30 and pressure min <= 70.33 kPa)."""
    from app.services.coverage import countable

    runs = countable(inv.test_runs)
    o = [r for r in runs if _o2_ok(r, atm)]
    p = [r for r in runs if _p_ok(r, atm)]
    both = [r for r in o if _p_ok(r, atm)]
    return {"runs": runs, "o2": o, "pressure": p, "both": both, "stream": [r for r in both if r.oxygen_is_stream],
            "o2_reported": sum(r.oxygen_pct_min is not None for r in runs),
            "p_reported": sum(r.pressure_kpa_min is not None for r in runs)}


def _atm_cites(inv: Investigation, atm: dict, excerpt: str, rows: list) -> list[dict]:
    return [{"type": "psi_experimental_table", "label": label("psi_experimental_table"), "url": inv.source_url,
             "excerpt": excerpt, "rows": [r.source_row for r in rows[:50]]},
            {"type": atm["verification_status"], "label": atm["source_label"], "excerpt": atm["source_text"],
             "url": atm["citation_url"]}]


def _target(inv: Investigation, atm: dict, a: dict) -> tuple[float, list[dict], list[str]]:
    n = len(a["both"])
    if not n:
        return 0.0, [], [f"No PSI table row matches {atm['short']} on the same row."]
    flags = []
    if a["stream"]:
        flags.append(f"{len(a['stream'])} of {n} matching rows give the O2 of a burner oxidizer stream (inverse flames), "
                     "not the room atmosphere; counted per team decision D5.")
    if any(r.row_kind == "test_matrix" for r in a["both"]):
        flags.append("Some matching rows come from a planned test matrix (ranges), not individual runs.")
    ex = (f"{n} of {len(a['runs'])} PSI table rows match {atm['short']} on the same row; "
          f"match = log(1+{n})/log(1+{TARGET_SATURATION_ROWS}), capped at 1.")
    return target_match(n), _atm_cites(inv, atm, ex, a["both"]), flags


def _single(inv: Investigation, atm: dict, a: dict, which: str) -> tuple[float, list[dict], list[str]]:
    rows = a["o2"] if which == "o2" else a["pressure"]
    reported = a["o2_reported"] if which == "o2" else a["p_reported"]
    what = "Oxygen" if which == "o2" else "Pressure"
    target = atm["o2_text"] if which == "o2" else atm["p_text"]
    if not reported:
        return 0.0, [], [f"{what}: not reported in the PSI experimental table (no positive match)."]
    if not rows:
        return 0.0, [], [f"{what}: {reported} rows report it, none at {target}."]
    ex = f"{len(rows)} of {reported} rows reporting {what.lower()} are at {target}."
    return target_match(len(rows)), _atm_cites(inv, atm, ex, rows), []


def named_materials(inv: Investigation) -> dict[str, int]:
    """Spacecraft materials (as named in the NASA resources) found in this investigation's PSI table rows."""
    from app.services.coverage import countable

    out: dict[str, int] = {}
    for r in countable(inv.test_runs):
        text = f"{r.material or ''} {r.material_normalized or ''}"
        for m, rx in _MAT_RES:
            if rx.search(text):
                out[m["name"]] = out.get(m["name"], 0) + 1
    return out


def _material(inv: Investigation) -> tuple[float, list[dict], list[str], str]:
    flags: list[str] = []
    named = named_materials(inv) if inv.fuel_class == "solid" else {}
    basis_cite = {"type": "challenge_brief", "label": label("challenge_brief"), "excerpt": inv.fuel_class_basis,
                  "url": CHALLENGE_URL}
    if inv.is_ground:
        basis_cite = {"type": "psi_metadata", "label": label("psi_metadata"), "excerpt": inv.fuel_class_basis,
                      "url": inv.source_url}
        flags.append("Ground (modeling / lab) study: fuel class inherited from the flight data it reuses.")
    if named:
        names = sorted(named, key=lambda k: -named[k])
        srcs = {m["name"]: m for m in SPACECRAFT_MATERIALS}
        cites = [{"type": "psi_experimental_table", "label": label("psi_experimental_table"), "url": inv.source_url,
                  "excerpt": "Rows naming the material: " + ", ".join(f"{k} ({named[k]})" for k in names) + "."}]
        for src in {srcs[k]["url"]: srcs[k] for k in names}.values():
            cites.append({"type": "nasa_reference", "label": src["source"], "excerpt": src["quote"], "url": src["url"]})
        return MATERIAL_MATCH["named"], cites, flags, "tested " + ", ".join(names) + " (named by NASA as spacecraft materials)"
    if inv.fuel_class == "solid":
        note = "solid fuel, but its PSI table names no spacecraft material" if inv.test_runs else "solid fuel"
        return MATERIAL_MATCH["solid"], [basis_cite], flags, note
    if inv.solid_emulation:
        flags.append("Gaseous burner emulating solid-material burning (per official brief).")
        return MATERIAL_MATCH["emulation"], [basis_cite], flags, "gas burner that emulates burning solids"
    if inv.fuel_class == "aerosol":
        flags.append("No combustion fuel (dust aerosol instrument test).")
        return 0.0, [], flags, "no fuel burned (dust / aerosol test)"
    m = MATERIAL_MATCH.get(inv.fuel_class, 0.0)
    return m, ([basis_cite] if m else []), flags, f"{inv.fuel_class} fuel, not a cabin material"


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


def _atm_phrase(atm: dict, a: dict) -> str:
    n, no, npr = len(a["both"]), len(a["o2"]), len(a["pressure"])
    if n:
        k = len(a["stream"])
        extra = (" (O2 of a burner stream, not room air)" if k == n else f" ({k} with burner-stream O2)" if k else "")
        return f"{_rows(n)} match {atm['short']}{extra}"
    if not a["runs"]:
        return "no PSI test table (ground / modeling study)"
    if not a["o2_reported"] and not a["p_reported"]:
        return "its PSI table reports no oxygen or pressure"
    if no and npr:
        return f"O2 matches on {no} rows and pressure on {npr}, but never on the same row"
    oc = (f"O2 matches on {no} row{'' if no == 1 else 's'}" if no else
          f"no rows at {atm['o2_text']}" if a["o2_reported"] else "O2 not reported")
    pc = (f"pressure matches on {npr} row{'' if npr == 1 else 's'}" if npr else
          f"pressure never at {atm['p_text']}" if a["p_reported"] else "pressure not reported")
    return f"{oc}, {pc}"


def score(inv: Investigation, scenario: str) -> dict:
    scen = SCENARIOS[scenario]
    atm = scen["atmosphere"]
    a = atmosphere_rows(inv, atm)
    m_mat, c_mat, f_mat, mat_note = _material(inv)
    parts = {
        "target_conditions": _target(inv, atm, a),
        "oxygen_match": _single(inv, atm, a, "o2"),
        "pressure_match": _single(inv, atm, a, "pressure"),
        "material_fuel": (m_mat, c_mat, f_mat),
        "prevention_flame_behavior": _prevention(inv),
        "detection_suppression": _detect_suppress(inv),
    }
    breakdown, total, flags = [], 0.0, []
    for k, (m, cites, fl) in parts.items():
        contrib = round(100 * WEIGHTS[k] * m, 1)
        total += contrib
        flags += fl
        breakdown.append({"criterion": k, "label": CRITERIA_LABELS[k], "short_label": CRITERIA_SHORT[k],
                          "weight": WEIGHTS[k], "match": m, "max_points": round(100 * WEIGHTS[k], 1),
                          "contribution": contrib, "citations": cites, "flags": fl})
    return {"investigation": {"id": inv.id, "acronym": inv.acronym, "title": inv.title, "family": inv.family,
                              "fuel_class": inv.fuel_class, "source_url": inv.source_url, "is_ground": inv.is_ground,
                              "platform": inv.platform, "lenses": sorted((inv.lenses or {}).keys())},
            "score": round(total, 1), "score_label": SCORE_LABEL, "breakdown": breakdown, "flags": flags,
            "target_rows": len(a["both"]),
            "atmosphere_rows": {"both": len(a["both"]), "oxygen": len(a["o2"]), "pressure": len(a["pressure"]),
                                "burner_stream": len(a["stream"]), "oxygen_reported": a["o2_reported"],
                                "pressure_reported": a["p_reported"], "total": len(a["runs"])},
            "materials_named": named_materials(inv) if inv.fuel_class == "solid" else {},
            "why": {"atmosphere": _atm_phrase(atm, a), "materials": mat_note}}


def _tie_reason(a: dict, b: dict) -> str:
    """Why `a` is listed before `b` when their scores are equal."""
    if (a["target_rows"] or 0) != (b["target_rows"] or 0):
        return "more test rows at the target atmosphere"
    if a["data_completeness"] != b["data_completeness"]:
        return "a more complete PSI record"
    return "alphabetical order"


def explainer(scenario: str) -> list[str]:
    atm = SCENARIOS[scenario]["atmosphere"]
    pts = {k: round(100 * w) for k, w in WEIGHTS.items()}
    return [
        "Each investigation gets one score out of 100, and the list always runs from highest to lowest.",
        (f"Most points ({pts['target_conditions'] + pts['oxygen_match'] + pts['pressure_match']}) come from the PSI "
         f"test tables: up to {pts['target_conditions']} for test rows that match the target atmosphere ({atm['short']}) "
         f"on the same row, up to {pts['oxygen_match']} for rows with matching oxygen, and up to {pts['pressure_match']} "
         "for rows with matching pressure. More matching rows earn more points, but the first few count most."),
        (f"Up to {pts['material_fuel']} points for the materials tested: full points for materials NASA names as found on "
         "spacecraft (cotton-fiberglass, Nomex, acrylic/PMMA, Teflon, Kapton, silicone rubber), fewer for other solids, "
         "and fewer still for liquid or gas fuels."),
        (f"Up to {pts['prevention_flame_behavior']} points for flame behaviour evidence (flame spread, flammability, "
         f"ignition, extinction) and up to {pts['detection_suppression']} for detection or suppression evidence."),
        "Equal scores are broken by more rows at the target, then a more complete PSI record, then name.",
        f"Where the target comes from: {atm['basis']}",
        "This is research fit, not a hazard or safety rating.",
    ]


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
    atm = scen["atmosphere"]
    rows = [score(i, scenario) for i in invs]
    from app.services.serialize import completeness

    for r, inv in zip(rows, invs):
        r["tier"] = "documented_at_target" if r["target_rows"] else "not_at_target"  # badge only; never affects order
        r["data_completeness"] = completeness(inv)
    # The displayed score alone fixes the order (highest first). Ties: more rows at target, then higher data
    # completeness, then acronym, then id, so the order is deterministic.
    rows.sort(key=lambda r: (-r["score"], -(r["target_rows"] or 0), -r["data_completeness"],
                             r["investigation"]["acronym"].lower(), r["investigation"]["id"]))
    for n, r in enumerate(rows, 1):
        r["rank"] = n
    for i, r in enumerate(rows):
        tie = ""
        if i > 0 and rows[i - 1]["score"] == r["score"]:
            p = rows[i - 1]
            tie = (f" Same score as #{p['rank']} {p['investigation']['acronym']}, which is listed first because it has "
                   f"{_tie_reason(p, r)}.")
        r["reason"] = f"Ranks #{r['rank']}: {r['why']['atmosphere']}; {r['why']['materials']}.{tie}"
    warnings = [RELEVANCE_DISCLAIMER]
    if scen.get("partial_gravity"):
        warnings.append(PARTIAL_GRAVITY_WARNING)
    if not atm.get("numeric_target_stated"):
        warnings.append("Not established: the official resources state no numeric atmosphere for this scenario. "
                        "Only the direction NASA describes for exploration atmospheres (elevated oxygen, reduced "
                        "pressure) is scored.")
    return {"scenario": scenario, "scenario_label": scen["label"], "scenario_atmosphere": atm,
            "ranking_version": RANKING_VERSION, "score_label": SCORE_LABEL,
            "weights": WEIGHTS, "criteria_labels": CRITERIA_LABELS, "criteria_short": CRITERIA_SHORT,
            "material_match": MATERIAL_MATCH, "spacecraft_materials": SPACECRAFT_MATERIALS,
            "score_formula": "scenario fit = sum of points; points = 100 x weight x match; match in [0,1]",
            "weights_note": "Weights are product hypotheses from the team PRD (section 9), pending domain-expert review.",
            "target_rule": (f"Atmosphere criteria: match = log(1+n)/log(1+{TARGET_SATURATION_ROWS}), capped at 1, where n "
                            "is the number of PSI table rows that match (same row for 'Tests at target atmosphere')."),
            "order_note": ("Ordered by scenario fit alone, highest first. Ties go to more rows at the target, then higher "
                           "data completeness, then name."),
            "explainer": explainer(scenario),
            "warnings": warnings, "results": rows}
