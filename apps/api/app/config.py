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
    ai_llm_provider: Literal["local", "openai", "anthropic", "xai", "none"] = "local"
    ai_embedding_provider: Literal["local", "openai", "hash"] = "local"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2"
    local_embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"
    openai_embedding_model: str = "text-embedding-3-small"
    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-3-5-haiku-latest"
    xai_api_key: str | None = None
    xai_model: str = "grok-4.7"  # docs.x.ai/docs/models recommended model, checked 2026-11-13
    xai_base_url: str = "https://api.x.ai/v1"
    llm_timeout_s: float = 60.0

    # --- admin lock (D3): settings PUT and /api/ingest/rebuild ---
    admin_token: str | None = None
    app_env: Literal["development", "production"] = "development"
    render: str | None = None  # Render sets RENDER=true; treated as production

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
