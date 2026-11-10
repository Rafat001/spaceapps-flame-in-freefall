"""Hybrid retrieval: structured SQL pre-filter + lexical (FTS5/BM25) + vector, merged with
reciprocal-rank fusion (RRF) and a small boost when an investigation acronym is named."""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.providers.embeddings import EmbeddingProvider
from app.models import Chunk, Investigation
from app.retrieval import lexical
from app.retrieval.vector import VectorIndex

RRF_K = 60


@dataclass
class Hit:
    chunk: Chunk
    score: float
    lexical_rank: int | None = None
    vector_rank: int | None = None
    vector_sim: float | None = None
    lexical_score: float | None = None
    reasons: list[str] = field(default_factory=list)


def named_investigations(session: Session, q: str) -> list[str]:
    """Investigation ids whose acronym appears as a whole token in the question."""
    out = []
    ql = q.lower()
    for inv in session.scalars(select(Investigation)).all():
        names = {inv.acronym or ""} | {p.strip() for p in (inv.acronym or "").split("/")}
        for n in names:
            n = n.strip().lower()
            if n and re.search(rf"(?<![a-z0-9-]){re.escape(n)}(?![a-z0-9-])", ql):
                out.append(inv.id)
                break
            short = n.replace("acme ", "")
            if short and short != n and re.search(rf"(?<![a-z0-9-]){re.escape(short)}(?![a-z0-9-])", ql):
                out.append(inv.id)
                break
    return out


def retrieve(session: Session, q: str, embedder: EmbeddingProvider | None, index: VectorIndex | None, k: int = 8,
             investigation_ids: list[str] | None = None) -> list[Hit]:
    lex = lexical.search(session, q, k=40, investigation_ids=investigation_ids)
    vec: list[tuple[str, float]] = []
    if embedder is not None and index is not None and index.ids and index.meta.get("signature") == embedder.signature:
        vec = index.search(embedder.embed([q])[0], k=40)
        if investigation_ids:
            allowed = set(investigation_ids)
            cmap = {c.id: c.investigation_id for c in session.scalars(select(Chunk).where(Chunk.id.in_([v[0] for v in vec])))}
            vec = [v for v in vec if cmap.get(v[0]) in allowed]
    named = set(named_investigations(session, q))
    scores: dict[str, Hit] = {}
    ids = {cid for cid, _ in lex} | {cid for cid, _ in vec}
    chunks = {c.id: c for c in session.scalars(select(Chunk).where(Chunk.id.in_(ids)))} if ids else {}
    for rank, (cid, s) in enumerate(lex):
        if cid in chunks:
            h = scores.setdefault(cid, Hit(chunks[cid], 0.0))
            h.score += 1.0 / (RRF_K + rank + 1)
            h.lexical_rank, h.lexical_score = rank + 1, s
            h.reasons.append(f"lexical rank {rank + 1}")
    for rank, (cid, s) in enumerate(vec):
        if cid in chunks:
            h = scores.setdefault(cid, Hit(chunks[cid], 0.0))
            h.score += 1.0 / (RRF_K + rank + 1)
            h.vector_rank, h.vector_sim = rank + 1, s
            h.reasons.append(f"vector rank {rank + 1} (cos {s:.2f})")
    for h in scores.values():
        if h.chunk.investigation_id in named:
            h.score += 0.02
            h.reasons.append("investigation named in question")
    hits = sorted(scores.values(), key=lambda h: (-h.score, h.chunk.id))
    return hits[:k]
