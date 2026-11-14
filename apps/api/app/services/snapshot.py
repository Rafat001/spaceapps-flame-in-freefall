"""In-process, read-only snapshot of the catalog.

The catalog only changes when the seed is (re)loaded (`python -m app.ingest` at boot, or the admin
`POST /api/ingest/rebuild`). Before this module every Explorer search, ranking and assistant question re-read all
24 investigations with their ~2,000 experimental-table rows from SQLite and rebuilt the same ORM objects (three
times per Explorer search). On Render's free instance (a fraction of one CPU) that object loading was most of the
~1.8 s an Explorer search took. Now the investigations are loaded once per process, detached from the session with
every relationship the read paths use already loaded, and derived values (cards, scenario rankings, /api/meta) are
memoised. `clear()` is called by the loader and by `state.reset()`, so a rebuild is picked up immediately.

The objects are shared across requests: treat them as read-only.
"""
from __future__ import annotations

import threading
from typing import Any, Callable

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Investigation, TestRun

_lock = threading.RLock()
_invs: dict[str, Investigation] | None = None
_memo: dict[Any, Any] = {}


def clear() -> None:
    """Drop the snapshot and every memoised value (after an ingest or a settings reset)."""
    global _invs
    with _lock:
        _invs = None
        _memo.clear()
    from app.services import answer_cache

    answer_cache.clear()  # cached AI answers quote the old catalog


def investigations(session: Session) -> dict[str, Investigation]:
    """All investigations by id, in the same (table) order a plain SELECT returns, with test_runs (+ measurements) and documents loaded."""
    global _invs
    got = _invs
    if got is not None:
        return got
    with _lock:
        if _invs is None:
            with Session(bind=session.get_bind(), expire_on_commit=False) as s:
                rows = s.scalars(select(Investigation).options(
                    selectinload(Investigation.test_runs).selectinload(TestRun.measurements),
                    selectinload(Investigation.documents))).all()
                s.expunge_all()
            _invs = {i.id: i for i in rows}
        return _invs


def memo(key: Any, build: Callable[[], Any]) -> Any:
    """A value derived only from the catalog snapshot, computed once until clear()."""
    if key in _memo:
        return _memo[key]
    with _lock:
        if key not in _memo:
            _memo[key] = build()
        return _memo[key]
