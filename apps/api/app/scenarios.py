"""Application scenarios and their target atmospheres.

Every value here is quoted from an official challenge resource (the brief, or a NASA reference listed on the
challenge Resources tab). Nothing is invented: when a resource gives only a direction (Mars), the scenario says so
and no numeric target is claimed. The small tolerance band around "nominal" ISS air is a stated team convention,
not a NASA value, and is labelled as such in the API and UI.
"""
from app.ingest.curation import CHALLENGE_URL
from app.units import PSI_KPA

GUIDE_URL = ("https://www.nasa.gov/wp-content/uploads/2016/05/"
             "np-2015-10-034-jsc_combustion_in_reduced_gravity-iss-mini-book-011116-508.pdf")
GUIDE_LABEL = "NASA guide: Combustion in Reduced Gravity on the ISS (official resource)"

_LUNAR = ("The intermediate oxygen concentration used on the Moon will likely be 30% or greater, with a corresponding "
          "pressure of 10.2 psi or less.")
_SUIT = ("To enable flexibility, spacesuits are filled with 100% oxygen to only 4.3 psi (pounds per square inch), where "
         "the Earth's pressure at sea level is 14.7 psi.")
_ISS_AIR = ("The glovebox is normally limited to ISS \u201cair,\u201d nominally 21 percent oxygen by volume and one "
            "atmospheric pressure.")
_EXPLORATION = ("SoFIE can accommodate testing in exploration atmospheres with reduced pressure and elevated oxygen")
_HABITATS = ("...the fire safety needs of habitable crew environments, including spacecraft, space stations, bases on "
             "the lunar and Martian surfaces, and pressurized rovers.")

ATM_PSI = 14.7          # "the Earth's pressure at sea level is 14.7 psi" (official brief); one atmosphere
NOMINAL_O2_BAND = 1.0   # team convention: "nominally 21 %" counts 20-22 % O2
NOMINAL_P_BAND_PSI = 0.5  # team convention: "one atmosphere" counts 14.2-15.2 psi

_LUNAR_ATM = {
    "kind": "numeric_target", "numeric_target_stated": True,
    "o2_min": 30.0, "o2_max": None, "o2_strict": False,
    "p_min_kpa": None, "p_max_kpa": 10.2 * PSI_KPA, "p_strict": False,
    # legacy keys (coverage check, lunar page, overview helper)
    "oxygen_pct_min": 30.0, "pressure_kpa_max": 10.2 * PSI_KPA, "pressure_psi_max": 10.2,
    "o2_text": "30 % O2 or more", "p_text": "10.2 psi or less",
    "short": "\u226530 % O2 and \u226410.2 psi",
    "source_text": _LUNAR, "source_label": "Official challenge brief", "verification_status": "challenge_brief",
    "citation_url": CHALLENGE_URL, "convention": None,
}

SCENARIOS = {
    "lunar_habitat": {
        "label": "Lunar habitat (Moon Base)",
        "atmosphere": {**_LUNAR_ATM,
                       "display": "O2 \u2265 30 % by volume; pressure \u2264 10.2 psi (70.33 kPa), expected, per official brief",
                       "basis": "Stated in the official brief for the Moon Base."},
        "partial_gravity": True,
    },
    "pressurized_rover": {
        "label": "Pressurized lunar rover",
        "atmosphere": {**_LUNAR_ATM,
                       "source_text": "The brief groups the planned Moon Base and pressurized rover(s) together. " + _LUNAR,
                       "display": "O2 \u2265 30 %; pressure \u2264 10.2 psi, same expectation as the Moon Base, per official brief",
                       "basis": "Stated in the official brief for the Moon Base and pressurized rover(s)."},
        "partial_gravity": True,
    },
    "spacecraft": {
        "label": "Spacecraft / space station cabin",
        "atmosphere": {
            "kind": "numeric_target", "numeric_target_stated": True,
            "o2_min": 21.0 - NOMINAL_O2_BAND, "o2_max": 21.0 + NOMINAL_O2_BAND, "o2_strict": False,
            "p_min_kpa": (ATM_PSI - NOMINAL_P_BAND_PSI) * PSI_KPA, "p_max_kpa": (ATM_PSI + NOMINAL_P_BAND_PSI) * PSI_KPA,
            "p_strict": False,
            "o2_text": "about 21 % O2", "p_text": "about 1 atm (14.7 psi)",
            "short": "ISS air (\u224821 % O2, \u224814.7 psi)",
            "display": "ISS air: nominally 21 % O2 at one atmosphere (14.7 psi), per NASA's ISS combustion guide",
            "source_text": _ISS_AIR, "source_label": GUIDE_LABEL + ", p. 19", "verification_status": "nasa_reference",
            "citation_url": GUIDE_URL + "#page=19",
            "extra_sources": [{"text": _SUIT, "label": "Official challenge brief (14.7 psi = Earth sea level)",
                               "url": CHALLENGE_URL}],
            "convention": ("Team convention: 'nominally 21 %' is matched as 20\u201322 % O2 and 'one atmosphere' as "
                           "14.2\u201315.2 psi (97.9\u2013104.8 kPa). These bands are ours, not NASA values."),
            "basis": ("The brief gives no cabin atmosphere. NASA's ISS combustion guide (an official resource) states the "
                      "ISS cabin 'air' is nominally 21 % O2 at one atmosphere; the brief gives one atmosphere as 14.7 psi."),
        },
        "partial_gravity": False,
    },
    "mars_habitat": {
        "label": "Mars surface habitat",
        "atmosphere": {
            "kind": "direction_only", "numeric_target_stated": False,
            # direction relative to ISS air (the only documented baseline): above its O2 band, below its pressure band
            "o2_min": 21.0 + NOMINAL_O2_BAND, "o2_max": None, "o2_strict": True,
            "p_min_kpa": None, "p_max_kpa": (ATM_PSI - NOMINAL_P_BAND_PSI) * PSI_KPA, "p_strict": True,
            "o2_text": "more than 22 % O2", "p_text": "less than 14.2 psi",
            "short": "elevated O2 (>22 %) at reduced pressure (<14.2 psi)",
            "display": ("No Mars habitat atmosphere is stated in the official resources. Scored on direction only: "
                        "elevated O2 and reduced pressure, as NASA describes exploration atmospheres"),
            "source_text": _EXPLORATION, "source_label": GUIDE_LABEL + ", p. 38", "verification_status": "nasa_reference",
            "citation_url": GUIDE_URL + "#page=38",
            "extra_sources": [{"text": _HABITATS, "label": "Official challenge brief (Martian bases are a target environment)",
                               "url": CHALLENGE_URL}],
            "convention": ("No numeric Mars target exists in the resources. 'Elevated' and 'reduced' are measured against "
                           "ISS air (team band 20\u201322 % O2, 14.2\u201315.2 psi): O2 above 22 %, pressure below 14.2 psi."),
            "basis": ("Not established: the official resources give no Mars habitat atmosphere. NASA's ISS combustion "
                      "guide describes exploration atmospheres only as 'reduced pressure and elevated oxygen', so only "
                      "that direction is scored."),
        },
        "partial_gravity": True,
    },
}

REFERENCE_ATMOSPHERES = [
    {"label": "Spacesuit", "text": _SUIT, "verification_status": "challenge_brief", "citation_url": CHALLENGE_URL},
    {"label": "Moon Base / pressurized rover (expected)", "text": _LUNAR, "verification_status": "challenge_brief",
     "citation_url": CHALLENGE_URL},
    {"label": "ISS cabin air", "text": _ISS_AIR, "verification_status": "nasa_reference", "citation_url": GUIDE_URL + "#page=19"},
    {"label": "Exploration atmospheres (direction only)", "text": _EXPLORATION, "verification_status": "nasa_reference",
     "citation_url": GUIDE_URL + "#page=38"},
]

# Materials the official resources name as found on spacecraft (used by the "Tested materials" criterion).
_SAFFIRE_URL = "https://www.nasa.gov/wp-content/uploads/2025/07/spacecraft-fire-safety-demonstration-saffire.pdf"
_SAME_URL = "https://www.nasa.gov/wp-content/uploads/2025/07/smoke-aerosol-measurement-experiment-same.pdf"
_SAFFIRE_Q = ("The nine samples in the experiment kit include a cotton-fiberglass blend, Nomex, and the same acrylic glass "
              "that is used for spacecraft windows.")
_SAME_Q = "different types of material found on spacecraft such as, Teflon, Kapton, cellulose and silicone rubber"
SPACECRAFT_MATERIALS = [
    {"name": "cotton-fiberglass (SIBAL)", "pattern": r"sibal|cotton[- ]?fiberglass", "quote": _SAFFIRE_Q,
     "source": "NASA Saffire fact sheet (official resource)", "url": _SAFFIRE_URL},
    {"name": "Nomex", "pattern": r"nomex", "quote": _SAFFIRE_Q, "source": "NASA Saffire fact sheet (official resource)",
     "url": _SAFFIRE_URL},
    {"name": "PMMA (acrylic)", "pattern": r"pmma|acrylic", "quote": _SAFFIRE_Q,
     "source": "NASA Saffire fact sheet (official resource)", "url": _SAFFIRE_URL},
    {"name": "Teflon", "pattern": r"teflon", "quote": _SAME_Q, "source": "NASA SAME fact sheet (official resource)", "url": _SAME_URL},
    {"name": "Kapton", "pattern": r"kapton", "quote": _SAME_Q, "source": "NASA SAME fact sheet (official resource)", "url": _SAME_URL},
    {"name": "silicone rubber", "pattern": r"silicone", "quote": _SAME_Q, "source": "NASA SAME fact sheet (official resource)",
     "url": _SAME_URL},
]
