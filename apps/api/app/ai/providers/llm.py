"""LLM providers: local (Ollama, free) | openai | anthropic | none.

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


class OpenAILLM(LLMProvider):
    name = "openai"

    def __init__(self, api_key: str | None, model: str, timeout: float):
        self.api_key, self.model, self.timeout = api_key, model, timeout

    def health(self) -> dict:
        if not self.api_key:
            return {"ok": False, "provider": self.name, "model": self.model, "message": "OPENAI_API_KEY is not set (.env)."}
        return {"ok": True, "provider": self.name, "model": self.model, "message": "API key present (not validated until first call)."}

    def chat(self, system: str, user: str) -> str:
        if not self.api_key:
            raise LLMUnavailable("OPENAI_API_KEY missing")
        try:
            from openai import OpenAI

            c = OpenAI(api_key=self.api_key, timeout=self.timeout)
            r = c.chat.completions.create(model=self.model, temperature=0, messages=[
                {"role": "system", "content": system}, {"role": "user", "content": user}])
            return r.choices[0].message.content or ""
        except Exception as e:  # noqa: BLE001
            raise LLMUnavailable(f"OpenAI call failed: {type(e).__name__}") from e


class AnthropicLLM(LLMProvider):
    name = "anthropic"

    def __init__(self, api_key: str | None, model: str, timeout: float):
        self.api_key, self.model, self.timeout = api_key, model, timeout

    def health(self) -> dict:
        if not self.api_key:
            return {"ok": False, "provider": self.name, "model": self.model, "message": "ANTHROPIC_API_KEY is not set (.env)."}
        return {"ok": True, "provider": self.name, "model": self.model, "message": "API key present (not validated until first call)."}

    def chat(self, system: str, user: str) -> str:
        if not self.api_key:
            raise LLMUnavailable("ANTHROPIC_API_KEY missing")
        try:
            import anthropic

            c = anthropic.Anthropic(api_key=self.api_key, timeout=self.timeout)
            r = c.messages.create(model=self.model, max_tokens=900, temperature=0, system=system,
                                  messages=[{"role": "user", "content": user}])
            return "".join(getattr(b, "text", "") for b in r.content)
        except Exception as e:  # noqa: BLE001
            raise LLMUnavailable(f"Anthropic call failed: {type(e).__name__}") from e


def build_llm(cfg: Settings) -> LLMProvider:
    p = cfg.ai_llm_provider
    if p == "local":
        return OllamaLLM(cfg.ollama_base_url, cfg.ollama_model, cfg.llm_timeout_s)
    if p == "openai":
        return OpenAILLM(cfg.openai_api_key, cfg.openai_model, cfg.llm_timeout_s)
    if p == "anthropic":
        return AnthropicLLM(cfg.anthropic_api_key, cfg.anthropic_model, cfg.llm_timeout_s)
    return NoLLM()
