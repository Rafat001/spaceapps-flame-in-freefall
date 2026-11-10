from app.units import oxygen_pct, parse_numeric, pressure_kpa, velocity_m_s


def test_parse_forms():
    assert parse_numeric("~ 21.5").approximate and parse_numeric("~ 21.5").vmin == 21.5
    p = parse_numeric("21.5 - 21.7")
    assert (p.vmin, p.vmax, p.kind) == (21.5, 21.7, "range")
    s = parse_numeric("0.17; 0.21;0.25; 0.3")
    assert (s.vmin, s.vmax, s.kind) == (0.17, 0.3, "set")
    assert parse_numeric("0.5; 1.0; 1.5; 2.0; or 3.0 ").vmax == 3.0
    for missing in ("", "n/a", "RAMPED", "Insignificant", "-"):
        assert not parse_numeric(missing).known


def test_oxygen_units_and_suspicious_values():
    assert oxygen_pct("0.21", "fraction").vmin == 21.0
    assert not oxygen_pct("3400%", "pct").known  # spreadsheet artefact: never reinterpreted
    assert "suspicious_percent_format" in oxygen_pct("3400%", "pct").flags
    assert not oxygen_pct("1.7", "fraction").known


def test_pressure_and_velocity_normalisation():
    assert abs(pressure_kpa("1 atm", None).vmin - 101.325) < 1e-9
    assert abs(pressure_kpa("760", "mmHg").vmin - 101.325) < 0.01
    assert not pressure_kpa("0", "mmHg").known  # zero ambient pressure: left unknown
    assert not pressure_kpa("2", None).known  # no unit -> unknown, never guessed
    assert velocity_m_s("20 cm/s", None).vmin == 0.2
    assert not velocity_m_s("-5.92", "cm/s").known
