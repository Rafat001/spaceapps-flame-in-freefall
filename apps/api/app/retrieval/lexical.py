"""Lexical retrieval with SQLite FTS5 (BM25)."""
from __future__ import annotations

import re

from sqlalchemy import text
from sqlalchemy.orm import Session

FTS_DDL = ("CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5("
           "chunk_id UNINDEXED, investigation_id UNINDEXED, text, section, tokenize='porter unicode61')")

STOPWORDS = set("""a an and are as at be by can do does did for from has have how i in is it its of on or that the this to
was were what when where which who why will with about tell me us show any all there their they them than then into
under over using use used our your you""".split())


def query_terms(q: str) -> list[str]:
    toks = re.findall(r"[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*", q)
    return [t for t in toks if t.lower() not in STOPWORDS and len(t) > 1]


def rebuild(session: Session) -> None:
    session.execute(text("DROP TABLE IF EXISTS chunks_fts"))
    session.execute(text(FTS_DDL))
    session.execute(text("INSERT INTO chunks_fts(chunk_id, investigation_id, text, section) "
                         "SELECT id, coalesce(investigation_id,''), text, coalesce(section,'') FROM chunks"))
    session.commit()


def search(session: Session, q: str, k: int = 20, investigation_ids: list[str] | None = None) -> list[tuple[str, float]]:
    terms = query_terms(q)
    if not terms:
        return []
    # quote each term so user input cannot inject FTS syntax; OR them for recall
    match = " OR ".join('"' + t.replace('"', "") + '"' for t in terms)
    sql = "SELECT chunk_id, bm25(chunks_fts) AS s FROM chunks_fts WHERE chunks_fts MATCH :m"
    params: dict = {"m": match, "k": k}
    if investigation_ids:
        keys = [f":i{n}" for n in range(len(investigation_ids))]
        sql += f" AND investigation_id IN ({','.join(keys)})"
        params.update({f"i{n}": v for n, v in enumerate(investigation_ids)})
    sql += " ORDER BY s LIMIT :k"
    rows = session.execute(text(sql), params).fetchall()
    return [(r[0], -float(r[1])) for r in rows]  # higher = better
