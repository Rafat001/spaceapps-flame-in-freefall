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
