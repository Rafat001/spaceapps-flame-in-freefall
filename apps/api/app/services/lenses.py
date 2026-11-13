"""Three insight lenses from the guidance video (NASA HQ, [01:41]): the data "can inform fire safety protocols,
design of fire suppression systems, and how we screen materials to assess the risk of fire".

Tags are a curator classification (rule-based keyword match), never AI. Each tag quotes the sentence that
triggered it, from the PSI record or from the NASA fact sheet linked to that investigation (with page).
"""
from __future__ import annotations

import re
from functools import lru_cache

LENSES = {
    "protocols": {"label": "Fire safety protocols",
                  "patterns": [r"protocol", r"operational", r"procedure", r"\bvent(ing)?\b", r"crew (response|safety)",
                               r"fire (emergenc|respon)", r"fire safety"]},
    "suppression": {"label": "Fire suppression system design",
                    "patterns": [r"suppress", r"extinguish", r"extinction", r"\bdiluent", r"inert(ing)?\b", r"water mist"]},
    "materials": {"label": "Material fire-risk screening",
                  "patterns": [r"flammab", r"material(s)? selection", r"nasa[- ]std[- ]6001", r"fire risk", r"flame spread",
                               r"burning rate", r"spacecraft materials"]},
    "detection": {"label": "Fire / smoke detection (equipment)",
                  "patterns": [r"smoke detect", r"detector", r"fire detection", r"particle size", r"aerosol"]},
}
LENS_SOURCE = {"text": ("This data can inform fire safety protocols, design of fire suppression systems, and how we screen "
                        "materials to assess the risk of fire."),
               "citation": "Guidance video [01:41], Tracy Prater (NASA HQ), auto-captions"}
_SENT = re.compile(r"(?<=[.!?])\s+")


@lru_cache(maxsize=1)
def _fact_sheet_pages() -> dict[str, list[tuple[str, str, str, str]]]:
    from app.ingest.official_sources import OFFICIAL_DOCS, doc_pages

    out: dict[str, list] = {}
    for d in OFFICIAL_DOCS:
        if d["source_type"] != "nasa_fact_sheet":
            continue
        for page, text in doc_pages(d):
            t = re.sub(r"\s+", " ", text)
            for acc in d["accessions"]:
                out.setdefault(acc, []).append((d["title"], page, d["url"], t))
    return out


def _first(text: str, patterns: list[str]) -> str | None:
    for sent in _SENT.split(text or ""):
        if any(re.search(p, sent, flags=re.I) for p in patterns):
            return sent.strip()[:400]
    return None


def tag_lenses(inv: dict) -> dict:
    out = {}
    for key, lens in LENSES.items():
        for field in ("objective", "research_impacts", "approach", "hypothesis"):
            hit = _first(inv.get(field) or "", lens["patterns"])
            if hit:
                out[key] = {"label": lens["label"], "excerpt": hit, "source": f"PSI record {inv['accession']}, field {field}",
                            "url": inv["source_url"], "evidence_label": "Curator classification (rule-based keyword match)"}
                break
        if key in out or inv.get("is_ground"):
            continue
        acc = inv["accession"]
        # a fact sheet covering several investigations only tags when the sentence names this one's acronym
        acr = (inv.get("acronym") or "").split("/")[-1].replace("ACME ", "").strip()
        for title, page, url, text in _fact_sheet_pages().get(acc, []):
            sents = [x for x in _SENT.split(text) if acr and acr.lower() in x.lower()] if len(
                [a for a in _fact_sheet_pages() if any(t[0] == title for t in _fact_sheet_pages()[a])]) > 2 else _SENT.split(text)
            hit = _first(" ".join(sents), lens["patterns"])
            if hit:
                out[key] = {"label": lens["label"], "excerpt": hit, "source": f"{title}, p. {page}",
                            "url": f"{url}#page={page}", "evidence_label": "Curator classification (rule-based keyword match)"}
                break
    return out
