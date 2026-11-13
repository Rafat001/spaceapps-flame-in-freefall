"""LLM providers: local (Ollama, free) | openai | anthropic | xai (Grok) | none.

All providers implement ``chat(system, user) -> str``. ``health()`` never raises.
"""
from __future__ import annotations

import httpx

from app.config import Settings


class LLMUnavailable(RuntimeError):
    pass


class LLMProvider:
    name = "none"
    model = ""

    def health(self) -> dict:
        return {"ok": False, "provider": self.name, "model": self.model, "message": "No LLM configured."}

    def chat(self, system: str, user: str) -> str:
        raise LLMUnavailable("No LLM provider configured")


class NoLLM(LLMProvider):
    pass


class OllamaLLM(LLMProvider):
    name = "local"

    def __init__(self, base_url: str, model: str, timeout: float):
        self.base_url, self.model, self.timeout = base_url.rstrip("/"), model, timeout

    def health(self) -> dict:
        try:
            r = httpx.get(f"{self.base_url}/api/tags", timeout=2.0)
            r.raise_for_status()
            models = [m.get("name", "") for m in r.json().get("models", [])]
            have = any(m == self.model or m.split(":")[0] == self.model.split(":")[0] for m in models)
            if not have:
                return {"ok": False, "provider": self.name, "model": self.model, "available_models": models,
                        "message": f"Ollama is running but model '{self.model}' is not pulled. Run: ollama pull {self.model}"}
            return {"ok": True, "provider": self.name, "model": self.model, "message": "Ollama reachable."}
        except Exception as e:  # noqa: BLE001
            return {"ok": False, "provider": self.name, "model": self.model,
                    "message": (f"Ollama not reachable at {self.base_url} ({type(e).__name__}). Install from https://ollama.com, "
                                f"run `ollama serve` and `ollama pull {self.model}`, or `docker compose --profile ollama up`.")}

    def chat(self, system: str, user: str) -> str:
        try:
            r = httpx.post(f"{self.base_url}/api/chat", timeout=self.timeout, json={
                "model": self.model, "stream": False, "options": {"temperature": 0},
                "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]})
            r.raise_for_status()
            return r.json()["message"]["content"]
        except Exception as e:  # noqa: BLE001
            raise LLMUnavailable(f"Ollama call failed: {type(e).__name__}") from e


def _redact_error(name: str, e: Exception) -> LLMUnavailable:
    """Never put provider response bodies or exception text in errors: they can echo the key."""
    status = getattr(getattr(e, "response", None), "status_code", None)
    return LLMUnavailable(f"{name} call failed: {type(e).__name__}" + (f" (HTTP {status})" if status else ""))


class OpenAICompatLLM(LLMProvider):
    """OpenAI Chat Completions over plain HTTPS (also used for xAI, which is OpenAI-compatible).

    ``byok`` marks a key that came from the browser for this one request: it is held only on this
    object (created per request), never logged, never returned, and never sent anywhere but base_url."""

    name = "openai"
    env_var = "OPENAI_API_KEY"

    def __init__(self, api_key: str | None, model: str, timeout: float, base_url: str = "https://api.openai.com/v1",
                 byok: bool = False):
        self._key, self.model, self.timeout, self.base_url, self.byok = api_key, model, timeout, base_url.rstrip("/"), byok

    def __repr__(self) -> str:  # keep the key out of tracebacks / debug output
        return f"<{type(self).__name__} model={self.model!r} byok={self.byok}>"

    def health(self) -> dict:
        src = "your key (this request only)" if self.byok else self.env_var
        if not self._key:
            return {"ok": False, "provider": self.name, "model": self.model, "byok": self.byok,
                    "message": f"{self.env_var} is not set (server env), and no key was supplied in this browser tab."}
        return {"ok": True, "provider": self.name, "model": self.model, "byok": self.byok,
                "message": f"Key from {src} present (not validated until first call)."}

    def chat(self, system: str, user: str) -> str:
        if not self._key:
            raise LLMUnavailable(f"{self.env_var} missing")
        try:
            r = httpx.post(f"{self.base_url}/chat/completions", timeout=self.timeout,
                           headers={"Authorization": f"Bearer {self._key}", "Content-Type": "application/json"},
                           json={"model": self.model, "temperature": 0,
                                 "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]})
            r.raise_for_status()
            return r.json()["choices"][0]["message"]["content"] or ""
        except Exception as e:  # noqa: BLE001
            raise _redact_error(self.label, e) from None

    @property
    def label(self) -> str:
        return {"openai": "OpenAI", "xai": "xAI"}.get(self.name, self.name)


class OpenAILLM(OpenAICompatLLM):
    name = "openai"
    env_var = "OPENAI_API_KEY"


class XaiLLM(OpenAICompatLLM):
    """xAI Grok via its OpenAI-compatible API (https://api.x.ai/v1)."""

    name = "xai"
    env_var = "XAI_API_KEY"

    def __init__(self, api_key: str | None, model: str, timeout: float, base_url: str = "https://api.x.ai/v1",
                 byok: bool = False):
        super().__init__(api_key, model, timeout, base_url, byok)


class AnthropicLLM(LLMProvider):
    name = "anthropic"
    env_var = "ANTHROPIC_API_KEY"
    base_url = "https://api.anthropic.com/v1"

    def __init__(self, api_key: str | None, model: str, timeout: float, byok: bool = False):
        self._key, self.model, self.timeout, self.byok = api_key, model, timeout, byok

    def __repr__(self) -> str:
        return f"<AnthropicLLM model={self.model!r} byok={self.byok}>"

    def health(self) -> dict:
        src = "your key (this request only)" if self.byok else self.env_var
        if not self._key:
            return {"ok": False, "provider": self.name, "model": self.model, "byok": self.byok,
                    "message": f"{self.env_var} is not set (server env), and no key was supplied in this browser tab."}
        return {"ok": True, "provider": self.name, "model": self.model, "byok": self.byok,
                "message": f"Key from {src} present (not validated until first call)."}

    def chat(self, system: str, user: str) -> str:
        if not self._key:
            raise LLMUnavailable("ANTHROPIC_API_KEY missing")
        try:
            r = httpx.post(f"{self.base_url}/messages", timeout=self.timeout,
                           headers={"x-api-key": self._key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
                           json={"model": self.model, "max_tokens": 900, "temperature": 0, "system": system,
                                 "messages": [{"role": "user", "content": user}]})
            r.raise_for_status()
            return "".join(b.get("text", "") for b in r.json().get("content", []))
        except Exception as e:  # noqa: BLE001
            raise _redact_error("Anthropic", e) from None


BYOK_PROVIDERS = ("openai", "anthropic", "xai")


def build_byok_llm(cfg: Settings, provider: str, key: str, model: str | None = None) -> LLMProvider:
    """Per-request provider for a key supplied by the browser (D3). Base URLs are fixed server-side,
    so a client cannot redirect its key (or ours) to another host."""
    if provider == "openai":
        return OpenAILLM(key, model or cfg.openai_model, cfg.llm_timeout_s, byok=True)
    if provider == "anthropic":
        return AnthropicLLM(key, model or cfg.anthropic_model, cfg.llm_timeout_s, byok=True)
    if provider == "xai":
        return XaiLLM(key, model or cfg.xai_model, cfg.llm_timeout_s, cfg.xai_base_url, byok=True)
    raise ValueError("unsupported provider")


def build_llm(cfg: Settings) -> LLMProvider:
    p = cfg.ai_llm_provider
    if p == "local":
        return OllamaLLM(cfg.ollama_base_url, cfg.ollama_model, cfg.llm_timeout_s)
    if p == "openai":
        return OpenAILLM(cfg.openai_api_key, cfg.openai_model, cfg.llm_timeout_s)
    if p == "anthropic":
        return AnthropicLLM(cfg.anthropic_api_key, cfg.anthropic_model, cfg.llm_timeout_s)
    if p == "xai":
        return XaiLLM(cfg.xai_api_key, cfg.xai_model, cfg.llm_timeout_s, cfg.xai_base_url)
    return NoLLM()
