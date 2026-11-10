"""Deterministic, auditable keyword tagging over PSI metadata text.

Each tag records the field and the sentence where its trigger term occurred, so the UI
and the ranking can cite it. Tags are a curator aid ("rule-based classification"), not findings.
"""
from __future__ import annotations

import re

TOPIC_RULES: dict[str, list[str]] = {
    "flame_spread": [r"flame spread", r"spread rate"],
    "flammability": [r"flammab"],
    "ignition": [r"\bignit"],
    "extinction": [r"extinction", r"extinguish", r"quench"],
    "suppression": [r"suppress", r"extinguishing agent", r"fire suppression"],
    "smoke_detection": [r"smoke detect", r"fire detect", r"smoke", r"aerosol"],
    "soot": [r"\bsoot"],
    "cool_flames": [r"cool flame"],
    "droplet_combustion": [r"droplet"],
    "burning_rate": [r"burning rate", r"burn rate", r"mass loss"],
    "radiation": [r"radiat"],
    "oxygen_variation": [r"oxygen concentration", r"\bo2\b", r"oxygen-enriched", r"elevated oxygen", r"oxygen mole fraction"],
    "airflow": [r"air ?flow", r"flow velocity", r"opposed[- ]flow", r"concurrent[- ]flow", r"co-?flow", r"ventilation"],
    "spacecraft_scale": [r"spacecraft", r"cygnus", r"large[- ]scale"],
    "crew_habitat": [r"\bcrew", r"habitat", r"exploration vehicle", r"lunar", r"\bmars\b", r"\bmoon\b"],
    "materials_selection": [r"material selection", r"materials selection", r"nasa[- ]std[- ]6001"],
}

MEASUREMENT_RULES: dict[str, list[str]] = {
    "imaging (video/camera)": [r"camera", r"video", r"imag", r"photograph"],
    "temperature (thermocouple/pyrometry)": [r"thermocouple", r"pyromet", r"temperature measure"],
    "radiometry": [r"radiometer"],
    "aerosol / particle instruments": [r"p-trak", r"dusttrak", r"particle count", r"aerosol instrument", r"ionization", r"photoelectric", r"particle size"],
    "gas composition": [r"gas analy", r"\bco2\b", r"\bco\b", r"oxygen sensor", r"gas chromat"],
    "mass / weight loss": [r"weight loss", r"mass loss"],
    "flow measurement": [r"anemomet", r"flow rate", r"mass flow controller", r"\bmfc\b"],
}

_SENT = re.compile(r"(?<=[.!?])\s+")


def _find(text: str, patterns: list[str]) -> str | None:
    for sent in _SENT.split(text or ""):
        for p in patterns:
            if re.search(p, sent, flags=re.I):
                return sent.strip()[:400]
    return None


def tag_fields(fields: dict[str, str], rules: dict[str, list[str]]) -> dict[str, dict]:
    """Return {tag: {"field": name, "excerpt": sentence}} for the first field that triggers a tag."""
    out: dict[str, dict] = {}
    for tag, patterns in rules.items():
        for fname, text in fields.items():
            hit = _find(text, patterns)
            if hit:
                out[tag] = {"field": fname, "excerpt": hit}
                break
    return out
