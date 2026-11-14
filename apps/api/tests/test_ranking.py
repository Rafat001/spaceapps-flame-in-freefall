from app.services import ranking


def test_ranking_reproducible(session):
    a = ranking.rank(session, "lunar_habitat")
    b = ranking.rank(session, "lunar_habitat")
    assert [(r["investigation"]["id"], r["score"]) for r in a["results"]] == \
           [(r["investigation"]["id"], r["score"]) for r in b["results"]]


def test_score_is_weighted_sum_and_bounded(session):
    out = ranking.rank(session, "lunar_habitat")
    assert abs(sum(out["weights"].values()) - 1.0) < 1e-9
    for r in out["results"]:
        s = sum(100 * c["weight"] * c["match"] for c in r["breakdown"])
        assert abs(s - r["score"]) < 0.11
        assert 0 <= r["score"] <= 100


def test_nonzero_criteria_are_cited_and_unknown_flagged(session):
    for r in ranking.rank(session, "lunar_habitat")["results"]:
        for c in r["breakdown"]:
            if c["match"] > 0:
                assert c["citations"], (r["investigation"]["id"], c["criterion"])
    bass = next(r for r in ranking.rank(session, "lunar_habitat")["results"] if r["investigation"]["id"] == "psi-26")
    ox = next(c for c in bass["breakdown"] if c["criterion"] == "oxygen_atmosphere")
    assert ox["match"] == 0 and ox["flags"]  # Not reported -> no positive match, flagged


def test_labels_and_warnings(client):
    j = client.get("/api/rank", params={"scenario": "lunar_habitat"}).json()
    assert any("NOT a hazard" in w for w in j["warnings"])
    assert any("partial-gravity" in w for w in j["warnings"])
    assert client.get("/api/rank", params={"scenario": "nope"}).status_code == 400


def test_mars_has_no_invented_atmosphere(client):
    j = client.get("/api/rank", params={"scenario": "mars_habitat"}).json()
    assert j["scenario_atmosphere"] is None
    assert any("Not established" in w for w in j["warnings"])


# ---- sfsri-v0.4: one score fixes the order ----
import pytest  # noqa: E402

from app.scenarios import SCENARIOS  # noqa: E402


@pytest.mark.parametrize("scenario", list(SCENARIOS))
def test_order_is_strictly_by_score_with_deterministic_ties(session, scenario):
    out = ranking.rank(session, scenario)
    assert out["ranking_version"] == "sfsri-v0.4" and out["score_label"] == "scenario fit"
    assert abs(sum(out["weights"].values()) - 1.0) < 1e-9
    res = out["results"]
    assert [r["rank"] for r in res] == list(range(1, len(res) + 1))
    for a, b in zip(res, res[1:]):
        assert a["score"] >= b["score"], (scenario, a["investigation"]["acronym"], b["investigation"]["acronym"])
        if a["score"] == b["score"]:
            ka = (-(a["target_rows"] or 0), -a["data_completeness"], a["investigation"]["acronym"].lower())
            kb = (-(b["target_rows"] or 0), -b["data_completeness"], b["investigation"]["acronym"].lower())
            assert ka <= kb
        for r in (a, b):
            assert [c["criterion"] for c in r["breakdown"]] == list(out["weights"])
            assert all(c["short_label"] for c in r["breakdown"])


def test_target_criterion_only_when_brief_gives_atmosphere(session):
    for scenario, scen in SCENARIOS.items():
        out = ranking.rank(session, scenario)
        assert ("target_conditions" in out["weights"]) == bool(scen.get("atmosphere"))
        assert (out["target_rule"] is not None) == bool(scen.get("atmosphere"))


def test_target_match_grows_with_rows_and_saturates():
    vals = [ranking.target_match(n) for n in (0, 1, 2, 8, 18, 48, 50, 500)]
    assert vals[0] == 0.0
    assert all(x < y for x, y in zip(vals[:6], vals[1:7]))
    assert vals[-2] == vals[-1] == 1.0


def test_more_rows_at_target_scores_higher_on_target_component(session):
    res = ranking.rank(session, "lunar_habitat")["results"]
    at = [r for r in res if r["target_rows"]]
    assert len(at) >= 2
    for r in res:
        tc = next(c for c in r["breakdown"] if c["criterion"] == "target_conditions")
        assert tc["match"] == ranking.target_match(r["target_rows"] or 0)
        assert (tc["match"] > 0) == bool(r["target_rows"]) == (r["tier"] == "documented_at_target")
        if tc["match"]:
            assert tc["citations"]
    at.sort(key=lambda r: r["target_rows"])
    tcs = [next(c["match"] for c in r["breakdown"] if c["criterion"] == "target_conditions") for r in at]
    assert tcs == sorted(tcs)
