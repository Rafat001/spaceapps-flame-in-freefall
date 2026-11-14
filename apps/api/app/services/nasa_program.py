"""NASA program summaries for PSI investigations, and NASA combustion experiments that have no PSI data.

Source of truth: data/curation/nasa_program.v1.json, a hand-made map from PSI investigation ids (and from
experiments PSI does not hold) to verbatim excerpts of the official resources: the NASA Combustion Science page
(resource #2), the fact sheets and "Learn More" pages it links, the Researcher's Guide and the challenge brief.

Every excerpt is checked word for word against the stored source text (``verify``). Ingest fails if one does not
match, so the app can never show a paraphrase as a quote. Experiments without PSI data are kept out of the
Investigation table, so they can never enter counts, filters or rankings.
"""
from __future__ import annotations

import json
import re
import unicodedata
from functools import lru_cache

from app.config import settings

CURATION = "data/curation/nasa_program.v1.json"
BRIEF_URL = "https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/?tab=details"
BRIEF_PROV = {"kind": "resource", "resource": "Challenge brief (details tab)", "resource_url": BRIEF_URL}

KIND_LABEL = {
    "description": "What NASA says", "objective": "Objective", "approach": "How it works", "hardware": "Hardware / facility",
    "conditions": "Test conditions (as described)", "samples": "Samples and fuels (as described)", "dates": "Dates",
    "results": "Results", "space": "Space applications", "earth": "Earth benefits", "context": "Background",
}
KIND_ORDER = list(KIND_LABEL)
GROUP_LABEL = {
    "current": "Current experiments on the NASA Combustion Science page",
    "future": "Named in the challenge brief as a future data source",
    "saffire": "Later Saffire flights (Saffire fact sheet)",
    "fact_sheet": "Other experiments in the fact sheets",
    "shuttle": "Earlier space-shuttle experiments",
    "facility": "ISS combustion facilities",
}
NOT_IN_PSI_LABEL = "Described by NASA; no PSI test data"
ANCHOR_SECTION = {"current": "Current Combustion Experiments", "archived": "Archived Combustion Experiments",
                  "facilities": "Combustion Science Facilities/Areas on the ISS"}
URL_ANCHORS = {"current", "archived"}  # anchors that exist on the NASA page


def norm(t: str) -> str:
    """Comparison form: NFKC (ligatures, µ), joined line-break hyphens, straight quotes, single spaces."""
    t = unicodedata.normalize("NFKC", t or "").replace("\u00ad", "")
    t = re.sub(r"-\n(?=[a-z])", "", t)
    t = t.replace("\u2019", "'").replace("\u2018", "'").replace("\u201c", '"').replace("\u201d", '"')
    return re.sub(r"\s+", " ", t).strip()


def display(t: str) -> str:
    """Readable form of a verbatim quote (ligatures expanded, whitespace collapsed); words unchanged."""
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", t)).strip()


@lru_cache(maxsize=1)
def data() -> dict:
    return json.loads((settings.data_dir / "curation" / "nasa_program.v1.json").read_text())


@lru_cache(maxsize=1)
def _docs() -> dict:
    from app.ingest.corpus import doc_provenance
    from app.ingest.official_sources import OFFICIAL_DOCS

    return {d["id"]: {**d, "provenance": doc_provenance(d)} for d in OFFICIAL_DOCS}


@lru_cache(maxsize=256)
def _source_text(src: str, page: str | None) -> str:
    from app.ingest.official_sources import doc_pages

    if src == "brief":
        return norm((settings.data_dir / "sources" / "spaceapps_challenge_details.md").read_text())
    d = _docs()[src]
    pages = doc_pages(d)
    if d["kind"] == "pdf":
        return norm(next(t for p, t in pages if p == str(page)))
    return norm(pages[0][1])


def cite(item: dict) -> dict:
    """Citation for one excerpt: label, locator (page / page section), deep link and provenance."""
    src, page = item["src"], item.get("page")
    if src == "brief":
        return {"source_type": "challenge_brief", "document_id": "challenge-brief", "label": "Official challenge brief",
                "title": "Challenge brief (details tab)", "locator": "details tab", "page": None, "url": BRIEF_URL,
                "provenance": BRIEF_PROV}
    d = _docs()[src]
    if d["kind"] == "pdf":
        label = "NASA fact sheet" if d["source_type"] == "nasa_fact_sheet" else "NASA Researcher's Guide"
        return {"source_type": d["source_type"], "document_id": src, "label": label, "title": d["title"],
                "locator": f"p. {page}", "page": str(page), "url": f"{d['url']}#page={page}", "provenance": d["provenance"]}
    anchor = item.get("anchor")
    loc = ANCHOR_SECTION.get(anchor, "page text") if src == "nasa_combustion_science" else "page text"
    return {"source_type": d["source_type"], "document_id": src,
            "label": "NASA Combustion Science page" if src == "nasa_combustion_science" else "NASA Glenn experiment page",
            "title": d["title"], "locator": loc, "page": None, "url": d["url"] + (f"#{anchor}" if anchor in URL_ANCHORS else ""),
            "provenance": d["provenance"]}


def _all_items() -> list[tuple[str, dict]]:
    out: list[tuple[str, dict]] = []
    cur = data()
    for name, p in cur["programs"].items():
        out += [(f"program {name}", f) for f in p["facts"]]
        out += [(f"program {name} note", q) for n in p.get("notes", []) for q in n["quotes"]]
    for iid, s in cur["investigations"].items():
        out.append((f"{iid} hint", s["hint"]))
        out += [(iid, f) for f in s["facts"]]
        out += [(f"{iid} note", q) for n in s.get("notes", []) for q in n["quotes"]]
    for e in cur["not_in_psi"]:
        if e.get("status"):
            out.append((f"{e['id']} status", e["status"]))
        out += [(e["id"], f) for f in e["facts"]]
        out += [(f"{e['id']} note", q) for n in e.get("notes", []) for q in n["quotes"]]
    return out


def verify() -> list[str]:
    """Problems found: excerpts not present word for word in their cited source page. Empty list = all verbatim."""
    bad = []
    for where, it in _all_items():
        try:
            txt = _source_text(it["src"], it.get("page"))
        except (KeyError, StopIteration, FileNotFoundError) as e:
            bad.append(f"{where}: source {it['src']} p.{it.get('page')} unavailable ({e})")
            continue
        if norm(it["quote"]) not in txt:
            bad.append(f"{where}: not verbatim in {it['src']} p.{it.get('page')}: {it['quote'][:70]}")
    return bad


def is_heading(item: dict) -> bool:
    """True when the excerpt is a section heading of the NASA page (e.g. "Current Combustion Experiments")."""
    return item["quote"] in ANCHOR_SECTION.values()


def _fact(f: dict) -> dict:
    return {"kind": f["kind"], "label": KIND_LABEL.get(f["kind"], f["kind"]), "quote": display(f["quote"]), "citation": cite(f)}


def _sorted(facts: list[dict]) -> list[dict]:
    return sorted((_fact(f) for f in facts), key=lambda x: KIND_ORDER.index(x["kind"]) if x["kind"] in KIND_ORDER else 99)


def _psi_value(inv, key: str) -> str:
    from app.services.serialize import NOT_REPORTED, _count, conditions_summary, materials

    if key == "n_rows":
        return f"{_count(inv)} countable rows in the PSI experimental table"
    if key == "investigation_period":
        a, b = inv.investigation_start, inv.investigation_end
        return f"{a or 'not given'} → {b or 'not given'} (PSI investigation period)" if (a or b) else "Not reported in the PSI record"
    if key == "flight_platform":
        return f"Flight platform: {inv.flight_platform or NOT_REPORTED}"
    if key == "hardware":
        return f"Hardware: {inv.hardware or 'blank in the PSI record'}"
    if key in ("oxygen", "pressure"):
        c = conditions_summary(inv)[key]
        return f"{c['display']} across {c['n_rows']} of {c['n_total']} rows (PSI table)" if c["known"] else NOT_REPORTED
    if key == "materials":
        return "Materials / fuels in the PSI table: " + "; ".join(materials(inv, 40))
    raise KeyError(key)


def _notes(notes: list[dict], inv=None) -> list[dict]:
    out = []
    for n in notes:
        out.append({"kind": n["kind"], "text": n["text"],
                    "quotes": [{"quote": display(q["quote"]), "citation": cite(q)} for q in n["quotes"]],
                    "psi_value": _psi_value(inv, n["psi"]) if inv is not None and n.get("psi") else None,
                    "psi_field": n.get("psi")})
    return out


def hint(inv_id: str) -> dict | None:
    s = data()["investigations"].get(inv_id)
    if not s:
        return None
    return {"quote": display(s["hint"]["quote"]), "citation": cite(s["hint"])}


def summary(inv) -> dict | None:
    """Section for /investigations/<id>; None when no official NASA page or fact sheet describes the investigation."""
    s = data()["investigations"].get(inv.id)
    if not s:
        return None
    prog = data()["programs"].get(s["program"]) if s.get("program") else None
    return {
        "label": "NASA program summary (verbatim excerpts)",
        "lead": hint(inv.id),
        "facts": _sorted(s["facts"]),
        "notes": _notes(s.get("notes", []), inv),
        "program": ({"name": prog["name"], "facts": _sorted(prog["facts"]), "notes": _notes(prog.get("notes", []))}
                    if prog else None),
        "note": "Quoted from NASA's Combustion Science page and the fact sheets it links (official challenge resource #2). "
                "Planned values in fact sheets may differ from what PSI recorded; where they differ, both are shown.",
    }


def not_in_psi_entries() -> list[dict]:
    return data()["not_in_psi"]


def other_experiments(session) -> dict:
    """Experiments and facilities the official resources describe that have no PSI Combustion Science record."""
    from sqlalchemy import select

    from app.models import Investigation

    invs = session.scalars(select(Investigation)).all()
    by_id = {i.id: i for i in invs}
    accs = {(i.acronym or "").upper() for i in invs}
    items = []
    for e in data()["not_in_psi"]:
        assert e["acronym"].upper() not in accs, f"{e['acronym']} is a PSI investigation"
        related = [{"investigation_id": r["id"], "acronym": by_id[r["id"]].acronym, "accession": by_id[r["id"]].accession,
                    "why": r["why"], "basis": "Documented"} for r in e.get("related", []) if r["id"] in by_id]
        if e.get("related_hardware"):
            pat = re.compile(e["related_hardware"], re.I)
            related += [{"investigation_id": i.id, "acronym": i.acronym, "accession": i.accession,
                         "why": f"PSI hardware field: {i.hardware}", "basis": "PSI record"}
                        for i in sorted(invs, key=lambda i: int(i.accession.split("-")[1])) if i.hardware and pat.search(i.hardware)]
        items.append({"id": e["id"], "acronym": e["acronym"], "name": e["name"], "group": e["group"],
                      "group_label": GROUP_LABEL[e["group"]], "parent": e.get("parent"), "label": NOT_IN_PSI_LABEL,
                      "kind": "facility" if e["group"] == "facility" else "experiment",
                      "status": ({"quote": display(e["status"]["quote"]), "citation": cite(e["status"]),
                                  "heading": is_heading(e["status"])} if e.get("status") else None),
                      "facts": _sorted(e["facts"]), "notes": _notes(e.get("notes", [])), "related": related})
    return {"items": items, "groups": GROUP_LABEL, "label": NOT_IN_PSI_LABEL,
            "note": "These are described in the official resources but have no record in PSI's Combustion Science listing, "
                    "so they are never counted, filtered or ranked. Data questions about them are declined.",
            "n_items": len(items)}


def _top_level_split(pat: str) -> list[str]:
    parts, depth, cur = [], 0, ""
    for ch in pat:
        depth += ch == "("
        depth -= ch == ")"
        if ch == "|" and depth == 0:
            parts.append(cur)
            cur = ""
        else:
            cur += ch
    return parts + [cur]


def match_not_in_psi(q: str) -> list[dict]:
    """Not-in-PSI entries named in a question, longest match first. All-caps word acronyms (FLARE, GEL, MIST, ELF…)
    match case-sensitively so ordinary words do not trigger them; full names and mixed acronyms ignore case."""
    hits = []
    for e in data()["not_in_psi"]:
        acr, *names = _top_level_split(e["pattern"])
        strict = e["acronym"].isalpha() and e["acronym"].isupper()
        m = re.search(acr, q, 0 if strict else re.I) or next((x for x in (re.search(n, q, re.I) for n in names) if x), None)
        if m:
            hits.append((len(m.group(0)), e))
    return [e for _, e in sorted(hits, key=lambda t: -t[0])]


def chunks() -> list[dict]:
    """Passages for the retriever: one per (investigation or experiment, source page), verbatim excerpts only."""
    out = []
    cur = data()

    def group(items):
        g: dict = {}
        for it in items:
            g.setdefault((it["src"], it.get("page"), it.get("anchor")), []).append(it)
        return g

    for iid, s in cur["investigations"].items():
        items = [s["hint"], *s["facts"]]
        prog = cur["programs"].get(s.get("program") or "")
        for (src, page, anchor), its in group(items).items():
            c = cite(its[0])
            head = f"NASA description of {iid.upper()}" + (f" ({prog['name']})" if prog else "") + f", {c['label']} {c['locator']}: "
            out.append({"id": f"nasa-{iid}-{src[:24]}-{page or anchor or 'p'}", "document_id": c["document_id"],
                        "investigation_id": iid, "text": head + " ".join(display(i["quote"]) for i in its),
                        "section": f"NASA program summary — {c['title']}", "page": c["page"], "locator": c["locator"],
                        "source_url": c["url"], "source_type": c["source_type"], "provenance": c["provenance"]})
    for e in cur["not_in_psi"]:
        items = ([e["status"]] if e.get("status") else []) + e["facts"]
        for (src, page, anchor), its in group(items).items():
            c = cite(its[0])
            head = f"{e['name']} ({e['acronym']}): {NOT_IN_PSI_LABEL}. {c['label']} {c['locator']}: "
            out.append({"id": f"nasa-x-{e['id']}-{src[:24]}-{page or anchor or 'p'}", "document_id": c["document_id"],
                        "investigation_id": None, "text": head + " ".join(display(i["quote"]) for i in its),
                        "section": f"Not in PSI — {e['name']}", "page": c["page"], "locator": c["locator"],
                        "source_url": c["url"], "source_type": c["source_type"], "provenance": c["provenance"]})
    return out
