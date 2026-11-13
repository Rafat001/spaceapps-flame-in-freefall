"""FR-03: unknown values must not pass numeric filters."""
from app.models import Investigation, TestRun
from app.services import catalog


def _ids(client, **params):
    r = client.get("/api/investigations", params=params)
    assert r.status_code == 200
    return {x["id"] for x in r.json()["items"]}


def test_unknown_oxygen_never_passes(client, session):
    # Investigations with NO known oxygen value on any run must never appear for any oxygen filter.
    no_o2 = {i.id for i in session.query(Investigation).all()
             if all(r.oxygen_pct_min is None for r in i.test_runs)}
    assert {"psi-26", "psi-102", "psi-107"} <= no_o2  # BASS, SAME, SPICE tables list no oxygen
    for lo, hi in [(0, 100), (0, None), (None, 100), (20, 22)]:
        params = {k: v for k, v in (("oxygen_min", lo), ("oxygen_max", hi)) if v is not None}
        got = _ids(client, **params)
        assert not (got & no_o2), (params, got & no_o2)


def test_unknown_pressure_and_airflow_never_pass(client, session):
    for field, col in (("pressure", TestRun.pressure_kpa_min), ("airflow", TestRun.airflow_m_s_min)):
        known = {r[0] for r in session.query(TestRun.investigation_id).filter(col.is_not(None)).distinct()}
        got = _ids(client, **{f"{field}_min": 0})
        assert got and got <= known


def test_elevated_oxygen_filter_matches_source_values(client, session):
    got = _ids(client, oxygen_min=30)
    assert {"psi-69", "psi-159", "psi-20"} <= got  # FLEX, CFI-G, BRE list >= 30 % O2 rows
    for iid in got:
        runs = session.query(TestRun).filter_by(investigation_id=iid).all()
        assert any(r.oxygen_pct_max is not None and r.oxygen_pct_max >= 30 for r in runs)
    assert "psi-25" not in got  # BASS-II max listed O2 is 22.2 %


def test_pressure_unit_conversion_in_filter(client):
    assert _ids(client, pressure_max=10.2, pressure_unit="psi") == _ids(client, pressure_max=70.33, pressure_unit="kPa")


def test_same_run_semantics(session):
    # all numeric constraints must hold on the same test run
    o = catalog.NumericRange(30, None)
    p = catalog.NumericRange(None, 60)
    same = catalog.investigations_with_runs(session, o, p, catalog.NumericRange(), same_run=True)
    for iid in same:
        assert session.query(TestRun).filter(TestRun.investigation_id == iid, TestRun.oxygen_pct_max >= 30,
                                              TestRun.pressure_kpa_min <= 60).count() > 0


def test_text_and_categorical_filters(client):
    assert "psi-26" in _ids(client, q="BASS")
    assert _ids(client, fuel_class="liquid") == {"psi-69", "psi-68", "psi-39", "psi-117", "psi-142"}
    assert _ids(client, family="Saffire") == {"psi-98", "psi-99", "psi-100"}


def test_detail_marks_not_reported(client):
    d = client.get("/api/investigations/psi-26").json()
    assert d["conditions"]["oxygen"]["display"] == "Not reported"
    assert "oxygen" in d["missing_fields"]
    assert client.get("/api/investigations/nope").status_code == 404
