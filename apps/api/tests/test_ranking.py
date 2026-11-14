import re

import pytest

from app.scenarios import SCENARIOS, SPACECRAFT_MATERIALS
from app.services import ranking

ALL = list(SCENARIOS)


def test_ranking_reproducible(session):
    a = ranking.rank(session, "lunar_habitat")
    b = ranking.rank(session, "lunar_habitat")
    assert [(r["investigation"]["id"], r["score"]) for r in a["results"]] == \
           [(r["investigation"]["id"], r["score"]) for r in b["results"]]


@pytest.mark.parametrize("scenario", ALL)
def test_score_is_sum_of_shown_points_and_bounded(session, scenario):
    out = ranking.rank(session, scenario)
    assert abs(sum(out["weights"].values()) - 1.0) < 1e-9
    for r in out["results"]:
        # the score is exactly the sum of the points shown in the breakdown (no hidden rounding mismatch)
        assert abs(sum(c["contribution"] for c in r["breakdown"]) - r["score"]) < 1e-6
        for c in r["breakdown"]:
            assert abs(c["contribution"] - round(100 * c["weight"] * c["match"], 1)) < 1e-6
            assert 0 <= c["contribution"] <= c["max_points"]
        assert 0 <= r["score"] <= 100


@pytest.mark.parametrize("scenario", ALL)
def test_nonzero_criteria_are_cited(session, scenario):
    for r in ranking.rank(session, scenario)["results"]:
        for c in r["breakdown"]:
            if c["match"] > 0:
                assert c["citations"], (r["investigation"]["id"], c["criterion"])


def test_unknown_atmosphere_is_flagged_not_credited(session):
    bass = next(r for r in ranking.rank(session, "lunar_habitat")["results"] if r["investigation"]["id"] == "psi-26")
    for k in ("target_conditions", "oxygen_match", "pressure_match"):
        c = next(c for c in bass["breakdown"] if c["criterion"] == k)
        assert c["match"] == 0
    assert any("not reported" in f for f in bass["flags"])
    assert "reports no oxygen or pressure" in bass["reason"]


def test_labels_and_warnings(client):
    j = client.get("/api/rank", params={"scenario": "lunar_habitat"}).json()
    assert any("NOT a hazard" in w for w in j["warnings"])
    assert any("partial-gravity" in w for w in j["warnings"])
    assert client.get("/api/rank", params={"scenario": "nope"}).status_code == 400


# ---- target atmospheres come only from official resources ----

def _resource_text() -> str:
    from pathlib import Path

    root = Path(__file__).resolve().parents[3] / "data" / "sources"
    parts = [p.read_text(errors="ignore") for p in (root / "challenge").glob("*.txt")]
    parts += [p.read_text(errors="ignore") for p in (root / "official").rglob("*.txt")]
    return re.sub(r"\s+", " ", " ".join(parts)).replace("\ufb01", "fi").replace("\ufb02", "fl")


def _norm(t: str) -> str:
    return re.sub(r"\s+", " ", t).replace("\u201c", '"').replace("\u201d", '"').replace("\u2019", "'").lower()


@pytest.mark.parametrize("scenario", ALL)
def test_every_atmosphere_quote_is_verbatim_in_an_official_resource(scenario):
    corpus = _norm(_resource_text())
    atm = SCENARIOS[scenario]["atmosphere"]
    quote = atm["source_text"].replace("The brief groups the planned Moon Base and pressurized rover(s) together. ", "")
    assert _norm(quote) in corpus, scenario
    for x in atm.get("extra_sources", []):
        assert _norm(x["text"].strip(". ")) in corpus
    assert atm["citation_url"].startswith("https://")


def test_material_quotes_are_verbatim():
    corpus = _norm(_resource_text())
    for m in SPACECRAFT_MATERIALS:
        assert _norm(m["quote"]) in corpus, m["name"]


def test_mars_claims_no_numeric_target(client):
    j = client.get("/api/rank", params={"scenario": "mars_habitat"}).json()
    atm = j["scenario_atmosphere"]
    assert atm["kind"] == "direction_only" and atm["numeric_target_stated"] is False
    assert "Not established" in atm["basis"]
    assert any("Not established" in w for w in j["warnings"])


def test_spacecraft_target_is_iss_air_with_labelled_convention():
    atm = SCENARIOS["spacecraft"]["atmosphere"]
    assert atm["o2_min"] <= 21 <= atm["o2_max"]
    assert atm["p_min_kpa"] <= 101.325 <= atm["p_max_kpa"]
    assert "nominally 21 percent" in atm["source_text"] and "Team convention" in atm["convention"]


# ---- sfsri-v0.5: one score fixes the order; same criteria for every scenario ----

@pytest.mark.parametrize("scenario", ALL)
def test_order_is_strictly_by_score_with_deterministic_ties(session, scenario):
    out = ranking.rank(session, scenario)
    assert out["ranking_version"] == "sfsri-v0.5" and out["score_label"] == "scenario fit"
    assert list(out["weights"]) == list(ranking.WEIGHTS)
    res = out["results"]
    assert [r["rank"] for r in res] == list(range(1, len(res) + 1))
    for a, b in zip(res, res[1:]):
        assert a["score"] >= b["score"], (scenario, a["investigation"]["acronym"], b["investigation"]["acronym"])
        if a["score"] == b["score"]:
            ka = (-(a["target_rows"] or 0), -a["data_completeness"], a["investigation"]["acronym"].lower())
            kb = (-(b["target_rows"] or 0), -b["data_completeness"], b["investigation"]["acronym"].lower())
            assert ka <= kb
            assert f"Same score as #{a['rank']}" in b["reason"]
        else:
            assert "Same score" not in b["reason"]
    for r in res:
        assert [c["criterion"] for c in r["breakdown"]] == list(out["weights"])
        assert all(c["short_label"] for c in r["breakdown"])


def test_atmosphere_criteria_lead_the_weights():
    w = ranking.WEIGHTS
    atm = w["target_conditions"] + w["oxygen_match"] + w["pressure_match"]
    assert atm > 0.5 and atm + w["material_fuel"] > 0.75
    assert w["prevention_flame_behavior"] < w["material_fuel"] and w["detection_suppression"] < w["material_fuel"]


def test_target_match_grows_with_rows_and_saturates():
    vals = [ranking.target_match(n) for n in (0, 1, 2, 8, 18, 48, 50, 500)]
    assert vals[0] == 0.0
    assert all(x < y for x, y in zip(vals[:6], vals[1:7]))
    assert vals[-2] == vals[-1] == 1.0


@pytest.mark.parametrize("scenario", ALL)
def test_atmosphere_components_match_row_counts(session, scenario):
    for r in ranking.rank(session, scenario)["results"]:
        a = r["atmosphere_rows"]
        b = {c["criterion"]: c for c in r["breakdown"]}
        assert a["both"] == r["target_rows"]
        assert b["target_conditions"]["match"] == ranking.target_match(a["both"])
        assert b["oxygen_match"]["match"] == ranking.target_match(a["oxygen"])
        assert b["pressure_match"]["match"] == ranking.target_match(a["pressure"])
        assert a["both"] <= min(a["oxygen"], a["pressure"]) or a["both"] == 0
        assert (r["tier"] == "documented_at_target") == bool(a["both"])


@pytest.mark.parametrize("scenario", ALL)
def test_reason_text_agrees_with_scores(session, scenario):
    out = ranking.rank(session, scenario)
    short = out["scenario_atmosphere"]["short"]
    for r in out["results"]:
        reason, a = r["reason"], r["atmosphere_rows"]
        assert reason.startswith(f"Ranks #{r['rank']}: ")
        if a["both"]:
            assert f"{a['both']} test row" in reason and short in reason
        else:
            assert "match " + short not in reason
            if a["oxygen"] and a["pressure"]:
                assert "never on the same row" in reason
            elif a["oxygen"]:
                assert f"O2 matches on {a['oxygen']} row" in reason
            elif a["pressure"]:
                assert f"pressure matches on {a['pressure']} row" in reason
        mat = next(c for c in r["breakdown"] if c["criterion"] == "material_fuel")
        if r["materials_named"]:
            assert mat["match"] == ranking.MATERIAL_MATCH["named"] and "named by NASA as spacecraft materials" in reason
            assert all(n in reason for n in r["materials_named"])
        else:
            assert "spacecraft materials)" not in reason


def test_lunar_target_counts_unchanged_from_coverage(session):
    """The generic matcher gives the same same-row counts as the coverage check for the brief's lunar target."""
    from app.services import snapshot
    from app.services.coverage import target_rows

    atm = SCENARIOS["lunar_habitat"]["atmosphere"]
    for inv in snapshot.investigations(session).values():
        assert ranking.atmosphere_rows(inv, atm)["both"] == target_rows(inv.test_runs, 30.0, atm["pressure_kpa_max"])["both"]


def test_named_spacecraft_materials_rank_above_plain_fuels_on_materials(session):
    res = {r["investigation"]["acronym"]: r for r in ranking.rank(session, "spacecraft")["results"]}
    for acr in ("BASS", "BASS-II", "SAFFIRE-I", "SAFFIRE-II", "SAFFIRE-III", "SAME", "SAME-R"):
        assert res[acr]["materials_named"], acr
    assert "PMMA (acrylic)" in res["BASS-II"]["materials_named"]


def test_explainer_present_and_plain(client):
    for sc in ALL:
        j = client.get("/api/rank", params={"scenario": sc}).json()
        assert len(j["explainer"]) >= 5 and all(isinstance(x, str) for x in j["explainer"])
        assert j["scenario_atmosphere"]["short"] in " ".join(j["explainer"])


def test_explorer_cards_carry_reason(client):
    j = client.get("/api/investigations", params={"scenario": "lunar_habitat"}).json()
    assert j["ranking"]["ranking_version"] == "sfsri-v0.5" and j["ranking"]["explainer"]
    for c in j["items"]:
        if c["relevance_rank"]:
            assert c["relevance_reason"].startswith(f"Ranks #{c['relevance_rank']}: ")
