"""'What is X?' answers from NASA's own descriptions (curated verbatim excerpts, app/services/nasa_program.py).

- PSI investigations: the NASA description plus a pointer to the PSI record.
- Experiments the resources describe but PSI does not hold (FM2, SoFIE, FLARE, Saffire-IV to VI, ...): the NASA
  description, clearly labelled "Described by NASA; no PSI test data". Data questions about them abstain
  (see ``data_abstain``), because there is no PSI record to compute from.
"""
from __future__ import annotations

import re

from app.qa.core import ENTITIES, Ctx, Result
from app.services import nasa_program as N

DESCRIBE = re.compile(r"^\s*(?:what\s+(?:is|was|are|were)|what's|whats|describe|tell me about|explain|who\s+(?:ran|runs|led))\s+(.+)$",
                      re.I | re.S)
FILLER = re.compile(r"\b(the|a|an|nasa'?s?|experiments?|investigations?|projects?|series|program(?:me)?|study|facility|"
                    r"apparatus|about|on|in|of|psi|record|briefly)\b|[\s?.!,:;()'\"-]+", re.I)
DATA_ASK = re.compile(r"\b(results?|measured|measurements?|data|datasets?|spread rates?|burn(?:ing)? rates?|extinction limits?|"
                      r"test (?:rows|runs|conditions|matrix)|how many (?:tests|runs|rows)|what (?:oxygen|pressure)s?|"
                      r"oxygen (?:levels?|concentrations?|percent)|at what (?:oxygen|pressure))\b", re.I)
PROGRAMS = {"ACME": (re.compile(r"\bACME\b"), ["psi-10", "psi-20", "psi-21", "psi-22", "psi-23", "psi-159"]),
            "Saffire": (re.compile(r"\bSaffire\b(?![- ]?(I|II|III|IV|V|VI|\d)\b)", re.I), ["psi-98", "psi-99", "psi-100"])}


def _cite(item: dict) -> dict:
    return {**N.cite(item), "quote": N.display(item["quote"]), "section": "NASA program summary"}


def _q(item: dict) -> str:
    c = N.cite(item)
    if N.is_heading(item):
        return f"Listed under \u201c{item['quote']}\u201d on the {c['label']}."
    return f"\u201c{N.display(item['quote'])}\u201d ({c['label']}, {c['locator']})"


def _only_name(rest: str, span: tuple[int, int]) -> bool:
    left = rest[: span[0]] + " " + rest[span[1]:]
    return FILLER.sub("", left) == ""


def _entity_span(rest: str) -> tuple[str, tuple[int, int]] | None:
    hits = []
    for iid, pat, fl in ENTITIES:
        m = re.search(pat, rest, fl)
        if m:
            hits.append((m.end() - m.start(), iid, m.span()))
    if not hits:
        return None
    _, iid, span = max(hits)
    # "ACME CFI-G", "ACME Flame Design": allow the ACME prefix
    pre = re.search(r"\bACME\b[\s/-]*$", rest[: span[0]])
    return iid, ((pre.start() if pre else span[0]), span[1])


def _not_in_psi(ctx: Ctx, e: dict) -> Result:
    items = ([e["status"]] if e.get("status") else []) + e["facts"][:4]
    by_id = {i.id: i for i in ctx.invs}
    rel = [f"{by_id[r['id']].acronym} ({by_id[r['id']].accession}): {r['why']}" for r in e.get("related", []) if r["id"] in by_id]
    kind = "facility" if e["group"] == "facility" else "experiment"
    if kind == "facility":
        pat = re.compile(e["related_hardware"], re.I)
        users = [f"{i.acronym} ({i.accession})" for i in sorted(ctx.invs, key=lambda i: int(i.accession.split("-")[1]))
                 if i.hardware and pat.search(i.hardware)]
        txt = (f"{e['name']} ({e['acronym']}) is an ISS combustion facility described on the NASA Combustion Science page; "
               "it is hardware, not a PSI investigation. " + " ".join(_q(i) for i in items))
        if users:
            txt += f" PSI records whose hardware field names it: {', '.join(users)}."
        return Result(txt, [_cite(i) for i in items], ["verbatim NASA excerpts from the curated map",
                                                       "PSI hardware field match"], intent="nasa_not_in_psi")
    txt = (f"{e['name']} ({e['acronym']}) is a NASA combustion experiment that the official resources describe but PSI's "
           f"Combustion Science listing does not hold (described by NASA; no PSI test data). " + " ".join(_q(i) for i in items))
    if rel:
        txt += " Related PSI records: " + "; ".join(rel) + "."
    txt += " It is not counted or ranked here, and questions about its measured data are declined."
    return Result(txt, [_cite(i) for i in items], ["verbatim NASA excerpts from the curated map (data/curation/nasa_program.v1.json), "
                                                   "each checked against the stored source text"], intent="nasa_not_in_psi")


def _psi(ctx: Ctx, iid: str) -> Result | None:
    s = N.data()["investigations"].get(iid)
    if not s:
        return None
    inv = ctx.inv(iid)
    items = [s["hint"]] + [f for f in s["facts"] if f["kind"] in ("description", "objective")][:2]
    txt = f"{inv.acronym} ({inv.accession}, {inv.title}). NASA describes it: " + " ".join(_q(i) for i in items)
    n = len(ctx.runs(iid))
    txt += f" PSI holds its record and {n} countable experimental-table rows." if n else " PSI holds its record."
    return Result(txt, [_cite(i) for i in items] + [ctx.field_cite(iid, "title")],
                  ["verbatim NASA excerpts from the curated map, checked against the stored source text", "PSI record lookup"],
                  intent="nasa_description")


def _program(ctx: Ctx, name: str, ids: list[str]) -> Result:
    p = N.data()["programs"][name]
    items = p["facts"][:3]
    have = ", ".join(f"{ctx.inv(i).acronym} ({ctx.inv(i).accession})" for i in ids)
    txt = f"{p['name']}. " + " ".join(_q(i) for i in items) + f" PSI records in this program: {have}."
    if name == "Saffire":
        txt += " Saffire-IV, -V and -VI are described by NASA but have no PSI test data."
    return Result(txt, [_cite(i) for i in items] + [ctx.field_cite(i, "title") for i in ids],
                  ["verbatim NASA excerpts from the curated map", "PSI record lookup"], intent="nasa_description")


def describe(ctx: Ctx, q: str) -> Result | None:
    m = DESCRIBE.match(q)
    if not m:
        return None
    rest = m.group(1)
    for e in N.match_not_in_psi(rest):
        mm = re.search(e["pattern"], rest, re.I)
        if mm and _only_name(rest, mm.span()):
            return _not_in_psi(ctx, e)
    hit = _entity_span(rest)
    if hit and _only_name(rest, hit[1]):
        return _psi(ctx, hit[0])
    for name, (pat, ids) in PROGRAMS.items():
        mm = pat.search(rest)
        if mm and _only_name(rest, mm.span()):
            return _program(ctx, name, ids)
    return None


def data_abstain(ctx: Ctx, q: str) -> Result | None:
    """Data question about an experiment the resources describe but PSI does not hold: decline, with the NASA citation."""
    if not DATA_ASK.search(q):
        return None
    for e in N.match_not_in_psi(q):
        if e["group"] == "facility":
            continue
        item = e.get("status") or e["facts"][0]
        return Result(f"{e['name']} ({e['acronym']}) has no PSI test data: NASA describes it ({N.cite(item)['label']}, "
                      f"{N.cite(item)['locator']}), but PSI's Combustion Science listing has no record for it, so no measured "
                      f"values can be given. Ask \u201cWhat is {e['acronym']}?\u201d for NASA's description.",
                      [_cite(item)], ["scope registry: described in a resource, absent from the PSI listing"],
                      kind="abstain", intent="abstain")
    return None
