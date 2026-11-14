from __future__ import annotations

from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(str(REPO_ROOT / ".env"), ".env"), extra="ignore")

    data_dir: Path = REPO_ROOT / "data"
    database_url: str | None = None  # default sqlite under data/db
    index_path: Path | None = None  # default data/index

    # --- AI provider switch (first-class, see README) ---
    ai_llm_provider: Literal["local", "openai", "anthropic", "groq", "gemini", "none"] = "local"
    ai_embedding_provider: Literal["local", "openai", "hash"] = "local"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2"
    local_embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"
    openai_embedding_model: str = "text-embedding-3-small"
    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-3-5-haiku-latest"
    groq_api_key: str | None = None
    groq_model: str = "openai/gpt-oss-120b"  # must be in GROQ_FREE_MODELS (app/ai/providers/llm.py)
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-3.8-flash"  # must be in GEMINI_FREE_MODELS (app/ai/providers/llm.py)
    llm_timeout_s: float = 60.0

    # --- admin lock (D3): settings PUT and /api/ingest/rebuild ---
    admin_token: str | None = None
    app_env: Literal["development", "production"] = "development"
    render: str | None = None  # Render sets RENDER=true; treated as production

    # --- per-IP limits on server-key AI summaries (Assistant, Explorer search, investigation overview) ---
    ask_rate_per_min: int = 20
    ask_rate_per_day: int = 300
    # Whole-deployment caps. Groq Developer plan (org headers 2026-11-14): 250K tokens/min, 500K requests/day.
    # A call uses ~1.7-3.4K tokens (measured), so 60/min stays under 250K TPM. The daily cap is a spend cap:
    # worst case per call <= 4K input + 3K output (max_completion_tokens) = 4000*$0.15/1M + 3000*$0.60/1M = $0.0024,
    # so 1200/day costs at most ~$2.88/day (typically ~$0.0007-0.0011 per call, about $1/day at the cap).
    ask_global_per_min: int = 60
    ask_global_per_day: int = 1200

    vector_backend: Literal["faiss", "numpy"] = "faiss"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    max_question_chars: int = 1000

    @property
    def db_url(self) -> str:
        return self.database_url or f"sqlite:///{self.data_dir / 'db' / 'flame.sqlite'}"

    @property
    def is_production(self) -> bool:
        return self.app_env == "production" or bool(self.render)

    @property
    def index_dir(self) -> Path:
        return self.index_path or (self.data_dir / "index")


settings = Settings()
