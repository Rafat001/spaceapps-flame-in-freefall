"""Earth applications panel (T6 + V10) and the official-sources explainer (V9).

Documented = the link is stated in an official resource or a PSI record field (quoted, with a locator).
Inferred = a thematic link the app suggests; it is labelled and never presented as a finding.
Every quote is located in the indexed corpus at request time, so a quote that is not in the sources fails loudly."""
from __future__ import annotations

import re

from sqlalchemy.orm import Session

from app.qa.core import Ctx

RESOURCE_ITEMS = [
    {"id": "smoke_detectors", "title": "Spacecraft smoke-detector design",
     "quotes": [("np-2015", "These instruments can provide useful guidance for the designers of future spacecraft smoke detectors")],
     "links": [("psi-47", "Documented", "Researcher's Guide p. 26 names the Dust Aerosol measurement Feasibility Test"),
               ("psi-102", "Documented", "Researcher's Guide p. 26 names the Smoke Aerosol Measurement Experiment (SAME)"),
               ("psi-101", "Documented", "PSI lists SAME-R as related to SAME (related_glds)")]},
    {"id": "fire_detector", "title": "Incipient fire detector with fewer false alarms (NASA Spinoff, 1978)",
     "quotes": [("spinoff_fire_detector", "can discriminate between combustion particles and extraneous matters such as dust"),
                ("transcript", "some NASA technology has led to improvements in intellectual smoke detection")],
     "links": [("psi-102", "Inferred", "Both concern telling smoke particles from other particles; the spinoff does not cite SAME"),
               ("psi-47", "Inferred", "DAFT measured background dust aerosol; thematic link only")]},
    {"id": "water_mist", "title": "Fine water-mist extinguishers",
     "quotes": [("np-2015", "were sent to the ISS in December 2015 to replace CO2 units that are currently onboard"),
                ("transcript", "The fine water mist extinguishers originally developed for use on the ISS have practical application here on Earth")],
     "links": [("psi-69", "Inferred", "FLEX studied droplet flame extinguishment with gaseous suppressants (CO2, He); Mist itself is not in PSI")]},
    {"id": "air_tanks", "title": "Lighter firefighter air tanks (NASA Spinoff, 1976)",
     "quotes": [("spinoff_air_tanks", "New backpack system weighs only 20 pounds for 30 minute air supply")],
     "links": []},
    {"id": "fire_attire", "title": "Firefighter protective clothing (NASA Spinoff, 1982)",
     "quotes": [("spinoff_fire_attire", "lightweight, fire-resistant, heat-protective materials originally developed for use in astronauts' space suits")],
     "links": [("psi-98", "Inferred", "Saffire burned a cotton-fiberglass fabric (SIBAL); thematic link to fabric flammability only")]},
]

EXPLAINER = [
    ("transcript", "In microgravity, we don't have buoyancy-driven convection"),
    ("transcript", "This means hot air doesn't rise and cold air doesn't sink the way it does on Earth"),
    ("transcript", "flame characteristics, ignition, propagation, and extinguishment can be quite different than in normal gravity"),
    ("transcript", "The flame becomes more spherical, soot-free, and blue"),
    ("brief", "there is currently no partial-gravity combustion data available in PSI"),
    ("transcript", "this enhanced oxygen and partial gravity environment also has implications for flammability of materials"),
]


def earth_panel(session: Session) -> dict:
    ctx = Ctx(session)
    items = []
    for it in RESOURCE_ITEMS:
        quotes = [ctx.quote_cite(src, q) for src, q in it["quotes"]]
        links = []
        for iid, kind, why in it["links"]:
            inv = ctx.inv(iid)
            links.append({"investigation_id": iid, "acronym": inv.acronym, "accession": inv.accession, "kind": kind, "why": why})
        items.append({"id": it["id"], "title": it["title"], "quotes": quotes, "links": links})
    psi = []
    for inv in sorted(ctx.invs, key=lambda i: int(i.accession.split("-")[1])):
        txt = re.sub(r"<[^>]+>", " ", inv.research_impacts or "")
        sents = [s.strip() for s in re.split(r"(?<=[.!?])\s+", txt) if re.search(r"\bEarth\b|mines|submarines|airplanes", s)]
        if sents:
            psi.append({"investigation_id": inv.id, "acronym": inv.acronym, "accession": inv.accession, "kind": "Documented",
                        "excerpt": " ".join(sents)[:420], "locator": "PSI record field 'researchImpacts'", "url": inv.source_url})
    return {"resource_items": items, "psi_documented": psi,
            "legend": {"Documented": "Stated in an official resource or PSI record (quoted).",
                       "Inferred": "Thematic link suggested by this app; not stated in the sources."}}


def explainer(session: Session) -> list[dict]:
    ctx = Ctx(session)
    return [ctx.quote_cite(src, q) for src, q in EXPLAINER]
