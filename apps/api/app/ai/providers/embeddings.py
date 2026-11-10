"""Embedding providers: local (sentence-transformers, free) | openai | hash (offline fallback).

The 'hash' provider is a deterministic feature-hashing embedder with no model download. It
keeps hybrid retrieval working on machines without sentence-transformers; quality is lower
than a real model and the health endpoint says so.
"""
from __future__ import annotations

import hashlib
import re
from functools import lru_cache

import numpy as np

from app.config import Settings


class EmbeddingProvider:
    name = "base"
    model = ""
    dim = 0

    def embed(self, texts: list[str]) -> np.ndarray:  # pragma: no cover - interface
        raise NotImplementedError

    @property
    def signature(self) -> str:
        return f"{self.name}:{self.model}:{self.dim}"


class HashEmbeddings(EmbeddingProvider):
    name = "hash"
    model = "feature-hash-v1"

    def __init__(self, dim: int = 512):
        self.dim = dim

    def embed(self, texts: list[str]) -> np.ndarray:
        out = np.zeros((len(texts), self.dim), dtype="float32")
        for i, t in enumerate(texts):
            toks = re.findall(r"[a-z0-9]+(?:-[a-z0-9]+)?", t.lower())
            feats = toks + [a + "_" + b for a, b in zip(toks, toks[1:])]
            for f in feats:
                h = int(hashlib.md5(f.encode()).hexdigest(), 16)
                out[i, h % self.dim] += 1.0 if (h >> 64) & 1 else -1.0
        norms = np.linalg.norm(out, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        return out / norms


class LocalSentenceTransformer(EmbeddingProvider):
    name = "local"

    def __init__(self, model: str):
        from sentence_transformers import SentenceTransformer  # optional dependency

        self.model = model
        self._m = SentenceTransformer(model)
        getdim = getattr(self._m, "get_embedding_dimension", None) or self._m.get_sentence_embedding_dimension
        self.dim = int(getdim())

    def embed(self, texts: list[str]) -> np.ndarray:
        v = self._m.encode(texts, batch_size=32, normalize_embeddings=True, show_progress_bar=False)
        return np.asarray(v, dtype="float32")


class OpenAIEmbeddings(EmbeddingProvider):
    name = "openai"

    def __init__(self, api_key: str, model: str):
        from openai import OpenAI

        self.model = model
        self._c = OpenAI(api_key=api_key)
        self.dim = 1536 if "small" in model or "ada" in model else 3072

    def embed(self, texts: list[str]) -> np.ndarray:
        out = []
        for i in range(0, len(texts), 96):
            r = self._c.embeddings.create(model=self.model, input=texts[i:i + 96])
            out.extend(d.embedding for d in r.data)
        v = np.asarray(out, dtype="float32")
        self.dim = v.shape[1]
        v /= np.maximum(np.linalg.norm(v, axis=1, keepdims=True), 1e-12)
        return v


_status: dict = {}


def build_embedder(cfg: Settings) -> tuple[EmbeddingProvider, dict]:
    """Return (provider, status). Never raises: falls back to hash with an explanatory note."""
    want = cfg.ai_embedding_provider
    note = None
    if want == "openai":
        if cfg.openai_api_key:
            try:
                p = OpenAIEmbeddings(cfg.openai_api_key, cfg.openai_embedding_model)
                return p, {"requested": want, "active": p.name, "model": p.model, "ok": True}
            except Exception as e:  # noqa: BLE001
                note = f"OpenAI embeddings unavailable ({type(e).__name__}); using offline hash embeddings."
        else:
            note = "AI_EMBEDDING_PROVIDER=openai but OPENAI_API_KEY is not set; using offline hash embeddings."
    elif want == "local":
        try:
            p = LocalSentenceTransformer(cfg.local_embedding_model)
            return p, {"requested": want, "active": p.name, "model": p.model, "ok": True}
        except Exception as e:  # noqa: BLE001
            note = (f"Local sentence-transformers model '{cfg.local_embedding_model}' unavailable ({type(e).__name__}). "
                    "Install with `pip install -r requirements-local-ai.txt` (needs one-time model download). "
                    "Using offline hash embeddings meanwhile.")
    p = HashEmbeddings()
    return p, {"requested": want, "active": p.name, "model": p.model, "ok": want == "hash", "note": note}


@lru_cache(maxsize=4)
def _cached(provider: str, model: str, key_set: bool):  # noqa: ARG001 - cache key
    from app.config import settings

    return build_embedder(settings)


def get_embedder(cfg: Settings) -> tuple[EmbeddingProvider, dict]:
    model = cfg.openai_embedding_model if cfg.ai_embedding_provider == "openai" else cfg.local_embedding_model
    return _cached(cfg.ai_embedding_provider, model, bool(cfg.openai_api_key))
