"""On-disk vector index under data/index/ (FAISS if installed, else NumPy brute force)."""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np


class VectorIndex:
    def __init__(self, directory: Path):
        self.dir = directory
        self.ids: list[str] = []
        self.meta: dict = {}
        self._mat: np.ndarray | None = None
        self._faiss = None

    # ---- build / persist ----
    def build(self, ids: list[str], vectors: np.ndarray, signature: str, backend: str = "faiss") -> str:
        self.dir.mkdir(parents=True, exist_ok=True)
        vectors = np.asarray(vectors, dtype="float32")
        used = "numpy"
        if backend == "faiss":
            try:
                import faiss

                idx = faiss.IndexFlatIP(vectors.shape[1])
                idx.add(vectors)
                faiss.write_index(idx, str(self.dir / "chunks.faiss"))
                used = "faiss"
            except Exception:  # noqa: BLE001
                used = "numpy"
        np.save(self.dir / "chunks.npy", vectors)
        self.meta = {"signature": signature, "backend": used, "count": len(ids), "dim": int(vectors.shape[1])}
        (self.dir / "chunk_ids.json").write_text(json.dumps(ids))
        (self.dir / "meta.json").write_text(json.dumps(self.meta, indent=1))
        self.ids, self._mat = ids, vectors
        return used

    def load(self) -> bool:
        mp = self.dir / "meta.json"
        if not mp.exists():
            return False
        self.meta = json.loads(mp.read_text())
        self.ids = json.loads((self.dir / "chunk_ids.json").read_text())
        if self.meta.get("backend") == "faiss":
            try:
                import faiss

                self._faiss = faiss.read_index(str(self.dir / "chunks.faiss"))
            except Exception:  # noqa: BLE001
                self._faiss = None
        if self._faiss is None:
            self._mat = np.load(self.dir / "chunks.npy")
        return True

    # ---- query ----
    def search(self, qvec: np.ndarray, k: int = 20) -> list[tuple[str, float]]:
        q = np.asarray(qvec, dtype="float32").reshape(1, -1)
        if self._faiss is not None:
            scores, idx = self._faiss.search(q, min(k, len(self.ids)))
            return [(self.ids[i], float(s)) for i, s in zip(idx[0], scores[0]) if i >= 0]
        if self._mat is None or not len(self.ids):
            return []
        sims = self._mat @ q[0]
        order = np.argsort(-sims)[:k]
        return [(self.ids[i], float(sims[i])) for i in order]
