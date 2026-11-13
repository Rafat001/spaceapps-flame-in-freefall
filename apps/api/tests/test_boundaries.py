"""T11: the lunar pressure ceiling (10.2 psi, official brief) is the same boundary in every unit the UI offers."""
import pytest

from app.units import ATM_KPA, BAR_KPA, MMHG_KPA, PSI_KPA, pressure_kpa, to_kpa

CEIL_KPA = 10.2 * PSI_KPA  # 70.3265 kPa


@pytest.mark.parametrize("value,unit", [(10.2, "psi"), (527.49, "mmHg"), (0.703265, "bar"), (0.694068, "atm"), (70.3265, "kPa")])
def test_ceiling_equivalents(value, unit):
    assert abs(to_kpa(value, unit) - CEIL_KPA) < 0.002


def test_ceiling_display_values():
    assert round(CEIL_KPA, 4) == 70.3265
    assert round(CEIL_KPA / MMHG_KPA, 2) == 527.49
    assert round(CEIL_KPA / BAR_KPA, 4) == 0.7033
    assert round(CEIL_KPA / ATM_KPA, 4) == 0.6941


def test_parsed_text_matches_numeric_conversion():
    assert abs(pressure_kpa("10.2 psi", None).vmin - CEIL_KPA) < 1e-9
    assert abs(pressure_kpa("527.49", "mmHg").vmin - CEIL_KPA) < 0.002


@pytest.mark.parametrize("unit,value", [("psi", 10.2), ("mmHg", 527.49), ("bar", 0.703265), ("atm", 0.694068), ("kPa", 70.3265)])
def test_coverage_same_answer_in_every_unit(client, unit, value):
    r = client.post("/api/coverage", json={"oxygen_min": 30, "pressure_max": value, "pressure_unit": unit}).json()
    full = {x["investigation"]["acronym"]: x["n_runs_full_match"] for x in r["results"] if x["n_runs_full_match"]}
    assert full == {"ACME CFI-G": 48, "ACME/Flame Design": 18, "FLEX-2": 8}


def test_flex_closest_miss_is_just_above_ceiling(client):
    r = client.post("/api/coverage", json={"oxygen_min": 30, "pressure_max": 10.2, "pressure_unit": "psi"}).json()
    flex = next(x for x in r["results"] if x["investigation"]["acronym"] == "FLEX")
    assert flex["n_runs_full_match"] == 0


def test_earth_links_labelled(client):
    items = client.get("/api/earth").json()["resource_items"]
    assert items and all(l["kind"] in ("Documented", "Inferred") for it in items for l in it.get("links", []))
    assert all(q.get("provenance") and q.get("locator") for it in items for q in it["quotes"])
    assert all(it["quotes"] for it in items)


def test_lunar_points_are_countable_and_cited(client):
    pts = client.get("/api/lunar/points").json()["points"]
    assert len(pts) > 0
    assert all(p["row"] and p["acronym"] for p in pts)
    assert sum(p["in_target"] for p in pts) == 74
