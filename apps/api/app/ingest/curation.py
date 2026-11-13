"""Curator decisions for the seed catalog.

Every entry here is a *classification* (which family, fuel class) that is justified by a
quoted source sentence. Nothing here is an experimental number. Experimental numbers only
come from PSI experimental tables (see table_specs.py) and are stored with their source text.
"""

CHALLENGE_URL = "https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/?tab=details"
CHALLENGE_LOCAL = "data/sources/spaceapps_challenge_details.md"

# Seed set: all 24 PSI investigations in Research Area = Combustion Science (19 microgravity + 5 ground),
# as listed by the PSI search API (data/sources/psi/search_research_area_combustion_science.json).
SEED_ACCESSIONS = [
    "PSI-26", "PSI-25",            # BASS, BASS-II
    "PSI-98", "PSI-99", "PSI-100",  # Saffire I-III
    "PSI-102", "PSI-101",          # SAME, SAME-R
    "PSI-47",                      # DAFT / DAFT-2
    "PSI-69", "PSI-68", "PSI-39",  # FLEX, FLEX-2, CFI
    "PSI-159", "PSI-20", "PSI-22", # ACME CFI-G, BRE, E-FIELD Flames
    "PSI-107", "PSI-106",          # SPICE, SLICE
    "PSI-10", "PSI-21", "PSI-23",  # ACME Flame Design, CLD Flame, s-Flame (completes the six ACME experiments)
    "PSI-60", "PSI-62", "PSI-115", "PSI-117", "PSI-142",  # ground (modeling / lab) investigations
]
GROUND_ACCESSIONS = ["PSI-60", "PSI-62", "PSI-115", "PSI-117", "PSI-142"]

_BRIEF_SOLIDS = ("Flammability studies focus on solid materials such as fabrics and plastics, as studied in the "
                 "Burning and Suppression of Solids (BASS and BASS-II) and Spacecraft Fire Safety Demonstration "
                 "(Saffire-I, -II, and -III) investigations.")
_BRIEF_DETECT = "Fire detection was tested in microgravity through the Smoke and Aerosol Measurement Experiment studies (SAME and SAME-R)."
_BRIEF_DAFT = ("One of the instruments used for smoke detection in the SAME and SAME-R studies was instead used to detect "
               "dust in the Dust and Aerosol Measurement Feasibility Test (DAFT and DAFT-2) studies.")
_BRIEF_MDCA = ("FLEX, FLEX-2, and the Cool Flames Investigation (CFI) each featured burning droplets of liquid fuel and were "
               "conducted with the Multi-user Droplet Combustion Apparatus (MDCA) in the CIR.")
_BRIEF_ACME = ("The six experiments in the ACME project featured flames of gaseous fuels and were all conducted with the same "
               "modular set of ACME hardware in the Combustion Integrated Rack (CIR).")
_BRIEF_MSG = ("BASS, BASS-II, the Smoke Point In Co-flow Experiment (SPICE), and the Structure & Liftoff In Combustion "
              "Experiment (SLICE) collectively featured both solid and gaseous fuels. Each of these investigations was "
              "conducted within the Microgravity Science Glovebox (MSG) using the modular fan-driven flow duct built for SPICE.")
_BRIEF_BRE = ("While it burned gaseous fuels, the Burning Rate Emulator (BRE) experiment of the Advanced Combustion via "
              "Microgravity Experiments (ACME) project was a study of materials flammability in still atmospheres as a "
              "function of material properties.")
_BRIEF_FLEX = ("Suppression was studied in the Flame Extinguishment Experiment (FLEX) through dilution of the chamber "
               "atmosphere with carbon dioxide and helium, both of which suppress fire.")
_BRIEF_CFIG = ("Microgravity tests with the highest oxygen concentrations were conducted as part of the ACME's Cool Flames "
               "Investigation with Gases (CFI-G). In those tests, the combustion chamber was filled with a mixture of "
               "nitrogen and a flammable gas (e.g., propane), while an oxygen-nitrogen mixture of up to 85% oxygen flowed "
               "from the spherical burner creating an inside-out flame.")
_BRIEF_EFIELD = ("Partial gravity was mimicked in ACME's Electric-Field Effects on Laminar Diffusion Flames (E-FIELD Flames) "
                 "experiment through the effect of the electric field on the ions that naturally occur in flames.")

CURATION: dict[str, dict] = {
    "PSI-26": {"family": "BASS", "fuel_class": "solid", "basis": _BRIEF_SOLIDS, "brief_facts": [_BRIEF_SOLIDS, _BRIEF_MSG]},
    "PSI-25": {"family": "BASS", "fuel_class": "solid", "basis": _BRIEF_SOLIDS, "brief_facts": [_BRIEF_SOLIDS, _BRIEF_MSG]},
    "PSI-98": {"family": "Saffire", "fuel_class": "solid", "basis": _BRIEF_SOLIDS, "brief_facts": [_BRIEF_SOLIDS]},
    "PSI-99": {"family": "Saffire", "fuel_class": "solid", "basis": _BRIEF_SOLIDS, "brief_facts": [_BRIEF_SOLIDS]},
    "PSI-100": {"family": "Saffire", "fuel_class": "solid", "basis": _BRIEF_SOLIDS, "brief_facts": [_BRIEF_SOLIDS]},
    "PSI-102": {"family": "SAME", "fuel_class": "solid", "basis": _BRIEF_DETECT, "brief_facts": [_BRIEF_DETECT, _BRIEF_DAFT],
                "fuel_class_note": "Smoke/aerosol source materials (see PSI experimental table); detection study, not flame spread."},
    "PSI-101": {"family": "SAME", "fuel_class": "solid", "basis": _BRIEF_DETECT, "brief_facts": [_BRIEF_DETECT, _BRIEF_DAFT],
                "fuel_class_note": "Smoke/aerosol source materials (see PSI experimental table); detection study, not flame spread."},
    "PSI-47": {"family": "DAFT", "fuel_class": "aerosol", "basis": _BRIEF_DAFT, "brief_facts": [_BRIEF_DAFT],
               "fuel_class_note": "Dust aerosol for instrument feasibility; no combustion fuel."},
    "PSI-69": {"family": "Droplet (MDCA)", "fuel_class": "liquid", "basis": _BRIEF_MDCA, "brief_facts": [_BRIEF_MDCA, _BRIEF_FLEX]},
    "PSI-68": {"family": "Droplet (MDCA)", "fuel_class": "liquid", "basis": _BRIEF_MDCA, "brief_facts": [_BRIEF_MDCA]},
    "PSI-39": {"family": "Droplet (MDCA)", "fuel_class": "liquid", "basis": _BRIEF_MDCA, "brief_facts": [_BRIEF_MDCA]},
    "PSI-159": {"family": "ACME", "fuel_class": "gaseous", "basis": _BRIEF_ACME, "brief_facts": [_BRIEF_ACME, _BRIEF_CFIG]},
    "PSI-20": {"family": "ACME", "fuel_class": "gaseous", "basis": _BRIEF_BRE, "brief_facts": [_BRIEF_ACME, _BRIEF_BRE],
               "solid_emulation": True},
    "PSI-22": {"family": "ACME", "fuel_class": "gaseous", "basis": _BRIEF_ACME, "brief_facts": [_BRIEF_ACME, _BRIEF_EFIELD],
               "partial_gravity_mimic": True},
    "PSI-107": {"family": "MSG flow duct", "fuel_class": "gaseous", "basis": _BRIEF_MSG, "brief_facts": [_BRIEF_MSG],
                "fuel_class_note": "Fuel class from the PSI experimental table (gaseous hydrocarbon fuels)."},
    "PSI-106": {"family": "MSG flow duct", "fuel_class": "gaseous", "basis": _BRIEF_MSG, "brief_facts": [_BRIEF_MSG],
                "fuel_class_note": "Fuel class from the PSI experimental table (CH4 / C2H4 / C2H6 fuel bottles)."},
}

_GROUND_NOTE = ("Ground (modeling / lab) investigation. Fuel class follows the flight investigation whose data it reuses "
                "(PSI 'related investigations' field); it is not a flight test.")
for _acc, _fam_src, _fc in (("PSI-60", "SPICE", "gaseous"), ("PSI-62", "BASS", "solid"), ("PSI-115", "SAME", "solid"),
                            ("PSI-117", "FLEX", "liquid"), ("PSI-142", "FLEX", "liquid")):
    CURATION[_acc] = {"family": "Ground / modeling study", "fuel_class": _fc, "ground": True, "reuses": _fam_src,
                      "basis": None, "fuel_class_note": _GROUND_NOTE, "brief_facts": []}
CURATION["PSI-10"] = {"family": "ACME", "fuel_class": "gaseous", "basis": _BRIEF_ACME, "brief_facts": [_BRIEF_ACME]}
CURATION["PSI-21"] = {"family": "ACME", "fuel_class": "gaseous", "basis": _BRIEF_ACME, "brief_facts": [_BRIEF_ACME]}
CURATION["PSI-23"] = {"family": "ACME", "fuel_class": "gaseous", "basis": _BRIEF_ACME, "brief_facts": [_BRIEF_ACME]}

# Material aliases (curator rules, pending domain-lead confirmation, D6). Applied to material_normalized only;
# the verbatim material text is never changed.
MATERIAL_ALIASES = [
    {"pattern": r"\b(clear|black) rod\b", "normalized": "PMMA", "accessions": ["PSI-25"],
     "note": "Curator alias: BASS-II 'clear rod' / 'black rod' read as PMMA (acrylic) rods. Pending domain-lead confirmation."},
    {"pattern": r"\bpmma\b|acrylic", "normalized": "PMMA", "accessions": None, "note": None},
    {"pattern": r"sibal|cotton[- ]fiberglass", "normalized": "SIBAL (cotton-fiberglass fabric)", "accessions": None, "note": None},
]

# Curated row-level data-quality flags that a generic rule cannot detect. Each names the source evidence.
ROW_FLAG_RULES = [
    {"accession": "PSI-98", "rows": [2, 3], "code": "possible_dimension_swap", "column": "Sample Length (cm)",
     "message": ("SAFFIRE-I lists Length 40.6 cm / Width 94 cm, while SAFFIRE-III lists Length 94 cm / Width 40.6 cm for "
                 "the same SIBAL sample size. Possible swap; shown verbatim.")},
    {"accession": "PSI-99", "rows": [5, 6, 7], "code": "ambiguous_value", "column": "Samle Thickness ",
     "message": "Thickness cell reads '037 mm' (possibly 0.37, but the source is ambiguous). Shown verbatim, not parsed."},
    {"accession": "PSI-69", "rows": [115], "code": "implausible_value", "column": "Ambient pressure; mmHg",
     "message": "Ambient pressure is listed as 0 mmHg, which is physically implausible for a burning droplet. Excluded from numeric filters."},
]

# Investigations the brief names but that are NOT yet in PSI (do not create fake records).
FUTURE_PARTIAL_GRAVITY = {
    "text": ("Although NASA is heavily focused on the return of astronauts to the Moon's surface and the establishment of a "
             "Moon Base in preparation for the future human exploration of Mars, there is currently no partial-gravity "
             "combustion data available in PSI. We expect such data will be added in the future, for example from the "
             "Lunar-g Combustion Investigation (LUCI) and the Flammability of Materials on the Moon (FM2) experiment."),
    "investigations": ["LUCI (Lunar-g Combustion Investigation)", "FM2 (Flammability of Materials on the Moon)"],
}
