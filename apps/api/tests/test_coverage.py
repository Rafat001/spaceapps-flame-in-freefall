def _cov(client, **body):
    r = client.post("/api/coverage", json=body)
    assert r.status_code == 200, r.text
    return r.json()


def _by_id(out):
    return {x["investigation"]["id"]: x for x in out["results"]}


def test_documented_match_same_run(client):
    out = _cov(client, fuel_class="liquid", oxygen_min=30, pressure_max=60, pressure_unit="kPa")
    res = _by_id(out)
    flex2 = res["psi-68"]  # FLEX-2 test matrix: O2 mole fraction up to 0.3, pressure down to 0.5 atm
    assert flex2["verdict"] == "documented_match"
    assert flex2["matching_runs"]
    for run in flex2["matching_runs"]:
        assert run["oxygen"]["max"] >= 30 and run["pressure"]["min"] <= 60
    assert res["psi-26"]["verdict"] != "documented_match"  # BASS is solid but O2 not reported


def test_unknown_is_reported_not_matched(client):
    res = _by_id(_cov(client, fuel_class="solid", oxygen_min=30))
    bass = res["psi-26"]
    assert bass["parameters"]["oxygen"] == "unknown"
    assert "oxygen" in bass["unknown_parameters"]
    assert bass["verdict"] == "partial_overlap"
    assert bass["overlap_score"] == 0.5


def test_material_and_airflow_units(client):
    a = _by_id(_cov(client, material="SIBAL", airflow_min=15, airflow_max=25, airflow_unit="cm/s"))
    b = _by_id(_cov(client, material="SIBAL", airflow_min=0.15, airflow_max=0.25, airflow_unit="m/s"))
    assert a["psi-98"]["verdict"] == b["psi-98"]["verdict"] == "documented_match"  # Saffire-I: SIBAL, 20 cm/s


def test_no_overlap_message_is_hedged(client):
    out = _cov(client, fuel_class="solid", oxygen_min=90)
    assert "not proof" in out["summary"]


def test_partial_gravity_warning(client):
    out = _cov(client, gravity_regime="lunar", fuel_class="solid")
    assert any("partial-gravity" in c for c in out["caveats"])
    assert all(x["parameters"]["gravity_regime"] == "mismatch" for x in out["results"])


def test_inverse_flame_oxygen_context(client):
    out = _cov(client, oxygen_min=80)
    cfig = _by_id(out)["psi-159"]
    assert cfig["verdict"] == "documented_match"
    assert any("oxidizer stream" in (r["oxygen"].get("context") or "") for r in cfig["matching_runs"])
