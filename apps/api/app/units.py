"""Parsing and unit normalisation for values found in source tables.

Rules (see docs/FOUNDATION_BRIEF.md, "Scientific / quality rules"):
- Never guess. If a cell cannot be parsed unambiguously, return ``None`` (unknown).
- Keep the original source text next to every normalised value.
- Oxygen is normalised to percent by volume (mole fraction x 100, ideal-gas assumption).
  Oxygen percent is NOT pressure and NOT oxygen partial pressure.
- Pressure is normalised to kPa. Airflow / flow velocity to m/s.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

ATM_KPA = 101.325
PSI_KPA = 6.894757
MMHG_KPA = 0.1333224
BAR_KPA = 100.0

_NUM = r"[-+]?(?:\d+\.?\d*|\.\d+)"
_MISSING = {"", "n/a", "na", "none", "-", "--", "?", "ramped", "unknown", "not reported"}


@dataclass
class Parsed:
    """A parsed source value. ``vmin``/``vmax`` are equal for a single value."""

    vmin: float | None
    vmax: float | None
    source_text: str
    approximate: bool = False
    kind: str = "unknown"  # point | range | set | unknown
    flags: list[str] = field(default_factory=list)

    @property
    def known(self) -> bool:
        return self.vmin is not None and self.vmax is not None


def parse_numeric(text: str | None) -> Parsed:
    """Parse '~ 21.5', '21.5 - 21.7', '22.1 to 22.0', '0.17; 0.21;0.25; 0.3', '1.5 - 5', '30 cm/s'.

    Returns unknown for anything ambiguous (e.g. words other than units, percent signs on
    values that would not make sense, mixed content)."""
    raw = "" if text is None else str(text)
    t = raw.strip()
    if t.lower() in _MISSING:
        return Parsed(None, None, raw)
    approx = False
    if t.startswith("~") or t.lower().startswith("approx"):
        approx = True
        t = t.lstrip("~").strip()
        t = re.sub(r"^approx\.?\s*", "", t, flags=re.I)
    # strip a trailing simple unit token (handled by the caller)
    t = re.sub(r"\s*(cm/s|mm/s|m/s|atm|bar|psi|kpa|mmhg|mm|cm|%|percent)\s*$", "", t, flags=re.I)
    t = t.replace(" or ", ";").replace(",", ";")
    # range "a - b" or "a to b"
    m = re.fullmatch(rf"\s*({_NUM})\s*(?:-|–|to)\s*({_NUM})\s*", t)
    if m:
        a, b = float(m.group(1)), float(m.group(2))
        return Parsed(min(a, b), max(a, b), raw, approx, "range")
    parts = [p.strip() for p in t.split(";") if p.strip()]
    if parts and all(re.fullmatch(_NUM, p) for p in parts):
        vals = [float(p) for p in parts]
        if len(vals) == 1:
            return Parsed(vals[0], vals[0], raw, approx, "point")
        return Parsed(min(vals), max(vals), raw, approx, "set")
    return Parsed(None, None, raw, flags=["unparsed"])


def _scale(p: Parsed, factor: float) -> Parsed:
    if not p.known:
        return p
    return Parsed(p.vmin * factor, p.vmax * factor, p.source_text, p.approximate, p.kind, list(p.flags))


def oxygen_pct(text: str | None, source_kind: str) -> Parsed:
    """source_kind: 'pct' (percent by volume) or 'fraction' (mole fraction)."""
    p = parse_numeric(text)
    if not p.known:
        return p
    if source_kind == "fraction":
        if p.vmax > 1.0:
            return Parsed(None, None, p.source_text, flags=["out_of_range_fraction"])
        p = _scale(p, 100.0)
    elif source_kind == "pct":
        if "%" in p.source_text and p.vmax > 100:
            # e.g. a spreadsheet-formatted '3400%' - do not reinterpret, leave unknown.
            return Parsed(None, None, p.source_text, flags=["suspicious_percent_format"])
    if p.vmin < 0 or p.vmax > 100:
        return Parsed(None, None, p.source_text, flags=["out_of_range_percent"])
    return p


def pressure_kpa(text: str | None, unit: str | None) -> Parsed:
    """unit: 'atm' | 'mmHg' | 'bar' | 'psi' | 'kPa' | None (detect from text)."""
    raw = "" if text is None else str(text)
    u = unit
    if u is None:
        m = re.search(r"(atm|bar|psi|kpa|mmhg)\s*$", raw.strip(), flags=re.I)
        if not m:
            return Parsed(None, None, raw, flags=["no_unit"])
        u = m.group(1)
    factor = {"atm": ATM_KPA, "mmhg": MMHG_KPA, "bar": BAR_KPA, "psi": PSI_KPA, "kpa": 1.0}.get(u.lower())
    if factor is None:
        return Parsed(None, None, raw, flags=["unknown_unit"])
    p = parse_numeric(raw)
    p = _scale(p, factor)
    if p.known and (p.vmin <= 0 or p.vmax > 2000):
        # 0 or negative ambient pressure in a combustion table is not physical: leave unknown.
        return Parsed(None, None, raw, flags=["implausible_pressure_left_unknown"])
    return p


def velocity_m_s(text: str | None, unit: str | None) -> Parsed:
    """unit: 'cm/s' | 'mm/s' | 'm/s' | None (detect)."""
    raw = "" if text is None else str(text)
    u = unit
    if u is None:
        m = re.search(r"(cm/s|mm/s|m/s)\s*$", raw.strip(), flags=re.I)
        if not m:
            return Parsed(None, None, raw, flags=["no_unit"])
        u = m.group(1)
    factor = {"cm/s": 0.01, "mm/s": 0.001, "m/s": 1.0}.get(u.lower())
    if factor is None:
        return Parsed(None, None, raw, flags=["unknown_unit"])
    p = _scale(parse_numeric(raw), factor)
    if p.known and p.vmin < 0:
        # a negative flow speed in a source cell is ambiguous (sign convention? typo?): leave unknown.
        return Parsed(None, None, raw, flags=["negative_velocity_left_unknown"])
    return p


# ---- conversions for user input -------------------------------------------------

def to_kpa(value: float | None, unit: str) -> float | None:
    if value is None:
        return None
    return value * {"kpa": 1.0, "psi": PSI_KPA, "atm": ATM_KPA, "bar": BAR_KPA, "mmhg": MMHG_KPA}[unit.lower()]


def to_m_s(value: float | None, unit: str) -> float | None:
    if value is None:
        return None
    return value * {"m/s": 1.0, "cm/s": 0.01, "mm/s": 0.001}[unit.lower()]


def sig(x: float | None, digits: int = 3) -> float | None:
    """Round for display to a few significant figures (avoids fake precision)."""
    if x is None:
        return None
    if x == 0:
        return 0.0
    from math import floor, log10

    return round(x, -int(floor(log10(abs(x)))) + (digits - 1))
