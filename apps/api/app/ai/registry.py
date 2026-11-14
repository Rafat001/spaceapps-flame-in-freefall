"""Runtime AI state: one place to switch providers (env defaults, overridable via /api/settings/ai)."""
from __future__ import annotations

import threading

from app.ai.providers.embeddings import EmbeddingProvider, get_embedder
from app.ai.providers.llm import BYOK_PROVIDERS, LAST_LIMITS, GEMINI_DOCS, GEMINI_FREE_MODELS, GROQ_FREE_MODELS, LLMProvider, build_llm
from app.config import Settings, settings
from app.retrieval.vector import VectorIndex

_lock = threading.Lock()


class AIState:
    def __init__(self, cfg: Settings):
        self.cfg = cfg
        self._llm: LLMProvider | None = None
        self._emb: tuple[EmbeddingProvider, dict] | None = None
        self._index: VectorIndex | None = None

    @property
    def llm(self) -> LLMProvider:
        if self._llm is None:
            self._llm = build_llm(self.cfg)
        return self._llm

    @property
    def embedder(self) -> tuple[EmbeddingProvider, dict]:
        if self._emb is None:
            self._emb = get_embedder(self.cfg)
        return self._emb

    @property
    def index(self) -> VectorIndex:
        if self._index is None:
            idx = VectorIndex(self.cfg.index_dir)
            idx.load()
            self._index = idx
        return self._index

    def reset(self, **overrides) -> None:
        with _lock:
            self.cfg = self.cfg.model_copy(update={k: v for k, v in overrides.items() if v is not None})
            self._llm, self._emb, self._index = None, None, None
        from app.services import snapshot

        snapshot.clear()

    def status(self) -> dict:
        emb, emb_status = self.embedder
        idx = self.index
        sig_ok = idx.meta.get("signature") == emb.signature
        return {
            "llm": {"configured_provider": self.cfg.ai_llm_provider, **self.llm.health(),
                    "options": ["local", "groq", "gemini", "openai", "anthropic", "none"],
                    "byok_providers": list(BYOK_PROVIDERS), "recommended_free": "groq",
                    "groq_free_models": GROQ_FREE_MODELS, "groq_docs": "https://console.groq.com/docs/rate-limits",
                    "gemini_free_models": GEMINI_FREE_MODELS, "gemini_docs": GEMINI_DOCS},
            "embeddings": {**emb_status, "signature": emb.signature, "options": ["local", "openai", "hash"]},
            "vector_index": {**idx.meta, "matches_active_embedder": sig_ok,
                             "message": None if sig_ok else "Vector index was built with a different embedder; "
                             "vector search is disabled until you re-run `make ingest` (lexical + SQL still work)."},
            "keys_present": {"openai": bool(self.cfg.openai_api_key), "anthropic": bool(self.cfg.anthropic_api_key),
                             "groq": bool(self.cfg.groq_api_key), "gemini": bool(self.cfg.gemini_api_key)},
            "admin": {"locked": True, "enabled": bool(self.cfg.admin_token) or not self.cfg.is_production,
                      "message": ("Settings changes and index rebuilds need the admin token." if self.cfg.admin_token else
                                  "Disabled in production (ADMIN_TOKEN is not set)." if self.cfg.is_production else
                                  "Development mode: no admin token set, changes allowed locally.")},
            "models": {"ollama": self.cfg.ollama_model, "openai": self.cfg.openai_model, "anthropic": self.cfg.anthropic_model,
                       "groq": self.cfg.groq_model, "gemini": self.cfg.gemini_model,
                       "local_embedding": self.cfg.local_embedding_model, "openai_embedding": self.cfg.openai_embedding_model},
            "ollama_base_url": self.cfg.ollama_base_url,
            "ask_limits": {"per_ip_per_min": self.cfg.ask_rate_per_min, "per_ip_per_day": self.cfg.ask_rate_per_day,
                           "global_per_min": self.cfg.ask_global_per_min, "global_per_day": self.cfg.ask_global_per_day,
                           "applies_to": "AI summaries that use the server key (your own key is not limited here)",
                           "failed_calls_counted": False},
            "provider_limits_observed": {p: dict(v) for p, v in LAST_LIMITS.items()},
        }


state = AIState(settings)
