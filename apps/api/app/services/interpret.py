"""Deterministic plain-language interpretation ("interprets", required slide in the guidance video).

Templated sentences built only from computed facts (counts, ranges, matches, tags). No LLM, no outside
knowledge. Every sentence carries refs (CSV rows, record fields or brief) so it can be checked.
"""
from __future__ import annotations

from collections import Counter

from app.ingest.curation import CHALLENGE_URL
from app.labels import PARTIAL_GRAVITY_WARNING
from app.scenarios import SCENARIOS

LABEL = "Template interpretation (computed from the data, no AI)"
_NOUN = {"test": "test rows", "session": "test-day sessions", "test_matrix": "test-matrix rows", "data_index": "data-index rows"}


def _plural(n: int, word: str) -> str:
    return f"{n:,} {word}" + ("" if n == 1 or word.endswith("s") else "s")


def interpret_investigation(inv) -> dict:
    from app.services.coverage import countable, target_rows
    from app.services.variables import summarize

    out: list[dict] = []
    runs = countable(inv.test_runs)
    kinds = Counter(r.row_kind for r in runs)
    files = sorted({r.source_file for r in runs if r.source_file})
    kind_txt = ", ".join(f"{n:,} {_NOUN.get(k, k)}" for k, n in kinds.items()) or "no experimental-table rows"
    typ = "ground (modeling / lab) investigation" if inv.is_ground else f"microgravity investigation ({inv.platform})"
    lead = (f"Its PSI experimental table lists {kind_txt}." if len(files) == 1 else
            f"Its {len(files)} PSI experimental tables list {kind_txt}." if files else
            "PSI has no experimental table for it (records, files and publications only).")
    out.append({"text": f"{inv.acronym} is a {typ}. {lead}",
                "refs": [{"type": "psi_experimental_table", "files": files}, {"type": "psi_metadata", "field": "projectType",
                                                                             "url": inv.source_url}]})
    mats = Counter((r.material or "").strip() for r in runs if r.material)
    if mats and not inv.is_ground:
        top = ", ".join(f"{m} ({n})" for m, n in mats.most_common(4))
        out.append({"text": f"{len(mats)} distinct fuel / material {'entry appears' if len(mats) == 1 else 'entries appear'}; most frequent: {top}.",
                    "refs": [{"type": "psi_experimental_table", "files": files}]})
    for t in summarize(inv.test_runs)[:2]:
        sub = f" ({t['subtable']})" if t["subtable"] else ""
        if t["varied"]:
            parts = []
            for v in t["varied"][:5]:
                parts.append(f"{v['column']} {v['min']} to {v['max']}" if v.get("numeric") else f"{v['column']} ({v['n_distinct']} values)")
            out.append({"text": f"Varied between rows{sub}: " + "; ".join(parts) + ".",
                        "refs": [{"type": "psi_experimental_table", "files": [t["table"]]}]})
        if t["constant"]:
            cs = "; ".join(f"{c['column']} = {c.get('min') or (c.get('values') or [''])[0]}" for c in t["constant"][:4])
            out.append({"text": f"Held constant{sub}: {cs}.", "refs": [{"type": "psi_experimental_table", "files": [t["table"]]}]})
    atm = SCENARIOS["lunar_habitat"]["atmosphere"]
    tr = target_rows(inv.test_runs, atm["oxygen_pct_min"], atm["pressure_kpa_max"])
    has_o = any(r.oxygen_pct_min is not None for r in runs)
    has_p = any(r.pressure_kpa_min is not None for r in runs)
    if tr["both"]:
        rows = [r.source_row for r in tr["both"]]
        extra = f" ({len(tr['stream'])} use burner oxidizer-stream O2, not ambient)" if tr["stream"] else ""
        extra += " (planned test matrix, not single runs)" if tr["matrix"] else ""
        out.append({"text": f"Lunar habitat target (O2 >= 30 %, <= 10.2 psi): {len(rows)} rows meet both on the same row{extra}.",
                    "refs": [{"type": "psi_experimental_table", "rows": rows[:60], "files": files},
                             {"type": "challenge_brief", "url": CHALLENGE_URL}]})
    elif has_o and has_p:
        cm = tr["closest_miss"]
        txt = "Lunar habitat target: no row meets both O2 >= 30 % and <= 10.2 psi."
        refs = [{"type": "challenge_brief", "url": CHALLENGE_URL}]
        if cm is not None:
            txt += (f" Closest: CSV record {cm.source_row} at {cm.oxygen_source_text} O2 and {cm.pressure_source_text} "
                    f"({cm.pressure_kpa_min:.2f} kPa vs 70.33 kPa).")
            refs.insert(0, {"type": "psi_experimental_table", "rows": [cm.source_row], "files": files})
        out.append({"text": txt, "refs": refs})
    elif runs:
        miss = " and ".join(x for x, ok in (("oxygen", has_o), ("pressure", has_p)) if not ok)
        out.append({"text": f"Lunar habitat target cannot be assessed: {miss} not reported in the PSI table.",
                    "refs": [{"type": "psi_experimental_table", "files": files}]})
    if inv.lenses:
        out.append({"text": "Informs: " + "; ".join(f"{v['label']} (\u201c{v['excerpt'][:110]}\u201d, {v['source']})"
                                                     for v in inv.lenses.values()) + ".",
                    "refs": [{"type": "rule_tag", "sources": [v["source"] for v in inv.lenses.values()]}]})
    if inv.relationships:
        rel = ", ".join(r["to_acronym"] for r in inv.relationships)
        verb = "Reuses flight data of" if inv.is_ground else "PSI lists as related"
        out.append({"text": f"{verb}: {rel}.", "refs": [{"type": "psi_metadata", "field": "related_glds", "url": inv.source_url}]})
    nflags = sum(len(r.flags or []) for r in inv.test_runs) + len(inv.table_flags or [])
    if nflags:
        out.append({"text": f"{nflags} data-quality flag(s) are shown verbatim on this record (never silently corrected).",
                    "refs": [{"type": "data_quality"}]})
    out.append({"text": "Cannot be concluded from this record: " + (
        "flight behaviour (this is a 1-g lab / computational study). " if inv.is_ground else "") + PARTIAL_GRAVITY_WARNING
        + " It is not a materials certification.", "refs": [{"type": "challenge_brief", "url": CHALLENGE_URL}]})
    return {"label": LABEL, "sentences": out}
