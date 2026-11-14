"""Scope and abstention rules (T10). Each rule cites the official resource that justifies it.

Abstain when: the corpus cannot answer, the question needs partial-gravity data, it asks for certification,
it is about rockets/propellants, it asks for PSI data on a programme the resources name but PSI does not hold,
or the requested cell is blank, non-numeric or flagged implausible."""
from __future__ import annotations

import re

from sqlalchemy import select

from app.models import Chunk
from app.qa.core import Ctx, Result, col, norm, records_text

# Items the official resources name that have no PSI Combustion Science record. (name regex, source, quote)
NOT_IN_PSI = [
    (r"Saffire[- ]?(IV|4)\b", "spacecraft-fire-safety-demonstration-saffire", "Saffire-IV was ignited May 11, 2020"),
    (r"Saffire[- ]?(V|5)\b", "spacecraft-fire-safety-demonstration-saffire", "The Spacecraft Fire Experiment-V (Saffire-V) investigation"),
    (r"Saffire[- ]?(VI|6)\b", "spacecraft-fire-safety-demonstration-saffire", "Saffire-VI, the last of the series"),
    (r"\bSoFIE\b", "nasa_combustion_science", "Solid Fuel Ignition and Extinction investigation (SoFIE)"),
    (r"\bFLARE\b", "nasa_combustion_science", "Flammability Limits At Reduced-g Experiment (FLARE)"),
    (r"\bFM2\b", "brief", "Flammability of Materials on the Moon (FM2) experiment"),
    (r"\bLUCI\b", "brief", "Lunar-g Combustion Investigation (LUCI)"),
    (r"\bLSP\b|Laminar Soot Processes", "np-2015", "The Laminar Soot Processes (LSP) experiment"),
    (r"\bTGDF\b", "np-2015", "Turbulent Gas-jet Diffusion Flame (TGDF) experiment"),
    (r"\bELF\b|Enclosed Laminar Flames", "np-2015", "Enclosed Laminar Flames (ELF) investigation"),
]
PSI_DATA_ASK = r"\b(PSI|experimental (results|table|data)|data ?set|test data|results from)\b"
PARTIAL_G_QUOTE = "there is currently no partial-gravity combustion data available in PSI"


def _abstain(text: str, cites: list[dict], computation: str, flags: list[dict] | None = None) -> Result:
    return Result(text, cites, [computation], flags or [], kind="abstain", intent="abstain")


def scope_check(ctx: Ctx, q: str) -> Result | None:
    ql = q.lower()
    # certification / "is it safe"
    if re.search(r"\b(certif\w*|qualif\w*)\b|\bsafe (for|on|in)\b", ql):
        c = ctx.quote_cite("brief", PARTIAL_G_QUOTE)
        return _abstain("No. This tool is decision support only and does not certify materials; it is not a materials "
                        "certification authority. Microgravity results do not directly establish lunar performance, and the "
                        f"brief says \u201c{PARTIAL_G_QUOTE}\u201d (no partial-gravity combustion data in PSI).", [c], "policy: certification")
    # partial-gravity measurements
    if re.search(r"\b(in|under|at)\s+(lunar|martian|moon|mars|partial)[- ]?gravity\b|partial[- ]gravity (data|test|results?|measure)", ql):
        c = ctx.quote_cite("brief", PARTIAL_G_QUOTE)
        return _abstain(f"Not established: the official brief says \u201c{PARTIAL_G_QUOTE}\u201d (no partial-gravity data in PSI). "
                        "LUCI and FM2 are named as future sources.", [c], "scope: partial gravity")
    # rockets / propellants
    if re.search(r"\b(rocket|propellant)s?\b", ql) and not re.search(r"sounding rocket", ql):
        c = ctx.quote_cite("brief", "Fire safety involving rockets and propellants is generally beyond the scope of the research available in the PSI database")
        return _abstain("Out of scope: the brief says fire safety involving rockets and propellants is generally beyond the scope "
                        "of the research available in the PSI database.", [c], "scope: rockets and propellants")
    # platforms PSI never lists
    m = re.search(r"(sounding rocket|drop tower|parabolic flight|suborbital)", ql)
    if m and re.search(r"flown|platform|conducted|investigations? (were|was)|which psi", ql):
        from app.qa.engine import catalog_stats, listing_cite

        fp = catalog_stats()["flight_platform_listing"]
        cites = [listing_cite("'Flight Platform' field"),
                 ctx.quote_cite("transcript", "studied using drop towers, parabolic flights, sounding rocket, suborbital flights")]
        txt = (f"None listed: no PSI Combustion Science record has a {m.group(1)} flight platform (listing: "
               + ", ".join(f"{k} {v}" for k, v in fp.items()) + "). The guidance video names sounding rockets, drop towers and "
               "parabolic flights only as general microgravity platforms.")
        if "drop tower" in ql or "sounding" in ql:
            try:
                cites.append(ctx.field_cite("psi-10", "approach", "Perform spherical diffusion flame tests in drop towers and aboard the International Space Station"))
                txt += " PSI-10's approach mentions drop-tower tests alongside ISS tests."
            except LookupError:
                pass
        return _abstain(txt, cites, "scope: flight platform listing")
    # named programmes with no PSI record
    for pat, src, quote in NOT_IN_PSI:
        if re.search(pat, q) and re.search(PSI_DATA_ASK, q, re.I):
            saff = sorted([i for i in ctx.invs if (i.acronym or "").upper().startswith("SAFFIRE")], key=lambda i: int(i.accession.split("-")[1]))
            have = ", ".join(f"{i.acronym} ({i.accession})" for i in saff)
            name = re.search(pat, q).group(0)
            c = ctx.quote_cite(src, quote)
            return _abstain(f"{name} is not in PSI: the official resources name it ({c['label']}, {c['locator']}) but PSI's "
                            f"Combustion Science listing has no record for it. Saffire records in PSI: {have}.",
                            [c], "scope registry: named in a resource, absent from the PSI listing")
    # data questions about other experiments the resources describe (curated map); "what is X" is answered elsewhere
    from app.qa.nasa import DESCRIBE, data_abstain

    if not DESCRIBE.match(q) or re.search(r"\b(data|results?|measured)\b", ql):
        res = data_abstain(ctx, q)
        if res is not None:
            return res
    # Saffire-II specific cells
    m = re.search(r"Saffire[- ]?(II|2)\b.*?sample (2-\d)|sample (2-\d).*?Saffire[- ]?(II|2)\b", q, re.I)
    if m:
        sid = m.group(2) or m.group(3)
        rows = [r for r in ctx.runs("psi-99") if r.run_label == sid]
        if rows:
            r = rows[0]
            if re.search(r"\bmaterial\b", ql) and not col(r, "Material"):
                return _abstain(f"Not reported in the PSI experimental table: the Material cell for sample {sid} is blank "
                                f"({records_text([r.source_row])}). It is not inferred from neighbouring rows.",
                                [ctx.row_cite("psi-99", [r], "Material")], "row lookup: blank cell")
            if re.search(r"spread", ql) and not re.search(r"\d", col(r, "?-g Spread Length")):
                notes = [n for n in ctx.runs("psi-99", all_kinds=True) if n.row_kind == "note"]
                ref = re.search(r"note\s*(\d)", " ".join(col(r, k) for k in (r.raw or {})), re.I)
                note_txt = ""
                cite_rows = [r]
                for n in notes:
                    t = " ".join(v for v in (n.raw or {}).values() if v)
                    if "nomex" in t.lower() or (ref and t.lower().startswith(f"note {ref.group(1)}")):
                        note_txt = f" Source note ({records_text([n.source_row])}): \u201c{t.strip()}\u201d"
                        cite_rows.append(n)
                        break
                return _abstain(f"Not reported: the microgravity spread cell for sample {sid} reads '{col(r, '?-g Spread Length')}' "
                                f"(material '{col(r, 'Material')}', {records_text([r.source_row])}).{note_txt}",
                                [ctx.row_cite("psi-99", cite_rows, "?-g Spread Length")], "row lookup: non-numeric cell")
    # FLEX row with an implausible value
    m = re.search(r"FLEX test #?\s*(\d+)|\((C\w+)\)", q)
    if m and re.search(r"\bFLEX\b", q) and "pressure" in ql:
        rows = [r for r in ctx.runs("psi-69") if col(r, "FLEX Test #") == (m.group(1) or "") or (m.group(2) and col(r, "FLEX Identifier") == m.group(2))]
        if rows:
            r = rows[0]
            fl = [f for f in (r.flags or []) if f.get("code") == "implausible_value"]
            if fl:
                return _abstain(f"Not usable: FLEX Test # {col(r, 'FLEX Test #')} ({col(r, 'FLEX Identifier')}) lists "
                                f"'{col(r, 'Ambient pressure; mmHg')}' mmHg ({records_text([r.source_row])}). Flagged: {fl[0]['message']} "
                                "It is shown verbatim and excluded from numeric filters (physically implausible for a burning test).",
                                [ctx.row_cite("psi-69", [r], "Ambient pressure; mmHg")], "row lookup: flagged value",
                                [{"row": r.source_row, **f} for f in fl])
    # physical-property questions the corpus never covers
    m = re.search(r"(boiling point|melting point|flash point|autoignition temperature|heat of combustion|molecular weight|toxicity)", ql)
    if m:
        phrase = m.group(1)
        hit = any(phrase in norm(c) for (c,) in ctx.s.execute(select(Chunk.text)))
        if not hit:
            return _abstain(f"Not in the official resources: no indexed resource (PSI records and tables, fact sheets, Researcher's "
                            f"Guide, brief, incident and spinoff pages, guidance video) mentions '{phrase}'. Outside facts are not used.",
                            [], "scope: phrase absent from the corpus")
    return None
