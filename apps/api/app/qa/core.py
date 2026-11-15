"""Shared helpers: entity resolution, table access, citations and number formatting."""
from __future__ import annotations

import re
import unicodedata
from collections import Counter
from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.ingest.table_specs import COUNTABLE_KINDS, SPECS
from app.models import Chunk, Investigation, TestRun

NUMBER_WORDS = {0: "zero", 1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven", 8: "eight",
                9: "nine", 10: "ten", 11: "eleven", 12: "twelve"}

# Ordered: more specific names first. Case-sensitive patterns are marked with (?-i) semantics via flag below.
ENTITIES: list[tuple[str, str, int]] = [
    ("psi-68", r"\bFLEX[- ]?2\b", re.I),
    ("psi-69", r"\bFLEX\b(?![- ]?2)", re.I),
    ("psi-159", r"\bCFI[- ]?G\b", re.I),
    ("psi-39", r"\bCFI\b(?![- ]?G)|Cool Flames Investigation", re.I),
    ("psi-10", r"Flame Design", re.I),
    ("psi-23", r"\bs-Flame\b", re.I),
    ("psi-21", r"\bCLD\b", re.I),
    ("psi-22", r"E-FIELD", re.I),
    ("psi-20", r"\bBRE\b", 0),
    ("psi-25", r"\bBASS[- ]?(II|2)\b", re.I),
    ("psi-26", r"\bBASS\b(?![- ]?(II|2)\b)", re.I),
    ("psi-100", r"\bSaffire[- ]?(III|3)\b", re.I),
    ("psi-99", r"\bSaffire[- ]?(II|2)\b", re.I),
    ("psi-98", r"\bSaffire[- ]?(I|1)\b", re.I),
    ("psi-101", r"\bSAME[- ]?R\b", 0),
    ("psi-102", r"\bSAME\b(?![- ]?R\b)", 0),
    ("psi-47", r"\bDAFT\b", re.I),
    ("psi-107", r"\bSPICE\b", re.I),
    ("psi-106", r"\bSLICE\b", re.I),
]


def entities(q: str) -> list[str]:
    found, taken = [], []
    for iid, pat, fl in ENTITIES:
        for m in re.finditer(pat, q, flags=fl):
            if any(a <= m.start() < b for a, b in taken):
                continue
            taken.append((m.start(), m.end()))
            if iid not in found:
                found.append(iid)
    for m in re.finditer(r"\bPSI[- ]?(\d{1,3})\b", q, flags=re.I):
        iid = f"psi-{m.group(1)}"
        if iid not in found:
            found.append(iid)
    return found


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", s or "")).strip().lower()


def fmt_num(x: float) -> str:
    return f"{x:g}"


def num(s: str | None) -> float | None:
    m = re.fullmatch(r"\s*~?\s*([-+]?\d*\.?\d+)\s*(%|mm|cm|cm/s|mm/s|atm|bar|s|mg/s|mmhg)?\s*", s or "", flags=re.I)
    return float(m.group(1)) if m else None


def records_text(rows: list[int]) -> str:
    rows = sorted(set(rows))
    if not rows:
        return ""
    parts, start, prev = [], rows[0], rows[0]
    for r in rows[1:] + [None]:
        if r is not None and r == prev + 1:
            prev = r
            continue
        parts.append(f"{start}" if start == prev else f"{start}-{prev}")
        if r is not None:
            start = prev = r
    return ("CSV record " if len(rows) == 1 else "CSV records ") + ", ".join(parts)


@dataclass
class Result:
    answer: str
    citations: list[dict] = field(default_factory=list)
    computation: list[str] = field(default_factory=list)
    flags: list[dict] = field(default_factory=list)
    kind: str = "direct"  # direct | abstain | coverage | comparison
    intent: str = ""
    interpretation: list[str] = field(default_factory=list)

    def add(self, other: "Result") -> "Result":
        self.citations += other.citations
        self.computation += other.computation
        self.flags += other.flags
        return self


class Ctx:
    def __init__(self, session: Session):
        self.s = session
        from app.services import snapshot

        self._invs = snapshot.investigations(session)  # cached read-only catalog (was re-loaded on every question)

    def inv(self, iid: str) -> Investigation:
        return self._invs[iid]

    @property
    def invs(self) -> list[Investigation]:
        return list(self._invs.values())

    def runs(self, iid: str, sub: str | None = None, all_kinds: bool = False) -> list[TestRun]:
        return [r for r in self.inv(iid).test_runs
                if (all_kinds or r.row_kind in COUNTABLE_KINDS) and (sub is None or r.subtable == sub)]

    # --- citations --------------------------------------------------------------------------------
    def row_cite(self, iid: str, rows: list[TestRun] | list[int], column: str | None = None, note: str | None = None) -> dict:
        inv = self.inv(iid)
        rr = [r.source_row if isinstance(r, TestRun) else r for r in rows]
        files = sorted({r.source_file for r in rows if isinstance(r, TestRun) and r.source_file}) or \
            sorted({r.source_file for r in inv.test_runs if r.source_file})
        return {"source_type": "psi_experimental_table", "accession": inv.accession, "investigation_id": inv.id,
                "acronym": inv.acronym, "file": "; ".join(files), "rows": sorted(set(rr)), "locator": records_text(rr),
                "column": column, "note": note, "url": inv.source_url, "label": "PSI experimental table",
                "provenance": inv.provenance}

    def field_cite(self, iid: str, field_name: str, quote: str | None = None) -> dict:
        inv = self.inv(iid)
        if quote is not None:
            src = getattr(inv, {"flight_platform": "flight_platform", "experimentHardware": "hardware"}.get(field_name, field_name), None)
            if norm(quote) not in norm(re.sub(r"<[^>]+>", " ", str(src or ""))):
                raise LookupError(f"quote not in {iid}.{field_name}: {quote[:60]}")
        return {"source_type": "psi_metadata", "accession": inv.accession, "investigation_id": inv.id,
                "acronym": inv.acronym, "locator": f"PSI record field '{field_name}'", "field": field_name, "quote": quote,
                "url": inv.source_url, "label": "PSI record", "provenance": inv.provenance}

    def find_chunk(self, source: str, quote: str) -> Chunk | None:
        """The indexed chunk of the given source (document id prefix, source_type, or 'brief') containing the quote."""
        qn = norm(quote)
        stmt = select(Chunk)
        if source == "brief":
            stmt = stmt.where(Chunk.source_type == "challenge_brief")
        elif source == "transcript":
            stmt = stmt.where(Chunk.source_type == "guidance_video")
        else:
            stmt = stmt.where(Chunk.document_id.like(f"{source}%"))
        for c in self.s.scalars(stmt):
            if qn in norm(c.text):
                return c
        return None

    def quote_cite(self, source: str, quote: str) -> dict:
        c = self.find_chunk(source, quote)
        if c is None:
            raise LookupError(f"quote not found in {source}: {quote[:60]}")
        if c.source_type == "guidance_video":
            ts = transcript_timestamp(quote)
            if ts:
                mm, ss = ts.split(":")
                url = re.sub(r"[&?]t=\d+s?", "", c.source_url)
                return self._qc(c, f"[{ts}]", url + ("&" if "?" in url else "?") + f"t={int(mm) * 60 + int(ss)}s", quote)
        return self._qc(c, c.locator, c.source_url, quote)

    @staticmethod
    def _qc(c: Chunk, loc: str, url: str, quote: str) -> dict:
        labels = {"challenge_brief": "Official challenge brief", "guidance_video": "Challenge guidance video (auto-captions)",
                  "nasa_fact_sheet": "NASA fact sheet", "nasa_guide": "NASA Researcher's Guide",
                  "nasa_history": "NASA history page", "nasa_spinoff": "NASA Spinoff", "nasa_program_page": "NASA program page",
                  "psi_analyzed_data": "PSI analyzed data file"}
        return {"source_type": c.source_type, "document_id": c.document_id, "section": c.section, "locator": loc,
                "page": c.page, "url": url, "quote": quote, "label": labels.get(c.source_type, c.source_type),
                "provenance": c.provenance, "chunk_id": c.id}


def transcript_timestamp(quote: str) -> str | None:
    from app.config import settings

    qn = norm(quote)
    for line in (settings.data_dir / "sources" / "official" / "video" / "transcript.txt").read_text().splitlines():
        m = re.match(r"^\[(\d\d:\d\d)\]\s*(.*)$", line)
        if m and qn in norm(m.group(2)):
            return m.group(1)
    return None


def col(r: TestRun, name: str) -> str:
    raw = r.raw or {}
    if name in raw:
        return (raw[name] or "").strip()
    n = norm(name)
    for k, v in raw.items():
        if norm(k) == n:
            return (v or "").strip()
    return ""


def counts(runs: list[TestRun], name: str, keep_blank: bool = False) -> Counter:
    c: Counter = Counter()
    for r in runs:
        v = col(r, name)
        if v or keep_blank:
            c[v or "(blank)"] += 1
    return c


def ordered_distinct(runs: list[TestRun], name: str) -> list[str]:
    out: list[str] = []
    for r in runs:
        v = col(r, name)
        if v and v not in out:
            out.append(v)
    return out


def numeric(runs: list[TestRun], name: str) -> list[tuple[float, TestRun]]:
    out = []
    for r in runs:
        x = num(col(r, name))
        if x is not None:
            out.append((x, r))
    return out


def spec_for(iid: str, sub: str | None = None) -> dict:
    for s in SPECS.get(iid.upper(), []):
        if sub is None or s.get("subtable") == sub:
            return s
    return {}


def row_flags(runs: list[TestRun], columns: list[str] | None = None) -> list[dict]:
    out = []
    for r in runs:
        for f in r.flags or []:
            if columns is None or f.get("column") is None or any(norm(c) == norm(f.get("column") or "") for c in columns):
                out.append({"row": r.source_row, "run_label": r.run_label, "investigation_id": r.investigation_id, **f})
    return out
