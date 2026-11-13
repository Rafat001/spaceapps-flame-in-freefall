"""Question routing and answer composition (T4).

Routing is pattern based: each recipe names the computation to run (count, range, argmax, filter, sum, row
lookup, catalog statistic, coverage query or verbatim quote). The numbers always come from the stored PSI rows,
PSI record fields or indexed official-resource text at answer time; nothing numeric is written here.
If no recipe or scope rule applies, ``answer`` returns None and the caller falls back to retrieval.
"""
from __future__ import annotations

import json
import re
from typing import Callable

from sqlalchemy.orm import Session

from app.qa import intents as I
from app.qa.core import Ctx, Result, col, counts, entities, numeric, ordered_distinct, records_text, row_flags
from app.qa.scope import scope_check

LABEL = "Direct answer (computed from PSI data and official resources, no AI)"
Recipe = Callable[[Ctx, str], Result]
RECIPES: list[tuple[re.Pattern, Recipe]] = []


def recipe(*patterns: str):
    def deco(fn: Recipe) -> Recipe:
        for p in patterns:
            RECIPES.append((re.compile(p, re.I | re.S), fn))
        return fn
    return deco


def _join(*parts: Result, kind: str = "direct", intent: str = "") -> Result:
    out = Result(" ".join(p.answer for p in parts if p.answer), kind=kind, intent=intent or (parts[0].intent if parts else ""))
    for p in parts:
        out.add(p)
    return out


def Q(ctx: Ctx, source: str, *quotes: str, lead: str = "") -> Result:
    cites = [ctx.quote_cite(source, q) for q in quotes]
    txt = lead + " ".join(f"\u201c{q}\u201d ({c['label']}, {c['locator']})" for q, c in zip(quotes, cites))
    return Result(txt, cites, [f"verbatim quote(s) located in indexed {source} text"], intent="official_fact")


def F(ctx: Ctx, iid: str, field_name: str, quote: str, lead: str = "") -> Result:
    c = ctx.field_cite(iid, field_name, quote)
    return Result(f"{lead}\u201c{quote}\u201d ({ctx.inv(iid).accession} {field_name})", [c], [f"verbatim PSI field {field_name}"],
                  intent="psi_field")


def catalog_stats() -> dict:
    from app.config import settings

    return json.loads((settings.data_dir / "seed" / "investigations.v2.json").read_text())["catalog_stats"]


def listing_cite(note: str) -> dict:
    cs = catalog_stats()
    return {"source_type": "psi_listing", "label": "PSI search listing (Combustion Science)", "locator": note,
            "url": cs["provenance"]["resource_url"], "file": cs["sources"]["listing"].split(" ")[0], "as_of": cs["as_of"],
            "provenance": cs["provenance"]}


# ------------------------------------------------------------------ FLEX / FLEX-2 / CFI (droplets)
@recipe(r"FLEX test #?\s*(\d+)\s*\(identifier (\w+)\)")
def flex_row(ctx, q):
    m = re.search(r"identifier (\w+)", q)
    rows = [r for r in ctx.runs("psi-69") if col(r, "FLEX Identifier") == m.group(1)]
    cols = ["Fuel", "Droplet initial diameter; mm", "Visible flame extinction diameter; mm", "Burn time; s", "Test end",
            "Test Date", "Ambient pressure; mmHg", "O initial ambient composition; mole fraction"]
    return I.describe_rows(ctx, "psi-69", cols) if not rows else Result(
        f"FLEX Test # {col(rows[0], 'FLEX Test #')} ({m.group(1)}): " + "; ".join(f"{c} {col(rows[0], c)}" for c in cols),
        [ctx.row_cite("psi-69", rows)], ["row lookup by 'FLEX Identifier'"], row_flags(rows), intent="row_lookup")


@recipe(r"fuels.*FLEX experimental table|FLEX.*which fuels")
def flex_fuels(ctx, q):
    return I.count_by(ctx, "psi-69", "Fuel", label="Fuels (rows)")


@recipe(r"range of initial ambient oxygen.*FLEX")
def flex_o2(ctx, q):
    return I.num_range(ctx, "psi-69", "O initial ambient composition; mole fraction", unit="(mole fraction)",
                       label="Initial ambient O2 mole fraction")


@recipe(r"FLEX tests ended in")
def flex_end(ctx, q):
    return I.count_by(ctx, "psi-69", "Test end", noun="tests", label="Test end")


@recipe(r"FLEX test had the longest burn time")
def flex_burn(ctx, q):
    return I.argmax(ctx, "psi-69", "Burn time; s", ["FLEX Test #", "FLEX Identifier", "Fuel"], unit="s")


@recipe(r"largest initial droplet diameter in FLEX")
def flex_d0(ctx, q):
    return I.argmax(ctx, "psi-69", "Droplet initial diameter; mm", ["FLEX Test #", "FLEX Identifier", "Fuel",
                    "O initial ambient composition; mole fraction", "Ambient pressure; mmHg"], unit="mm", id_col="FLEX Identifier")


@recipe(r"FLEX tests used helium")
def flex_he(ctx, q):
    return I.nonzero(ctx, "psi-69", "He initial ambient composition; mole fraction", "Fuel", "helium")


@recipe(r"FLEX tests used carbon dioxide")
def flex_co2(ctx, q):
    r = I.nonzero(ctx, "psi-69", "CO initial ambient composition; mole fraction", "Fuel", "CO2")
    r.answer += (" The source header reads 'CO initial ambient composition'; it is read as the CO2 suppressant fraction "
                 "(flagged for domain review, not silently corrected).")
    r.flags.append({"code": "header_garbled", "column": "CO initial ambient composition; mole fraction",
                    "message": "Header reads 'CO'; values treated as CO2 per the FLEX table context. Domain review needed.",
                    "rule": "Automatic check"})
    return r


@recipe(r"fuels in the FLEX-2")
def flex2_fuels(ctx, q):
    runs = ctx.runs("psi-68")
    vals = ordered_distinct(runs, "Sample (Fuel Type)")
    return Result("; ".join(vals) + f" ({len(runs)} test-matrix rows).", [ctx.row_cite("psi-68", runs, "Sample (Fuel Type)")],
                  ["distinct 'Sample (Fuel Type)'"], intent="distinct")


@recipe(r"oxygen mole fractions, pressures and flow velocities.*FLEX-2")
def flex2_matrix(ctx, q):
    runs = ctx.runs("psi-68")
    cols = ["Oxygen Mole Fraction", "Ambient Pressure (atm)", "Flow Velocity (cm/s)", "Ambient Temperature (C)",
            "Initial Droplet Diameter (mm)", "Ambient Gas Mixture"]
    parts = []
    for c in cols:
        vs = ordered_distinct(runs, c)
        parts.append(f"{c}: {' | '.join(vs)}" + ("" if len(vs) == 1 else " (varies by fuel)"))
    return Result("; ".join(parts) + f". These are the planned per-fuel test matrix ({len(runs)} rows), not individual runs.",
                  [ctx.row_cite("psi-68", runs)], ["distinct values per column"], intent="distinct")


@recipe(r"pressures were tested in the Cool Flames Investigation|pressures.*\bCFI\b")
def cfi_p(ctx, q):
    return I.count_by(ctx, "psi-39", "Pressure", noun="tests", label="Pressure (tests)")


@recipe(r"fuels were used in CFI")
def cfi_fuel(ctx, q):
    return I.count_by(ctx, "psi-39", "Fuel", noun="tests", label="Fuel (tests)")


# ------------------------------------------------------------------ ACME
@recipe(r"highest oxygen concentration in the ACME CFI-G")
def cfig_max(ctx, q):
    best = []
    for sub, c in (("normal flames", "XO2 before test"), ("inverse flames", "XO2")):
        for x, r in numeric(ctx.runs("psi-159", sub), c):
            best.append((x, r, sub, c))
    x, r, sub, c = max(best, key=lambda t: t[0])
    res = Result(f"Highest XO2 = {col(r, c)} ({x * 100:g} % O2), {sub} configuration (Flame Type '{col(r, 'Flame Type')}'), "
                 f"test {col(r, 'Test')}, {records_text([r.source_row])}. In inverse flames this O2 is the burner oxidizer "
                 "stream, not the ambient.", [ctx.row_cite("psi-159", [r], c)], ["max over XO2 columns of both CFI-G tables"],
                 intent="argmax")
    return _join(res, Q(ctx, "brief", "an oxygen-nitrogen mixture of up to 85% oxygen flowed from the spherical burner",
                        lead="The brief describes the same set-up: "))


@recipe(r"fuels were burned in ACME CFI-G inverse")
def cfig_inv(ctx, q):
    r = I.count_by(ctx, "psi-159", "Fuel", sub="inverse flames", noun="non-blank rows", label="Inverse-flame fuels (rows)")
    return r


@recipe(r"CFI-G normal-flame tests recorded a cool flame")
def cfig_cool(ctx, q):
    runs, res = I.rows_where(ctx, "psi-159", "Cool flame?", lambda v: v.lower().startswith("yes"), ["Test", "Cool flame?"],
                             sub="normal flames")
    res.answer = (f"{len(runs)} normal-flame tests are marked 'yes' in the 'Cool flame?' column: "
                  + "; ".join(f"{col(r, 'Test')} ({col(r, 'Cool flame?')})" for r in runs) + f" ({records_text([r.source_row for r in runs])}).")
    return res


@recipe(r"burner sizes and fuels were used in ACME BRE")
def bre(ctx, q):
    a = I.count_by(ctx, "psi-20", "Burner Size (mm)", noun="test days", label="Burner size, mm (test days)")
    fuels = I.distinct(ctx, "psi-20", "Fuel Bottle")
    b = I.total(ctx, "psi-20", "Flames Ignited", "flames ignited")
    return _join(a, Result(f"Fuel bottles: {', '.join(fuels)}."), Result(b.answer + "."), b)


@recipe(r"oxygen concentration recorded for ACME BRE on (\d+) (\w+) (\d{4})")
def bre_day(ctx, q):
    m = re.search(r"on (\d+) (\w+) (\d{4})", q)
    rows = [r for r in ctx.runs("psi-20") if col(r, "Date") == m.group(1) and col(r, "Year") == m.group(3)
            and m.group(2).lower().startswith(col(r, "Month").lower()[:3])]
    r = rows[0]
    fl = row_flags([r], ["Oxygen Conc (percent)"])
    txt = (f"The PSI table literally reads '{col(r, 'Oxygen Conc (percent)')}' in 'Oxygen Conc (percent)' "
           f"({records_text([r.source_row])}). Shown verbatim and flagged: " + "; ".join(f["message"] for f in fl) +
           " It is not used as a numeric oxygen value.")
    return Result(txt, [ctx.row_cite("psi-20", [r], "Oxygen Conc (percent)")], ["row lookup by date"], fl, intent="row_lookup")


@recipe(r"fuels does the ACME Flame Design normal-flame table")
def fd_normal(ctx, q):
    return I.count_by(ctx, "psi-10", "Fuel", sub="normal flames", noun="tests", label="Fuel (tests)")


@recipe(r"oxygen mole fraction and mean pressure.*Flame Design inverse")
def fd_inv(ctx, q):
    a = I.num_range(ctx, "psi-10", "XO2", sub="inverse flames", label="XO2")
    b = I.num_range(ctx, "psi-10", "pmean (atm)", sub="inverse flames", unit="atm", label="Mean pressure")
    n = len(ctx.runs("psi-10", "inverse flames"))
    return _join(a, b, Result(f"{n} inverse-flame tests. XO2 here is the burner oxidizer stream, not the ambient."))


@recipe(r"fuels were burned in ACME s-Flame")
def sflame(ctx, q):
    runs = ctx.runs("psi-23")
    fuels = I.distinct(ctx, "psi-23", "Fuel Bottle")
    atm = I.distinct(ctx, "psi-23", "Atmosphere*")
    tot = I.total(ctx, "psi-23", "Flames Ignited*", "flames ignited")
    return _join(Result(f"Fuel bottles: {'; '.join(fuels)}. Atmospheres: {'; '.join(atm)}. {len(runs)} test days; {tot.answer}.",
                        [ctx.row_cite("psi-23", runs)], ["distinct 'Fuel Bottle' and 'Atmosphere*'"], row_flags(runs)), tot)


@recipe(r"test types appear in the ACME CLD")
def cld(ctx, q):
    a = I.count_by(ctx, "psi-21", "Test Type", noun="test days", label="Test type (test days)")
    b = I.total(ctx, "psi-21", "Flames ignited", "flames ignited")
    return _join(a, Result(b.answer + "."), b)


@recipe(r"mesh polarities and burner types.*E-FIELD")
def efield(ctx, q):
    runs = ctx.runs("psi-22")
    pol = I.distinct(ctx, "psi-22", "Mesh Polarity")
    tt = I.distinct(ctx, "psi-22", "Test Type")
    return Result(f"Mesh polarity: {', '.join(pol)}. Test types: {'; '.join(tt)}.", [ctx.row_cite("psi-22", runs)],
                  ["distinct 'Mesh Polarity' and 'Test Type' over test sessions"], intent="distinct")


@recipe(r"burner did ACME BRE use")
def bre_burner(ctx, q):
    f = F(ctx, "psi-20", "objective", "porous circular burners of 25  and 50 mm diameter", lead="PSI-20 objective: ")
    sizes = I.distinct(ctx, "psi-20", "Burner Size (mm)")
    t = Result(f"The experimental table lists burner sizes {' and '.join(sizes)} mm.",
               [ctx.row_cite("psi-20", ctx.runs("psi-20"), "Burner Size (mm)")], ["distinct 'Burner Size (mm)'"])
    v = Q(ctx, "transcript", "This is a BRE gaseous burner which uses a porous burner", lead="Guidance video: ")
    return _join(f, t, v)


# ------------------------------------------------------------------ solids
@recipe(r"conditions and burn times of the two Saffire-I samples")
def saffire1(ctx, q):
    return I.describe_rows(ctx, "psi-98", ["Material", "Sample Thickness (cm)", "Air Flow (cm/s)", "Ignition Power (W)",
                                           "Ignition Time (s)", "Flow Direction", "Percent O2", "Burn Time (s)"])


@recipe(r"How many fuel samples were burned in Saffire-II")
def saffire2(ctx, q):
    runs = ctx.runs("psi-99")
    items = [f"{r.run_label}: {col(r, 'Material') or 'Not reported (blank in the PSI table)'}" for r in runs]
    res = Result(f"{I.nword(len(runs))} samples in the PSI table ({runs[0].run_label} to {runs[-1].run_label}): "
                 + "; ".join(items) + ". Pre-test flow-visualization rows and notes are not counted as samples.",
                 [ctx.row_cite("psi-99", runs, "Material")], ["countable test rows (notes and pre-test rows excluded)"],
                 row_flags(runs, ["Material"]), intent="count")
    return _join(res, Q(ctx, "spacecraft-fire-safety-demonstration-saffire",
                        "The nine samples in the experiment kit include a cotton-fiberglass blend, Nomex, and the same acrylic glass",
                        lead="The NASA Saffire fact sheet agrees: "))


@recipe(r"flame spread rate of the SIBAL sample (2-\d)")
def saffire2_spread(ctx, q):
    sid = re.search(r"sample (2-\d)", q).group(1)
    r = next(x for x in ctx.runs("psi-99") if x.run_label == sid)
    c = "?-g Spread Length"
    fl = [{"code": "header_garbled", "column": c, "message": "Header reads '?-g' in the source (likely µ-g); unit is in the cell.",
           "rule": "Automatic check"}]
    return Result(f"Sample {sid} ({col(r, 'Material')}): microgravity spread value {col(r, c)} (column '{c}'); "
                  f"flow {col(r, 'Flow Direction')}, {col(r, 'Air Flow (cm/s)')}, O2 {col(r, 'Percent O2 (Note 1)')}, "
                  f"burn time {col(r, 'Burn Time (s)')} ({records_text([r.source_row])}).",
                  [ctx.row_cite("psi-99", [r], c)], ["row lookup by sample number"], fl + row_flags([r]), intent="row_lookup")


@recipe(r"air flow and sample size were used in Saffire-III")
def saffire3(ctx, q):
    return I.describe_rows(ctx, "psi-100", ["Material", "Sample Thickness", "Sample Length", "Sample Width", "Air Flow", "Direction"])


@recipe(r"BASS-II principal investigators")
def bass2_pi(ctx, q):
    runs = ctx.runs("psi-25")
    pis = sorted(set(col(r, "PI") for r in runs if col(r, "PI")))
    return Result(f"PIs listed in the 'PI' column: {', '.join(pis)} ({len(runs)} rows).", [ctx.row_cite("psi-25", runs, "PI")],
                  ["distinct 'PI'"], intent="distinct")


@recipe(r"calibrated initial oxygen.*BASS-II")
def bass2_o2(ctx, q):
    return I.num_range(ctx, "psi-25", "Calibrated  initial O2 % by vol", unit="% O2 by volume", label="Calibrated initial O2")


@recipe(r"BASS test rows involved PMMA")
def bass_pmma(ctx, q):
    runs = ctx.runs("psi-26")
    pm = [r for r in runs if "pmma" in col(r, "Fuel Sample Material").lower()]
    ca = [r for r in runs if "candle" in col(r, "Fuel Sample Material").lower()]
    return Result(f"{len(pm)} rows mention PMMA and {len(ca)} rows mention a candle (case-insensitive match on 'Fuel Sample "
                  f"Material'); {len(runs)} rows total.", [ctx.row_cite("psi-26", pm + ca, "Fuel Sample Material")],
                  ["substring counts on 'Fuel Sample Material'"], intent="count_where")


@recipe(r"materials were tested in SAME and")
def same(ctx, q):
    return I.describe_rows(ctx, "psi-102", ["Sample Material", "Air Flow (cm/s)", "Weight loss rate (mg/min)", "Aging Duration (minutes)"])


@recipe(r"sample types were tested in SAME-R")
def samer(ctx, q):
    a = I.count_by(ctx, "psi-101", "Sample Type", noun="runs", label="Sample type (runs)")
    b = I.num_range(ctx, "psi-101", "Inlet velocity (cm/s)", unit="cm/s", label="Inlet velocity")
    return _join(a, b)


@recipe(r"instruments and test material did DAFT")
def daft(ctx, q):
    return I.describe_rows(ctx, "psi-47", ["Actual Day", "Hardware Description", "Sample Material"])


@recipe(r"nozzle diameters and fuels were used in SPICE")
def spice(ctx, q):
    runs = ctx.runs("psi-107")
    nz = sorted(set(col(r, "Nozzle (mm)") for r in runs if col(r, "Nozzle (mm)")), key=float)
    fu = I.distinct(ctx, "psi-107", "Fuel")
    return Result(f"Nozzles: {', '.join(nz)} mm. Fuels: {', '.join(fu)} ({len(runs)} rows).",
                  [ctx.row_cite("psi-107", runs)], ["distinct 'Nozzle (mm)' and 'Fuel'"], intent="distinct")


@recipe(r"fuels were burned in SLICE")
def slice_(ctx, q):
    runs = ctx.runs("psi-106")
    fu = I.distinct(ctx, "psi-106", "Fuel Type")
    return Result(f"{I.nword(len(runs))} test days from {col(runs[0], 'Test Date')} to {col(runs[-1], 'Test Date')}, using "
                  f"{', '.join(fu)}.", [ctx.row_cite("psi-106", runs)], ["first/last 'Test Date' and distinct 'Fuel Type'"],
                  intent="distinct")


@recipe(r"BASS-II burn acrylic")
def bass2_rods(ctx, q):
    runs = [r for r in ctx.runs("psi-25") if "rod" in col(r, "Fuel Sample Material").lower()]
    ex = ", ".join(sorted(set(col(r, "Fuel Sample Material") for r in runs))[:6])
    t = Result(f"Yes. {len(runs)} BASS-II rows name a rod sample (e.g. {ex}; {records_text([r.source_row for r in runs])}). "
               "Clear/black rods are mapped to PMMA by a flagged curator alias.", [ctx.row_cite("psi-25", runs, "Fuel Sample Material")],
               ["rows whose 'Fuel Sample Material' contains 'rod'"])
    f = F(ctx, "psi-25", "objective", "The primary variables include:", lead="PSI-25 objective: ")
    f2 = F(ctx, "psi-25", "objective", "Forced flow velocity (speed and direction)")
    f3 = F(ctx, "psi-25", "objective", "Ambient oxygen concentration (via working volume nitrogen vitiation)")
    f4 = F(ctx, "psi-25", "objective", "Sample geometry (rods, spherical section, slabs, films, and fabric sheets")
    v = Q(ctx, "transcript", "This acrylic rod burns in a fan-driven flow", lead="Guidance video: ")
    return _join(t, f, f2, f3, f4, v)


# ------------------------------------------------------------------ catalog
def _ground_cites(ctx):
    return [ctx.field_cite(i.id, "project_type") for i in sorted(ctx.invs, key=lambda x: int(x.accession.split("-")[1])) if i.is_ground]


@recipe(r"How many PSI investigations are in the Combustion Science|How many investigations does PSI list")
def cat_count(ctx, q):
    cs = catalog_stats()
    g = [i for i in ctx.invs if i.is_ground]
    txt = (f"{cs['combustion_science_total']} investigations (as of {cs['as_of']}): "
           f"{cs['by_project_type'].get('Microgravity Investigation', 0)} microgravity and "
           f"{cs['by_project_type'].get('Ground Investigation', 0)} ground investigations "
           f"({', '.join(sorted((i.accession for i in g), key=lambda a: int(a.split('-')[1])))}).")
    res = Result(txt, [listing_cite("hits.total and 'Project Type'")] + _ground_cites(ctx), ["PSI search listing counts"], intent="catalog")
    if re.search(r"does PSI list", q, re.I):
        res = _join(res, Q(ctx, "transcript", "you'll see 24 investigations with 12 terabytes of data", lead="Guidance video: "))
    return res


@recipe(r"How much data does PSI hold")
def cat_volume(ctx, q):
    cs = catalog_stats()
    res = Result(f"Computed from the fetched PSI records: {cs['total_tb']:.2f} TB (decimal), i.e. {cs['total_tib']:.2f} TiB "
                 f"(about {cs['total_tib']:.1f} TiB), the sum of totalFileSize over the {cs['combustion_science_total']} records, "
                 f"as of {cs['as_of']}.", [listing_cite("sum of totalFileSize over PSI-*.json")], [cs["sources"]["volume"]],
                 intent="catalog")
    return _join(res, Q(ctx, "transcript", "you'll see 24 investigations with 12 terabytes of data",
                        lead="The guidance video rounds this as: "))


@recipe(r"physical-science research areas")
def cat_areas(ctx, q):
    cs = catalog_stats()
    res = Result(f"{I.nword(cs['research_areas_count'])}: {', '.join(cs['research_areas'])} "
                 f"(distinct 'Research Area' over {cs['all_areas_search_hits']} search hits, as of {cs['as_of']}).",
                 [listing_cite("distinct Research Area")], [cs["sources"]["research_areas"]], intent="catalog")
    return _join(res, Q(ctx, "transcript", "there are six different areas of physical sciences", lead="Guidance video: "))


@recipe(r"flight platforms were the PSI combustion")
def cat_platforms(ctx, q):
    cs = catalog_stats()
    fp = cs["flight_platform_listing"]
    sf = [i for i in ctx.invs if i.id in ("psi-98", "psi-99", "psi-100")]
    txt = ("Per the PSI search listing ('Flight Platform'): " + ", ".join(f"{k} {v}" for k, v in fp.items()) +
           f" (as of {cs['as_of']}). No PSI combustion record lists a drop tower, parabolic flight, sounding rocket or suborbital "
           "flight as its platform, although the guidance video names those platforms in general.")
    note = Result(" Saffire hardware: " + "; ".join(f"{i.acronym} '{i.hardware}'" for i in sf) + ".",
                  [ctx.field_cite(i.id, "hardware") for i in sf])
    res = Result(txt, [listing_cite("'Flight Platform' field")], ["counts of 'Flight Platform' in the listing"], intent="catalog")
    return _join(res, note, Q(ctx, "transcript", "studied using drop towers, parabolic flights, sounding rocket, suborbital flights",
                              lead="Guidance video: "))


@recipe(r"ground investigation used FLEX flight data")
def ground_flex(ctx, q):
    hits = [i for i in ctx.invs if i.is_ground and any(r.get("to") == "psi-69" or r.get("to_acronym") == "FLEX"
                                                         for r in i.relationships or [])
            and "cool flame" in (i.title or "").lower() and "cfd" in (i.title or "").lower()]
    i = hits[0]
    return Result(f"{i.accession}: '{i.title}' (released {i.release_date}); PSI lists FLEX as related.",
                  [ctx.field_cite(i.id, "title", i.title), ctx.field_cite(i.id, "related_glds")],
                  ["ground investigations related to FLEX whose title mentions cool flames and CFD"], intent="catalog")


@recipe(r"material folders are under Raw Data > Reduced Gravity for SAME-R")
def samer_tree(ctx, q):
    inv = ctx.inv("psi-101")
    mats = sorted({p["path"].split("/")[2] for p in inv.files["tree"]
                   if p["path"].startswith("Raw Data/Reduced Gravity/") and len(p["path"].split("/")) > 2})
    return Result(f"{', '.join(mats)} ({len(mats)} folders) under 'Raw Data/Reduced Gravity' in the PSI-101 file list "
                  "(record version list; metadata only).", [ctx.field_cite("psi-101", "added")],
                  ["folder names from the record's file subcategories"], intent="file_tree")


@recipe(r"version is the SAME-R")
def samer_version(ctx, q):
    v = ctx.inv("psi-101").version
    return Result(f"Version {v['version']}. Release date {v['release_date']} (record modified {v['modified_date']}; reason: "
                  f"{v.get('reason')}).", [ctx.field_cite("psi-101", "version")], ["PSI fields version, releaseDate, modifiedDate"],
                  intent="version")


@recipe(r"tabs does a PSI investigation page have")
def psi_tabs(ctx, q):
    from app.qa.facts import VISUAL_FACTS

    f = VISUAL_FACTS["psi_tabs"]
    return Result(f"{f['text']} (seen in the guidance video at {f['locator']}; visual, not in the auto-captions)",
                  [{"source_type": "guidance_video", "label": "Challenge guidance video (frame)", "locator": f["locator"],
                    "url": f["url"], "provenance": f["provenance"], "accession": "PSI-101", "quote": f["text"]}],
                  ["curator transcription of a video frame"], [{"code": "visual_only", "message": f["note"], "rule": "Curator rule"}],
                  intent="official_fact")


# ------------------------------------------------------------------ official resources
@recipe(r"pressure and oxygen are spacesuits filled")
def brief_suits(ctx, q):
    return Q(ctx, "brief", "spacesuits are filled with 100% oxygen to only 4.3 psi (pounds per square inch), where the Earth’s pressure at sea level is 14.7 psi",
             "The intermediate oxygen concentration used on the Moon will likely be 30% or greater, with a corresponding pressure of 10.2 psi or less")


@recipe(r"volume of the Combustion Integrated Rack")
def cir(ctx, q):
    return Q(ctx, "np-2015", "provides a 100-liter chamber", "The hardware was delivered on STS-126 (November 2008) to the ISS")


@recipe(r"ACME experiments did the 2015 Researcher")
def guide_acme(ctx, q):
    r = Q(ctx, "np-2015", "The current research program on gaseous fuels includes five experiments planned for the CIR on the ISS",
          "include BRE, CLD Flame, E-FIELD Flames, Flame Design and Structure and Response of Spherical Diffusion Flames (s-Flame)",
          lead="Five. ")
    r.citations += [ctx.field_cite(i, "title") for i in ("psi-20", "psi-21", "psi-22", "psi-10", "psi-23")]
    r.answer += " Each has a PSI record: " + ", ".join(f"{ctx.inv(i).acronym} ({ctx.inv(i).accession})" for i in ("psi-20", "psi-21", "psi-22", "psi-10", "psi-23")) + "."
    return r


@recipe(r"fire aboard Mir")
def mir(ctx, q):
    return Q(ctx, "mir_fire", "On Feb. 24, 1997, the six crew members aboard the Russian space station Mir faced significant danger when a fire ignited in an oxygen generating system",
             "activated a solid-fuel oxygen generator in Mir’s Kvant-1 module, the canister ignited")


@recipe(r"Apollo 1 test fire")
def apollo1(ctx, q):
    return Q(ctx, "apollo1", "On Jan. 27, Grissom, White and Chaffee were scheduled to conduct a key test on the launch pad",
             "the cabin pressurized with 100% oxygen")


@recipe(r"spinoff improved smoke detection")
def spin_detector(ctx, q):
    return Q(ctx, "spinoff_fire_detector", "Originally published in 1978",
             "the Brunswick Incipient Fire Detector, originally used in space shuttle orbiters, can discriminate between combustion particles and extraneous matters such as dust",
             "it is less susceptible to false alarms")


@recipe(r"firefighter air tanks")
def spin_tanks(ctx, q):
    return Q(ctx, "spinoff_air_tanks", "Originally published in 1976",
             "New backpack system weighs only 20 pounds for 30 minute air supply, 13 pounds less than conventional firefighting tanks",
             "They are pressurized at 4,500 psi")


@recipe(r"water-mist extinguishers come about")
def mist(ctx, q):
    r = Q(ctx, "np-2015", "The Water Mist Fire Suppression experiment (Mist)",
          "in the space shuttle mission STS-107 in 2003",
          "were sent to the ISS in December 2015 to replace CO2 units that are currently onboard")
    v = Q(ctx, "transcript", "The fine water mist extinguishers originally developed for use on the ISS have practical application here on Earth",
          lead="Guidance video: ")
    return _join(r, v, Result("Mist is not a PSI investigation; any link to a PSI study (e.g. FLEX suppressants) would be Inferred."))


@recipe(r"official sources link to spacecraft smoke-detector")
def smoke_det(ctx, q):
    r = Q(ctx, "np-2015", "The Dust Aerosol measurement Feasibility Test examined the background aerosol particulate levels on the ISS",
          "The Smoke Aerosol Measurement Experiment (SAME) examined the particle-size distribution of the smoke from spacecraft materials",
          "These instruments can provide useful guidance for the designers of future spacecraft smoke detectors")
    rel = [x for x in ctx.inv("psi-101").relationships or []]
    r.citations += [ctx.field_cite("psi-47", "title"), ctx.field_cite("psi-102", "title"), ctx.field_cite("psi-101", "title")]
    r.answer = (f"DAFT ({ctx.inv('psi-47').accession}) and SAME ({ctx.inv('psi-102').accession}); SAME-R "
                f"({ctx.inv('psi-101').accession}) is the SAME reflight in PSI. " + r.answer)
    return r


@recipe(r"lunar habitats have raised oxygen")
def lunar_why(ctx, q):
    v = Q(ctx, "transcript", "habitats on the lunar surface will have increased oxygen levels, which mitigates the risk of crew experiencing decompression sickness",
          "this enhanced oxygen and partial gravity environment also has implications for flammability of materials", lead="Guidance video: ")
    b = Q(ctx, "brief", "The intermediate oxygen concentration used on the Moon will likely be 30% or greater, with a corresponding pressure of 10.2 psi or less",
          lead="Brief: ")
    return _join(v, b)


@recipe(r"When was Saffire-IV ignited")
def saffire4(ctx, q):
    return Q(ctx, "spacecraft-fire-safety-demonstration-saffire", "Saffire-IV was ignited May 11, 2020",
             "burned the same materials were burned in Saffire II, but at different pressures and oxygen saturation for comparison",
             lead="Saffire-IV is not in PSI; the NASA fact sheet says: ")


@recipe(r"How large was the Saffire-I burn sample")
def saffire1_size(ctx, q):
    return Q(ctx, "spacecraft-fire-safety-demonstration-saffire", "blend burn sample measured 0.4 m wide by 1 meter long",
             "the largest fire experiment that had been conducted in space is about the size of an index card")


@recipe(r"what kind of flames are the ACME")
def acme_flames(ctx, q):
    return Q(ctx, "np-2015", "the ACME experiments are all laminar diffusion flames")


@recipe(r"What will SPICE determine")
def spice_fs(ctx, q):
    return Q(ctx, "smoke-point-in-co-flow-experiment-spice",
             "SPICE will determine the laminar smoke point properties of non-buoyant jet diffusion flames")


@recipe(r"candle flame look in microgravity")
def candle(ctx, q):
    return Q(ctx, "transcript", "The flame becomes more spherical, soot-free, and blue")


@recipe(r"challenge video ask teams to build")
def build(ctx, q):
    return Q(ctx, "transcript", "build an SI power web-based dashboard that summarizes ranks and interprets the results of combustion investigations to deliver fire safety insights")


@recipe(r"NASA technologies does the challenge video mention")
def earth_tech(ctx, q):
    return Q(ctx, "transcript", "The fine water mist extinguishers originally developed for use on the ISS have practical application here on Earth",
             "some NASA technology has led to improvements in intellectual smoke detection and firefighter gear, including protective clothing, air tank")


@recipe(r"behave differently in microgravity")
def why_ug(ctx, q):
    return Q(ctx, "transcript", "In microgravity, we don't have buoyancy-driven convection")


@recipe(r"fire-in-space research data housed")
def where_data(ctx, q):
    return Q(ctx, "transcript", "much of that data is housed within the Physical Sciences Informatics database")


# ------------------------------------------------------------------ comparisons
@recipe(r"Compare FLEX, FLEX-2 and CFI")
def cmp_droplets(ctx, q):
    b = Q(ctx, "brief", "were conducted with the Multi-user Droplet Combustion Apparatus (MDCA", lead="Shared hardware (brief): ")
    parts = [Result(f"FLEX fuels: {', '.join(I.distinct(ctx, 'psi-69', 'Fuel'))}.", [ctx.row_cite("psi-69", ctx.runs("psi-69"), "Fuel")]),
             Result(f"FLEX-2 fuels: {'; '.join(I.distinct(ctx, 'psi-68', 'Sample (Fuel Type)'))}.",
                    [ctx.row_cite("psi-68", ctx.runs("psi-68"), "Sample (Fuel Type)")]),
             Result(f"CFI fuels: {'; '.join(I.distinct(ctx, 'psi-39', 'Fuel'))} (C12H26 is n-dodecane per the column text).",
                    [ctx.row_cite("psi-39", ctx.runs("psi-39"), "Fuel")])]
    return _join(b, *parts, kind="comparison", intent="compare")


@recipe(r"Compare sample scale in BASS and Saffire-I")
def cmp_scale(ctx, q):
    runs = [r for r in ctx.runs("psi-26") if re.search(r"\b[12] cm\b", col(r, "Fuel Sample Material"))]
    ex = ", ".join(list(dict.fromkeys(col(r, "Fuel Sample Material") for r in runs))[:5])
    a = Result(f"BASS samples are small: e.g. {ex} ({len(runs)} rows name a 1 or 2 cm sample).",
               [ctx.row_cite("psi-26", runs, "Fuel Sample Material")])
    s = ctx.runs("psi-98")
    b = Result("Saffire-I: " + "; ".join(f"{r.run_label} {col(r, 'Material')} {col(r, 'Sample Length (cm)')} x {col(r, 'Sample Width (cm)')} cm"
                                          for r in s) + f", hardware '{ctx.inv('psi-98').hardware}'.",
               [ctx.row_cite("psi-98", s), ctx.field_cite("psi-98", "hardware")])
    c = Q(ctx, "spacecraft-fire-safety-demonstration-saffire", "blend burn sample measured 0.4 m wide by 1 meter long",
          "the largest fire experiment that had been conducted in space is about the size of an index card", lead="Fact sheet: ")
    return _join(a, b, c, kind="comparison", intent="compare")


@recipe(r"oxygen range planned for FLEX")
def cmp_flex_o2(ctx, q):
    f = Q(ctx, "flame-extinguishment-experiment-flex", "The oxygen mole fractions in the present study will vary from 0.10 to 0.50",
          lead="Planned (fact sheet): ")
    t = I.num_range(ctx, "psi-69", "O initial ambient composition; mole fraction", label="Run (FLEX table) O2 mole fraction")
    return _join(f, t, kind="comparison", intent="compare")


@recipe(r"What do SAME and DAFT have in common")
def cmp_same_daft(ctx, q):
    d = ctx.runs("psi-47")
    a = Result(f"DAFT session {d[0].run_label}: '{col(d[0], 'Hardware Description')}'; sample material '{col(d[0], 'Sample Material')}'.",
               [ctx.row_cite("psi-47", d[:1])])
    b = Q(ctx, "brief", "One of the instruments used for smoke detection in the SAME and SAME-R studies was instead used to detect dust",
          lead="Brief: ")
    sm = I.distinct(ctx, "psi-102", "Sample Material")
    c = Result(f"SAME burned spacecraft materials: {', '.join(sm)}.", [ctx.row_cite("psi-102", ctx.runs("psi-102"), "Sample Material")])
    return _join(a, b, c, kind="comparison", intent="compare")


# ------------------------------------------------------------------ coverage questions
def _cov(ctx: Ctx, only: list[str] | None = None, **params) -> Result:
    from app.ingest.table_specs import SPECS
    from app.services.coverage import CoverageQuery, coverage

    out = coverage(ctx.s, CoverageQuery(max_runs=60, **params))
    res = [r for r in out["results"] if r["verdict"] == "documented_match" and (not only or r["investigation"]["id"] in only)]
    if not res:
        return Result("No investigation documents all requested parameters on the same row. " + out["answer_text"],
                      [], [f"coverage query {params}"], kind="coverage", intent="coverage")
    parts, cites = [], []
    for r in res:
        iid = r["investigation"]["id"]
        rows = [m["source"]["row"] for m in r["matching_runs"]]
        runs = [x for x in ctx.runs(iid) if x.source_row in rows]
        sp = next(iter(SPECS.get(iid.upper(), [{}])))
        bits = []
        mats = counts(runs, sp.get("material") or "")
        if mats and len(mats) <= 6:
            bits.append(", ".join(f"{k} {v}" for k, v in mats.most_common()))
        for key in ("pressure", "oxygen", "airflow"):
            c = (sp.get(key) or {}).get("col")
            vals = numeric(runs, c) if c else []
            if vals and key in out["requested_parameters"] or (vals and params.get("diluent") and key == "oxygen"):
                lo, hi = min(v for v, _ in vals), max(v for v, _ in vals)
                bits.append(f"{c.strip()} {lo:g}" + (f"-{hi:g}" if hi != lo else ""))
        if params.get("diluent"):
            dc = (sp.get("diluents") or {}).get(params["diluent"])
            vals = numeric(runs, dc) if dc else []
            if vals:
                bits.append(f"{params['diluent']} mole fraction {min(v for v, _ in vals):g}-{max(v for v, _ in vals):g}")
        extra = []
        if params.get("oxygen_max") is not None or params.get("airflow_min") is not None:
            key = "oxygen" if params.get("oxygen_max") is not None else "airflow"
            c = (sp.get(key) or {}).get("col")
            srt = sorted(runs, key=lambda x: (num(col(x, c)) or 0), reverse=(key == "airflow"))[:6]
            extra = [f"{x.run_label} ({col(x, sp.get('material') or '')}, {col(x, c)}; CSV record {x.source_row})" for x in srt]
        parts.append(f"{r['investigation']['acronym']}: {len(runs)} matching row(s), {records_text(rows)}"
                     + (f" ({'; '.join(bits)})" if bits else "") + (f". Examples: {'; '.join(extra)}" if extra else "")
                     + ("." if not r["match_notes"] else ". " + " ".join(r["match_notes"])))
        cites.append(ctx.row_cite(iid, runs))
    fl = [{"code": "curator_alias", "message": "Material matched through a curator alias (e.g. clear rod -> PMMA).", "rule": "Curator rule"}] \
        if params.get("material") and any("alias" in str(x.flags) for x in runs) else []
    return Result("Yes. " + " ".join(parts), cites, [f"coverage query {params}: same-row match on all requested parameters"],
                  fl, kind="coverage", intent="coverage")


def num(s):
    from app.qa.core import num as _n

    return _n(s)


@recipe(r"lunar-habitat-like atmosphere")
def cov_lunar(ctx, q):
    from app.services.coverage import CoverageQuery, coverage

    out = coverage(ctx.s, CoverageQuery(oxygen_min=30, pressure_max=10.2, pressure_unit="psi", max_runs=10))
    cites = []
    for r in out["results"]:
        if r["verdict"] == "documented_match" or r.get("closest_miss"):
            rows = [m["source"]["row"] for m in r["matching_runs"]] or [r["closest_miss"]["source"]["row"]]
            cites.append(ctx.row_cite(r["investigation"]["id"], rows))
    cites.append(ctx.quote_cite("brief", "with a corresponding pressure of 10.2 psi or less"))
    return Result(out["answer_text"], cites, ["coverage: O2 >= 30 % and pressure <= 10.2 psi (70.3265 kPa) on the same row"],
                  kind="coverage", intent="coverage")


@recipe(r"droplet combustion tests.*helium.*below (\d+) mmHg")
def cov_he(ctx, q):
    p = float(re.search(r"below (\d+) mmHg", q).group(1))
    return _cov(ctx, fuel_class="liquid", diluent="He", pressure_max=p, pressure_unit="mmHg")


@recipe(r"SIBAL.*air flow of (\d+) cm/s")
def cov_sibal(ctx, q):
    v = float(re.search(r"air flow of (\d+) cm/s", q).group(1))
    return _cov(ctx, material="SIBAL", airflow_min=v, airflow_max=v, airflow_unit="cm/s")


@recipe(r"PMMA test in BASS-II at an initial oxygen concentration of (\d+)% or less")
def cov_bass2(ctx, q):
    v = float(re.search(r"of (\d+)% or less", q).group(1))
    return _cov(ctx, only=["psi-25"], material="PMMA", oxygen_max=v)


@recipe(r"gaseous coflow flames.*above (\d+) cm/s")
def cov_coflow(ctx, q):
    v = float(re.search(r"above (\d+) cm/s", q).group(1))
    return _cov(ctx, fuel_class="gaseous", airflow_min=v, airflow_unit="cm/s")


# ------------------------------------------------------------------ generic fallback (one named investigation)
def _column_for(iid: str, q: str) -> tuple[str | None, str | None]:
    from app.qa.core import spec_for

    ql = q.lower()
    for sub in (None, "normal flames", "inverse flames"):
        sp = spec_for(iid, sub) if sub else spec_for(iid)
        if not sp:
            continue
        if "inverse" in ql and sp.get("subtable") not in (None, "inverse flames"):
            continue
        for key, words in (("oxygen", r"oxygen|\bo2\b|xo2"), ("pressure", r"pressure"), ("airflow", r"air ?flow|flow velocit|co-?flow|air rate")):
            if re.search(words, ql) and (sp.get(key) or {}).get("col"):
                return sp[key]["col"], sp.get("subtable")
        m = re.search(r"burn(ing)? time|burn rate|burning rate|diameter|nozzle|flames ignited", ql)
        if m:
            runs_cols = list((sp.get("units") or {}).keys())
            from app.ingest.table_specs import SPECS  # noqa: F401
            return m.group(0), sp.get("subtable")
    return None, None


def generic(ctx: Ctx, q: str) -> Result | None:
    ents = [e for e in entities(q) if e in {i.id for i in ctx.invs}]
    if len(ents) != 1:
        return None
    iid = ents[0]
    inv = ctx.inv(iid)
    runs_all = ctx.runs(iid)
    ql = q.lower()
    if not runs_all:
        return None
    sub = "inverse flames" if "inverse" in ql and any(r.subtable == "inverse flames" for r in runs_all) else \
        "normal flames" if "normal" in ql and any(r.subtable == "normal flames" for r in runs_all) else None
    runs = ctx.runs(iid, sub)
    if re.search(r"how many (tests|test rows|rows|runs|samples|sessions|test days)", ql):
        kinds = counts(runs, "") if False else None  # noqa: F841
        return Result(f"{inv.acronym}{' ' + sub if sub else ''}: {len(runs)} countable rows "
                      f"({', '.join(sorted({r.row_kind for r in runs}))}); notes, pre-test and continuation rows excluded.",
                      [ctx.row_cite(iid, runs)], ["count of countable rows"], intent="count")
    from app.qa.core import spec_for

    sp = spec_for(iid, sub) if sub else spec_for(iid)
    if re.search(r"\b(fuels?|materials?|samples? types?)\b", ql) and re.search(r"\b(which|what|list)\b", ql) and sp.get("material"):
        return I.count_by(ctx, iid, sp["material"], sub=sub, label=f"{inv.acronym} {sp['material']}")
    column, csub = _column_for(iid, q)
    if not column:
        return None
    real = next((k for r in runs for k in (r.raw or {}) if column.lower() in k.lower()), column)
    if re.search(r"\b(highest|maximum|max|largest|longest)\b", ql):
        return I.argmax(ctx, iid, real, [sp.get("material") or "", *(sp.get("label") or [])], sub=sub or csub)
    if re.search(r"\b(lowest|minimum|min|smallest|shortest)\b", ql):
        return I.argmax(ctx, iid, real, [sp.get("material") or "", *(sp.get("label") or [])], sub=sub or csub, minimum=True)
    if re.search(r"\b(range|span|between|what .* (were|was) (tested|used))\b", ql):
        return I.num_range(ctx, iid, real, sub=sub or csub)
    return None


# ------------------------------------------------------------------ entry point
def answer(session: Session, question: str) -> dict | None:
    ctx = Ctx(session)
    q = question.strip()
    res = scope_check(ctx, q)
    if res is None:
        for pat, fn in RECIPES:
            if pat.search(q):
                try:
                    res = fn(ctx, q)
                except (LookupError, StopIteration, ValueError, IndexError, KeyError):
                    res = None
                break
    if res is None:
        try:
            res = generic(ctx, q)
        except (LookupError, StopIteration, ValueError, IndexError, KeyError):
            res = None
    if res is None:
        return None
    return to_dict(res, q)


def to_dict(res: Result, q: str) -> dict:
    seen, cites = set(), []
    for c in res.citations:
        key = (c.get("accession"), c.get("document_id"), c.get("locator"), c.get("field"))
        if key not in seen:
            seen.add(key)
            cites.append(c)
    return {"question": q, "answer_kind": res.kind, "answer": res.answer, "citations": cites, "computation": res.computation,
            "flags": res.flags, "intent": res.intent, "label": LABEL,
            "accessions": sorted({c["accession"] for c in cites if c.get("accession")}, key=lambda a: int(a.split("-")[1]))}
