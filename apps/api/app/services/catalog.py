"""Catalog search & filters. Unknown values never pass a numeric filter."""
from __future__ import annotations

import re
from dataclasses import dataclass

from sqlalchemy import and_, or_, select

from app.ingest.table_specs import COUNTABLE_KINDS
from sqlalchemy.orm import Session, selectinload

from app.models import Investigation, TestRun
from app.retrieval import lexical

EXACT_MATCH = 1e9


def _norm(t: str) -> str:
    return re.sub(r"[^a-z0-9]", "", t.lower())


@dataclass
class NumericRange:
    lo: float | None = None
    hi: float | None = None

    @property
    def active(self) -> bool:
        return self.lo is not None or self.hi is not None


def run_condition_clause(col_min, col_max, rng: NumericRange):
    """Known-only overlap test: run range [min,max] must overlap the requested [lo,hi]. NULL never matches."""
    parts = [col_min.is_not(None), col_max.is_not(None)]
    if rng.lo is not None:
        parts.append(col_max >= rng.lo)
    if rng.hi is not None:
        parts.append(col_min <= rng.hi)
    return and_(*parts)


def investigations_with_runs(session: Session, oxygen: NumericRange, pressure: NumericRange, airflow: NumericRange,
                             material: str | None = None, same_run: bool = True) -> set[str] | None:
    """Return investigation ids having runs satisfying the numeric filters (None if no numeric filter active).
    same_run=True requires all conditions on the same test run (PRD: conditions belong to test runs)."""
    clauses = []
    if oxygen.active:
        clauses.append(run_condition_clause(TestRun.oxygen_pct_min, TestRun.oxygen_pct_max, oxygen))
    if pressure.active:
        clauses.append(run_condition_clause(TestRun.pressure_kpa_min, TestRun.pressure_kpa_max, pressure))
    if airflow.active:
        clauses.append(run_condition_clause(TestRun.airflow_m_s_min, TestRun.airflow_m_s_max, airflow))
    if material:
        clauses.append(or_(TestRun.material.ilike(f"%{material}%"), TestRun.material_normalized.ilike(f"%{material}%")))
    if not clauses:
        return None
    clauses.append(TestRun.row_kind.in_(COUNTABLE_KINDS))
    if same_run:
        return set(session.scalars(select(TestRun.investigation_id).where(and_(*clauses)).distinct()))
    ids: set[str] | None = None
    for c in clauses:
        s = set(session.scalars(select(TestRun.investigation_id).where(c).distinct()))
        ids = s if ids is None else ids & s
    return ids or set()


def search(session: Session, *, q: str | None = None, family: str | None = None, fuel_class: str | None = None,
           hardware: str | None = None, gravity_regime: str | None = None, topic: str | None = None,
           measurement_type: str | None = None, material: str | None = None, platform: str | None = None,
           lens: str | None = None,
           oxygen: NumericRange = NumericRange(), pressure: NumericRange = NumericRange(),
           airflow: NumericRange = NumericRange()) -> tuple[list[Investigation], dict[str, float]]:
    stmt = select(Investigation).options(selectinload(Investigation.test_runs), selectinload(Investigation.documents))
    if family:
        stmt = stmt.where(Investigation.family == family)
    if fuel_class:
        stmt = stmt.where(Investigation.fuel_class == fuel_class)
    if hardware:
        stmt = stmt.where(Investigation.hardware.ilike(f"%{hardware}%"))
    if gravity_regime:
        stmt = stmt.where(Investigation.gravity_regime == gravity_regime)
    if platform:
        stmt = stmt.where(Investigation.platform == platform)
    invs = list(session.scalars(stmt).all())
    if lens:
        invs = [i for i in invs if lens in (i.lenses or {})]
    if topic:
        invs = [i for i in invs if topic in (i.topics or {})]
    if measurement_type:
        invs = [i for i in invs if any(measurement_type.lower() in k.lower() for k in (i.measurement_types or {}))]
    allowed = investigations_with_runs(session, oxygen, pressure, airflow, material)
    if allowed is not None:
        invs = [i for i in invs if i.id in allowed]
    text_scores: dict[str, float] = {}
    if q and q.strip():
        ql = q.strip().lower()
        # A PSI accession ("PSI 10", "psi-10", "PSI10") is an exact lookup, not a keyword search.
        acc = re.fullmatch(r"psi[\s\-_#]*0*(\d+)", ql)
        if acc:
            want = f"PSI-{int(acc.group(1))}"
            invs = [i for i in invs if i.accession.upper() == want]
            return invs, {i.id: EXACT_MATCH for i in invs}
        norm = _norm(ql)
        hits = lexical.search(session, q, k=400)
        from app.models import Chunk
        cmap = dict(session.execute(select(Chunk.id, Chunk.investigation_id).where(Chunk.id.in_([c for c, _ in hits]))).all())
        for cid, s in hits:
            iid = cmap.get(cid)
            if iid:
                text_scores[iid] = text_scores.get(iid, 0.0) + max(s, 0.0)
        for i in invs:
            if norm and norm in (_norm(i.acronym or ""), _norm(i.id)):
                text_scores[i.id] = EXACT_MATCH  # exact acronym ("FLEX-2", "acme cfi-g") always comes first
            elif ql in (i.acronym or "").lower() or ql in i.title.lower():
                text_scores[i.id] = text_scores.get(i.id, 0.0) + 100.0
        invs = [i for i in invs if i.id in text_scores]
        invs.sort(key=lambda i: (-text_scores[i.id], i.accession))
    return invs, text_scores
