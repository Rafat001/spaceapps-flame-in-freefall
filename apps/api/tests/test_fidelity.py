"""Data fidelity: counts match the source CSVs, every table row is kept, flags are surfaced, nothing is hard-coded."""
import csv
import io
import json
from collections import Counter
from pathlib import Path

from app.config import settings
from app.ingest.table_specs import COUNTABLE_KINDS, SPECS
from app.models import Investigation, TestRun
from app.scenarios import SCENARIOS
from app.units import PSI_KPA

FIX = json.loads((Path(__file__).parent / "fixtures" / "expected_counts.json").read_text())


def test_countable_rows_per_investigation(session):
    got = Counter(r.investigation_id for r in session.query(TestRun).filter(TestRun.row_kind.in_(COUNTABLE_KINDS)))
    for iid, n in FIX["countable"].items():
        assert got.get(iid, 0) == n, iid
    assert session.query(Investigation).count() == len(FIX["countable"]) == 24


def test_subtables_and_non_test_rows(session):
    for iid, subs in FIX["by_subtable"].items():
        got = Counter(r.subtable for r in session.query(TestRun).filter_by(investigation_id=iid))
        assert dict(got) == subs
    for iid, kinds in FIX["non_test_rows"].items():
        got = Counter(r.row_kind for r in session.query(TestRun).filter_by(investigation_id=iid) if r.row_kind not in COUNTABLE_KINDS)
        assert dict(got) == kinds


def _independent_nonblank_rows(path: Path, encoding: str | None) -> int:
    raw = path.read_bytes()
    text = raw.decode(encoding) if encoding else raw.decode("utf-8-sig")
    return sum(1 for r in list(csv.reader(io.StringIO(text)))[1:] if any(c.strip() for c in r))


def test_every_csv_row_is_kept(session):
    """Independent re-count of non-blank data rows in each CSV equals the rows stored for that file."""
    for acc, specs in SPECS.items():
        for spec in specs:
            p = settings.data_dir / "sources" / "psi" / "experimental_tables" / spec["file"]
            expected = _independent_nonblank_rows(p, spec.get("encoding"))
            got = session.query(TestRun).filter_by(source_file=spec["file"]).count()
            assert got == expected, spec["file"]


def test_api_card_counts_match(client):
    items = {c["id"]: c for c in client.get("/api/investigations?page_size=100").json()["items"]}
    for iid, n in FIX["countable"].items():
        assert items[iid]["n_test_runs"] == n


def test_lunar_pressure_is_exact():
    atm = SCENARIOS["lunar_habitat"]["atmosphere"]
    assert atm["pressure_kpa_max"] == 10.2 * PSI_KPA
    assert abs(atm["pressure_kpa_max"] - 70.3265) < 1e-3


def test_lunar_target_rows_coverage_and_ranking_agree(client):
    cov = client.post("/api/coverage", json={"oxygen_min": 30, "pressure_max": 10.2, "pressure_unit": "psi"}).json()
    rk = {r["investigation"]["id"]: r for r in client.get("/api/rank").json()["results"]}
    by = {r["investigation"]["id"]: r for r in cov["results"]}
    for iid, exp in FIX["lunar_target"].items():
        if iid.startswith("_") or iid == "closest_miss":
            continue
        assert by[iid]["verdict"] == "documented_match"
        assert by[iid]["n_runs_full_match"] == exp["total"]
        assert rk[iid]["target_rows"] == exp["total"]
        for sub, n in exp.items():
            if sub != "total" and len(exp) > 2:
                assert by[iid]["full_match_by_subtable"][sub] == n
    matched = {i for i, r in by.items() if r["verdict"] == "documented_match"}
    assert matched == {k for k in FIX["lunar_target"] if k.startswith("psi-")}
    for iid, r in rk.items():
        assert (r["target_rows"] or 0) == by.get(iid, {}).get("n_runs_full_match", 0), iid
    cm = FIX["lunar_target"]["closest_miss"]["psi-69"]
    assert by["psi-69"]["closest_miss"]["source"]["row"] == cm["row"]
    assert by["psi-69"]["closest_miss"]["pressure"]["source_text"] == cm["pressure_source_text"]
    # FLEX must not get full atmosphere credit from separate rows (ranking bug fix)
    flex_atm = next(b for b in rk["psi-69"]["breakdown"] if b["criterion"] == "oxygen_atmosphere")
    assert flex_atm["match"] < 1.0
    assert "inverse flames" in cov["answer_text"] or "oxidizer-stream" in cov["answer_text"]


def test_inverse_stream_can_be_excluded(client):
    cov = client.post("/api/coverage", json={"oxygen_min": 30, "pressure_max": 10.2, "pressure_unit": "psi",
                                             "include_oxidizer_stream": False}).json()
    by = {r["investigation"]["id"]: r for r in cov["results"]}
    assert by["psi-159"]["n_runs_full_match"] == 20
    assert by["psi-10"]["verdict"] != "documented_match"


def test_data_quality_flags_are_surfaced(client):
    d = client.get("/api/investigations/psi-21").json()
    assert sum(1 for f in d["flags"] if f["code"] == "autofill_artifact_suspected") == 26
    flex = client.get("/api/investigations/psi-69").json()
    assert sum(1 for f in flex["flags"] if f["code"] == "encoding_decoded") == 32
    assert any(f["code"] == "implausible_value" and f["row"] == 115 for f in flex["flags"])
    s1 = client.get("/api/investigations/psi-98").json()
    assert {f["row"] for f in s1["flags"] if f["code"] == "possible_dimension_swap"} == {2, 3}


def test_ground_investigations_labelled_and_linked(client):
    for iid in ("psi-60", "psi-62", "psi-115", "psi-117", "psi-142"):
        d = client.get(f"/api/investigations/{iid}").json()
        assert d["is_ground"] is True
        assert any("Ground" in c for c in d["caveats"])
        assert d["relationships"], iid
        assert all(r["kind"] == "uses_flight_data_of" for r in d["relationships"])


def test_catalog_stats_computed_with_as_of(client):
    st = client.get("/api/stats").json()
    cat = st["catalog"]
    assert cat["combustion_science_total"] == 24 and cat["as_of"]
    assert cat["by_project_type"] == {"Ground Investigation": 5, "Microgravity Investigation": 19}
    assert st["accessed_at"].startswith("2026-")


def test_lunar_ranking_lists_target_matches_first(client):
    res = client.get("/api/rank?scenario=lunar_habitat").json()["results"]
    top = [r["investigation"]["acronym"] for r in res[:3]]
    assert set(top) == {"ACME CFI-G", "ACME/Flame Design", "FLEX-2"}
    assert all(r["tier"] == "documented_at_target" for r in res[:3])
    assert all(r["tier"] == "not_at_target" and r["target_rows"] == 0 for r in res[3:])
