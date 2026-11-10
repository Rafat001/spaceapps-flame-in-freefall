"""Application scenarios. Atmosphere targets come ONLY from the official challenge brief."""
from app.ingest.curation import CHALLENGE_URL
from app.units import PSI_KPA

_LUNAR = ("The intermediate oxygen concentration used on the Moon will likely be 30% or greater, with a corresponding "
          "pressure of 10.2 psi or less.")
_SUIT = ("To enable flexibility, spacesuits are filled with 100% oxygen to only 4.3 psi (pounds per square inch), where "
         "the Earth's pressure at sea level is 14.7 psi.")

SCENARIOS = {
    "lunar_habitat": {
        "label": "Lunar habitat (Moon Base)",
        "atmosphere": {"oxygen_pct_min": 30.0, "pressure_kpa_max": round(10.2 * PSI_KPA, 1),
                       "source_text": _LUNAR, "verification_status": "challenge_brief", "citation_url": CHALLENGE_URL,
                       "display": "O2 >= 30 % by volume; pressure <= 10.2 psi (about 70 kPa) — expected, per official brief"},
        "partial_gravity": True,
    },
    "pressurized_rover": {
        "label": "Pressurized lunar rover",
        "atmosphere": {"oxygen_pct_min": 30.0, "pressure_kpa_max": round(10.2 * PSI_KPA, 1),
                       "source_text": "The brief groups the planned Moon Base and pressurized rover(s) together. " + _LUNAR,
                       "verification_status": "challenge_brief", "citation_url": CHALLENGE_URL,
                       "display": "Same expectation as Moon Base per official brief"},
        "partial_gravity": True,
    },
    "spacecraft": {
        "label": "Spacecraft / space station cabin",
        "atmosphere": None,  # no atmosphere target given in the official brief
        "partial_gravity": False,
    },
    "mars_habitat": {
        "label": "Mars surface habitat",
        "atmosphere": None,  # Not established by the official brief
        "partial_gravity": True,
    },
}

REFERENCE_ATMOSPHERES = [
    {"label": "Spacesuit", "text": _SUIT, "verification_status": "challenge_brief", "citation_url": CHALLENGE_URL},
    {"label": "Moon Base / pressurized rover (expected)", "text": _LUNAR, "verification_status": "challenge_brief",
     "citation_url": CHALLENGE_URL},
]
