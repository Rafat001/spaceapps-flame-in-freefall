"""'What varied vs what stayed the same' per experimental table (brief: Potential Considerations, Variables).

Computed from the verbatim PSI table cells of countable rows only. Identifier, date/time, camera and note
columns are listed separately; nothing is converted here (units stay as given in the header or cell).
"""
from __future__ import annotations

import re
from collections import Counter, defaultdict

from app.ingest.table_specs import COUNTABLE_KINDS
from app.units import parse_numeric

_ADMIN = re.compile(r"(date|time|gmt|note|camera|frames|test ?#|test$|test day|^day$|session|number|identifier|^pi$|"
                    r"flex number|^cir|year|month|sample #|data id|link|figure|description|comments|color)", re.I)


def summarize(runs) -> list[dict]:
    by_table: dict[str, list] = defaultdict(list)
    for r in runs:
        if r.row_kind in COUNTABLE_KINDS:
            by_table[r.source_file or ""].append(r)
    out = []
    for f, rs in by_table.items():
        cols: list[str] = []
        for r in rs:
            for k in r.raw:
                if k not in cols:
                    cols.append(k)
        varied, constant, admin, empty = [], [], [], []
        for c in cols:
            vals = [(r.raw.get(c) or "").strip() for r in rs]
            filled = [(v, r.source_row) for v, r in zip(vals, rs) if v]
            if not filled:
                empty.append(c)
                continue
            if _ADMIN.search(c):
                admin.append(c)
                continue
            distinct = Counter(v for v, _ in filled)
            nums = [(parse_numeric(v), v, row) for v, row in filled]
            numeric = [n for n in nums if n[0].known and n[0].kind == "point"]
            item = {"column": c, "n_filled": len(filled), "n_rows": len(rs), "n_distinct": len(distinct)}
            if numeric and len(numeric) >= 0.8 * len(filled):
                lo = min(numeric, key=lambda n: n[0].vmin)
                hi = max(numeric, key=lambda n: n[0].vmax)
                item.update({"min": lo[1], "min_row": lo[2], "max": hi[1], "max_row": hi[2], "numeric": True})
            else:
                item.update({"values": [v for v, _ in distinct.most_common(8)], "numeric": False})
            (constant if len(distinct) == 1 else varied).append(item)
        out.append({"table": f, "subtable": rs[0].subtable, "n_rows": len(rs), "varied": varied, "constant": constant,
                    "identifier_or_admin_columns": admin, "empty_columns": empty,
                    "label": "Computed from PSI experimental table cells (verbatim values)"})
    return out
