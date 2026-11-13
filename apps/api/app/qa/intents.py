"""Generic computed intents over PSI experimental tables. Every number comes from the stored rows."""
from __future__ import annotations

import re

from app.qa.core import (NUMBER_WORDS, Ctx, Result, col, counts, fmt_num, numeric, ordered_distinct, records_text,
                         row_flags)


def count_by(ctx: Ctx, iid: str, column: str, sub: str | None = None, noun: str = "rows", label: str | None = None) -> Result:
    runs = ctx.runs(iid, sub)
    c = counts(runs, column)
    parts = ", ".join(f"{v} ({n})" for v, n in c.most_common())
    blank = len(runs) - sum(c.values())
    txt = f"{label or column}: {parts}; {len(runs)} {noun} in total" + (f" ({blank} blank)" if blank else "") + "."
    return Result(txt, [ctx.row_cite(iid, runs, column)],
                  [f"count of rows by '{column}' over {len(runs)} {('' if sub is None else sub + ' ')}rows of {ctx.inv(iid).acronym}"],
                  row_flags(runs, [column]), intent="count_by")


def num_range(ctx: Ctx, iid: str, column: str, sub: str | None = None, unit: str = "", label: str | None = None) -> Result:
    runs = ctx.runs(iid, sub)
    vals = numeric(runs, column)
    if not vals:
        written = ordered_distinct(runs, column)
        if written:
            return Result(f"{label or column} (as written in the table, not single numbers): {' | '.join(written[:8])}.",
                          [ctx.row_cite(iid, runs, column)], [f"distinct verbatim '{column}' cells (no single numeric value)"],
                          intent="range")
        return Result(f"{label or column}: Not reported in the PSI table.", [ctx.row_cite(iid, runs, column)], intent="range")
    lo = min(vals, key=lambda t: t[0])
    hi = max(vals, key=lambda t: t[0])
    u = f" {unit}" if unit else ""

    def show(t):
        src = col(t[1], column)
        return f"{src} (≈{t[0]:.3f})" if len(src.split(".")[-1]) > 4 and "." in src else src

    txt = (f"{label or column}: {show(lo)} to {show(hi)}{u} "
           f"(min at {records_text([lo[1].source_row])}, max at {records_text([hi[1].source_row])}; {len(vals)} rows with a value).")
    return Result(txt, [ctx.row_cite(iid, [lo[1], hi[1]], column)],
                  [f"min/max of numeric cells in '{column}' ({len(vals)} of {len(runs)} rows numeric); source text kept"],
                  row_flags(runs, [column]), intent="range")


def argmax(ctx: Ctx, iid: str, column: str, show: list[str], sub: str | None = None, unit: str = "", minimum: bool = False,
           id_col: str | None = None) -> Result:
    runs = ctx.runs(iid, sub)
    vals = numeric(runs, column)
    best = (min if minimum else max)(vals, key=lambda t: t[0])
    r = best[1]
    details = ", ".join(f"{c} {col(r, c)}" for c in show if col(r, c))
    txt = f"{'Lowest' if minimum else 'Highest'} {column}: {col(r, column)}{(' ' + unit) if unit else ''} ({details}; {records_text([r.source_row])})."
    cites = [r]
    if id_col and col(r, id_col):
        dup = [x for x in ctx.runs(iid, sub, all_kinds=True) if col(x, id_col) == col(r, id_col) and x is not r]
        if dup:
            txt += (f" Note: identifier {col(r, id_col)} also appears on {records_text([d.source_row for d in dup])} "
                    "(duplicate identifier in the source).")
            cites += dup
    return Result(txt, [ctx.row_cite(iid, cites, column)], [f"{'argmin' if minimum else 'argmax'} over {len(vals)} numeric '{column}' cells"],
                  row_flags([r], None), intent="argmax")


def nonzero(ctx: Ctx, iid: str, column: str, by: str, label: str) -> Result:
    runs = ctx.runs(iid)
    vals = [(x, r) for x, r in numeric(runs, column) if x > 0]
    by_c = counts([r for _, r in vals], by)
    mx = max(vals, key=lambda t: t[0])
    txt = (f"{len(vals)} tests had {label} > 0 (" + ", ".join(f"{k} {n}" for k, n in by_c.most_common()) +
           f"); maximum {label} mole fraction {col(mx[1], column)} ({records_text([mx[1].source_row])}).")
    return Result(txt, [ctx.row_cite(iid, [r for _, r in vals], column)],
                  [f"rows where '{column}' > 0, grouped by '{by}'"], row_flags(runs, [column]), intent="count_where")


def total(ctx: Ctx, iid: str, column: str, noun: str) -> Result:
    runs = ctx.runs(iid)
    vals = numeric(runs, column)
    s = sum(x for x, _ in vals)
    return Result(f"{fmt_num(s)} {noun} in total across the {len(runs)} listed test days", [ctx.row_cite(iid, runs, column)],
                  [f"sum of '{column}' over {len(vals)} rows"], intent="sum")


def rows_where(ctx: Ctx, iid: str, column: str, pred, show: list[str], sub: str | None = None) -> tuple[list, Result]:
    runs = [r for r in ctx.runs(iid, sub) if pred(col(r, column))]
    items = []
    for r in runs:
        items.append(", ".join(f"{col(r, c)}" for c in show if col(r, c)))
    return runs, Result("; ".join(items), [ctx.row_cite(iid, runs, column)], [f"rows filtered on '{column}'"],
                        row_flags(runs, None), intent="filter")


def describe_rows(ctx: Ctx, iid: str, columns: list[str], sub: str | None = None, all_kinds: bool = False) -> Result:
    runs = ctx.runs(iid, sub, all_kinds=all_kinds)
    lines = []
    for r in runs:
        bits = [f"{c}: {col(r, c)}" for c in columns if col(r, c)]
        lines.append(f"{r.run_label} — " + "; ".join(bits))
    return Result(" | ".join(lines), [ctx.row_cite(iid, runs)], [f"verbatim cells of {len(runs)} rows"],
                  row_flags(runs, None), intent="row_lookup")


def distinct(ctx: Ctx, iid: str, column: str, sub: str | None = None) -> list[str]:
    return ordered_distinct(ctx.runs(iid, sub), column)


def nword(n: int) -> str:
    return f"{NUMBER_WORDS.get(n, str(n)).capitalize()} ({n})" if n in NUMBER_WORDS else str(n)
