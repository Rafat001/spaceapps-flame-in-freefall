"""LLM providers: local (Ollama, free) | groq (Developer plan) | gemini (free tier) | openai | anthropic | none.

All providers implement ``chat(system, user) -> str``. ``health()`` never raises.
"""
from __future__ import annotations

import logging

import httpx

from app.config import Settings

log = logging.getLogger("flame.ai")


class LLMUnavailable(RuntimeError):
    pass


class LLMRateLimited(LLMUnavailable):
    """The provider answered 429 (rate limit). Carries only the provider name and retry-after seconds."""

    def __init__(self, provider: str, retry_after: str | None = None):
        self.provider, self.retry_after = provider, retry_after
        super().__init__(f"{provider} rate limit reached (HTTP 429)" + (f"; retry after {retry_after}s" if retry_after else ""))


class LLMQuotaExceeded(LLMUnavailable):
    """This site's own limit on the shared server key was reached (no provider call was made)."""

    def __init__(self, notice: str):
        self.notice = notice
        super().__init__("site AI quota reached")


class LLMPaymentRequired(LLMUnavailable):
    """The provider answered 402 (payment required / no prepaid credits). Do not retry until billing is fixed."""

    def __init__(self, provider: str):
        self.provider = provider
        super().__init__(f"{provider} payment required (HTTP 402)")


class LLMAuthFailed(LLMUnavailable):
    """The provider rejected the API key (HTTP 401/403, or 400 naming the key). Never carries the key or body."""

    def __init__(self, provider: str):
        self.provider = provider
        super().__init__(f"{provider} rejected the API key")


# Groq, production chat model offered by this site. The org is on Groq's Developer (pay-as-you-go) plan.
# Sources (checked 2026-11-14):
#   https://console.groq.com/docs/model/openai/gpt-oss-120b  (pricing: $0.15 / 1M input, $0.075 cached, $0.60 / 1M output;
#                                                              131,072-token context)
#   https://console.groq.com/docs/rate-limits  (headers: x-ratelimit-limit-requests = RPD, x-ratelimit-limit-tokens = TPM)
# A live call on 2026-11-14 returned x-ratelimit-limit-requests: 500000 (RPD) and x-ratelimit-limit-tokens: 250000 (TPM).
# The name GROQ_FREE_MODELS is kept for compatibility: it is the Groq allowlist (one model).
GROQ_BASE_URL = "https://api.groq.com/openai/v1"
GROQ_FREE_MODELS = {
    "openai/gpt-oss-120b": {"label": "GPT OSS 120B",
                            "free_limits": "Groq Developer plan: 250K tokens/min · 500K requests/day (org limits from Groq's "
                                           "response headers); $0.15 / 1M input, $0.60 / 1M output tokens"},
}
GROQ_DEFAULT_MODEL = "openai/gpt-oss-120b"

# Gemini API Free tier, text chat models only. Source (checked 2026-11-14):
#   https://ai.google.dev/gemini-api/docs/pricing
#   https://ai.google.dev/gemini-api/docs/models
#   https://ai.google.dev/gemini-api/docs/openai  (OpenAI-compatible endpoint)
# The production site and Settings UI offer only gemini-3.8-flash. Other Gemini models
# (including deprecated gemini-2.5-flash and gemini-3.5-flash-lite) are not allowlisted.
# gemini-4-carbon / gemini-4-argon have no free tier.
GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai"
GEMINI_FREE_MODELS = {
    "gemini-3.8-flash": {
        "label": "Gemini 3.8 Flash",
        "free_limits": "Free of charge on the Gemini API Free tier (project rate limits are shown in Google AI Studio)",
    },
}
GEMINI_DEFAULT_MODEL = "gemini-3.8-flash"
GEMINI_DOCS = "https://ai.google.dev/gemini-api/docs/pricing"


class LLMProvider:
    name = "none"
    model = ""

    def health(self) -> dict:
        return {"ok": False, "provider": self.name, "model": self.model, "message": "No LLM configured."}

    def chat(self, system: str, user: str) -> str:
        raise LLMUnavailable("No LLM provider configured")


class NoLLM(LLMProvider):
    pass


class QuotaGuardLLM(LLMProvider):
    """Wraps the shared server-key provider: each real chat() call first takes one unit of the visitor's quota.
    Questions answered without the LLM (abstentions, no-summary paths) never consume quota, and a provider call that
    fails (HTTP 402/429/5xx, timeout) is refunded, so only AI summaries that were actually produced are counted."""

    def __init__(self, inner: LLMProvider, take, refund=None):
        self.inner, self._take, self._refund = inner, take, refund
        self.name, self.model = inner.name, inner.model

    def __repr__(self) -> str:
        return f"<QuotaGuardLLM {self.inner!r}>"

    def health(self) -> dict:
        return self.inner.health()

    @property
    def last_usage(self):
        return getattr(self.inner, "last_usage", None)

    def chat(self, system: str, user: str) -> str:
        import time

        now = time.time()
        ok, why = self._take(now)
        if not ok:
            wait = "tomorrow" if "per day" in (why or "") or "daily" in (why or "") else "in about a minute"
            raise LLMQuotaExceeded(f"You've reached this site's limit of {why}, so this is the computed answer without an AI "
                                   f"summary. Try again {wait}, or add your own Groq key in Settings.")
        try:
            return self.inner.chat(system, user)
        except LLMUnavailable:
            if self._refund:
                self._refund(now)
            raise


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
            log.warning("LLM call failed: provider=Ollama error=%s", type(e).__name__)
            raise LLMUnavailable(f"Ollama call failed: {type(e).__name__}") from e


def _redact_error(name: str, e: Exception, byok: bool = False) -> LLMUnavailable:
    """Map a provider failure to a typed error. Never put provider response bodies or exception text in errors
    (they can echo the key). The raw status and exception type are logged server-side only; visitors see a
    friendly notice built in app.services.ask.friendly_notice."""
    resp = getattr(e, "response", None)
    status = getattr(resp, "status_code", None)
    log.warning("LLM call failed: provider=%s byok=%s status=%s error=%s", name, byok, status, type(e).__name__)
    if status in (401, 403):
        return LLMAuthFailed(name)
    if status == 400 and byok:
        try:
            body = (resp.text or "").lower()
        except Exception:  # noqa: BLE001
            body = ""
        if "api key" in body or "api_key" in body or "invalid_api_key" in body:
            return LLMAuthFailed(name)
    if status == 402:
        return LLMPaymentRequired(name)
    if status == 429:
        return LLMRateLimited(name)
    return LLMUnavailable(f"{name} call failed: {type(e).__name__}" + (f" (HTTP {status})" if status else ""))


# Last rate-limit headers seen from the SERVER key (never a visitor's key). Values are limits, not secrets.
LAST_LIMITS: dict[str, dict] = {}
_LIMIT_HEADERS = ("x-ratelimit-limit-requests", "x-ratelimit-limit-tokens", "x-ratelimit-remaining-requests",
                  "x-ratelimit-remaining-tokens", "x-ratelimit-reset-requests", "x-ratelimit-reset-tokens")


def _record_limits(provider: str, headers, byok: bool) -> None:
    if byok:
        return
    import time

    got = {h.replace("x-ratelimit-", ""): headers.get(h) for h in _LIMIT_HEADERS if headers.get(h) is not None}
    if got:
        LAST_LIMITS[provider] = {**got, "seen_at": time.time(),
                                 "meaning": "limit-requests = requests per day; limit-tokens = tokens per minute (Groq docs)"}


def _usage(u: dict | None) -> dict:
    u = u or {}
    det = u.get("completion_tokens_details") or {}
    return {"prompt_tokens": u.get("prompt_tokens"), "completion_tokens": u.get("completion_tokens"),
            "reasoning_tokens": det.get("reasoning_tokens"), "total_tokens": u.get("total_tokens")}


class OpenAICompatLLM(LLMProvider):
    """OpenAI Chat Completions over plain HTTPS (also used for Groq, which is OpenAI-compatible).

    ``byok`` marks a key that came from the browser for this one request: it is held only on this
    object (created per request), never logged, never returned, and never sent anywhere but base_url."""

    name = "openai"
    env_var = "OPENAI_API_KEY"

    def __init__(self, api_key: str | None, model: str, timeout: float, base_url: str = "https://api.openai.com/v1",
                 byok: bool = False):
        self._key, self.model, self.timeout, self.base_url, self.byok = api_key, model, timeout, base_url.rstrip("/"), byok
        self.last_usage: dict | None = None

    def __repr__(self) -> str:  # keep the key out of tracebacks / debug output
        return f"<{type(self).__name__} model={self.model!r} byok={self.byok}>"

    def health(self) -> dict:
        src = "your key (this request only)" if self.byok else self.env_var
        if not self._key:
            return {"ok": False, "provider": self.name, "model": self.model, "byok": self.byok,
                    "message": f"{self.env_var} is not set (server env), and no key was supplied in this browser tab."}
        return {"ok": True, "provider": self.name, "model": self.model, "byok": self.byok,
                "message": f"Key from {src} present (not validated until first call)."}

    def _body(self, system: str, user: str) -> dict:
        return {"model": self.model, "temperature": 0,
                "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]}

    def chat(self, system: str, user: str) -> str:
        if not self._key:
            raise LLMUnavailable(f"{self.env_var} missing")
        try:
            r = httpx.post(f"{self.base_url}/chat/completions", timeout=self.timeout,
                           headers={"Authorization": f"Bearer {self._key}", "Content-Type": "application/json"},
                           json=self._body(system, user))
            if r.status_code == 429:
                ra = r.headers.get("retry-after")
                log.warning("LLM call failed: provider=%s byok=%s status=429", self.label, self.byok)
                raise LLMRateLimited(self.label, ra if ra and ra.replace(".", "", 1).isdigit() else None)
            if r.status_code == 402:
                log.warning("LLM call failed: provider=%s byok=%s status=402", self.label, self.byok)
                raise LLMPaymentRequired(self.label)
            r.raise_for_status()
            data = r.json()
            choice = data["choices"][0]
            self.last_usage = {**_usage(data.get("usage")), "finish_reason": choice.get("finish_reason")}
            _record_limits(self.name, r.headers, self.byok)
            content = choice["message"].get("content") or ""
            if not content.strip():
                # e.g. all completion tokens spent on reasoning: treat as a failed call (refunded, templated fallback)
                log.warning("LLM call returned empty content: provider=%s finish_reason=%s", self.label,
                            choice.get("finish_reason"))
                raise LLMUnavailable(f"{self.label} returned an empty answer (finish_reason={choice.get('finish_reason')})")
            return content
        except (LLMRateLimited, LLMPaymentRequired, LLMUnavailable):
            raise
        except Exception as e:  # noqa: BLE001
            raise _redact_error(self.label, e, self.byok) from None

    @property
    def label(self) -> str:
        return {"openai": "OpenAI", "groq": "Groq", "gemini": "Gemini"}.get(self.name, self.name)


class OpenAILLM(OpenAICompatLLM):
    name = "openai"
    env_var = "OPENAI_API_KEY"


class GroqLLM(OpenAICompatLLM):
    """Groq via its OpenAI-compatible API (https://api.groq.com/openai/v1), allowlisted production model only."""

    name = "groq"
    env_var = "GROQ_API_KEY"

    def __init__(self, api_key: str | None, model: str, timeout: float, byok: bool = False):
        super().__init__(api_key, model, timeout, GROQ_BASE_URL, byok)

    def health(self) -> dict:
        if self.model not in GROQ_FREE_MODELS:
            return {"ok": False, "provider": self.name, "model": self.model, "byok": self.byok,
                    "message": f"GROQ_MODEL '{self.model}' is not an allowed model. Use one of: "
                               + ", ".join(GROQ_FREE_MODELS)}
        h = super().health()
        return {**h, "free_limits": GROQ_FREE_MODELS[self.model]["free_limits"]}

    def _body(self, system: str, user: str) -> dict:
        body = super()._body(system, user)
        # GPT-OSS are reasoning models (console.groq.com/docs/reasoning). For faithful, well-checked answers use
        # "medium" reasoning effort; reasoning is excluded from the reply (include_reasoning=false), and the
        # completion budget covers reasoning + answer so the answer is not cut off. temperature 0 = deterministic.
        body.update(temperature=0, reasoning_effort="medium", include_reasoning=False, max_completion_tokens=3000)
        return body

    def chat(self, system: str, user: str) -> str:
        if self.model not in GROQ_FREE_MODELS:
            raise LLMUnavailable("Groq model is not on the allowlist")
        return super().chat(system, user)


class GeminiLLM(OpenAICompatLLM):
    """Gemini via its OpenAI-compatible API
    (https://generativelanguage.googleapis.com/v1beta/openai/), free-tier text models only."""

    name = "gemini"
    env_var = "GEMINI_API_KEY"

    def __init__(self, api_key: str | None, model: str, timeout: float, byok: bool = False):
        super().__init__(api_key, model, timeout, GEMINI_BASE_URL, byok)

    def health(self) -> dict:
        if self.model not in GEMINI_FREE_MODELS:
            return {"ok": False, "provider": self.name, "model": self.model, "byok": self.byok,
                    "message": f"GEMINI_MODEL '{self.model}' is not an allowed free-tier model. Use one of: "
                               + ", ".join(GEMINI_FREE_MODELS)}
        h = super().health()
        return {**h, "free_limits": GEMINI_FREE_MODELS[self.model]["free_limits"]}

    def _body(self, system: str, user: str) -> dict:
        body = super()._body(system, user)
        # Keep thinking short (OpenAI-compat maps reasoning_effort to Gemini thinking) and cap output.
        # https://ai.google.dev/gemini-api/docs/openai#thinking
        body.update(reasoning_effort="low", max_tokens=700)
        return body

    def chat(self, system: str, user: str) -> str:
        if self.model not in GEMINI_FREE_MODELS:
            raise LLMUnavailable("Gemini model is not on the free-tier allowlist")
        return super().chat(system, user)


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
            raise _redact_error("Anthropic", e, self.byok) from None


BYOK_PROVIDERS = ("groq", "gemini", "openai", "anthropic")


def build_byok_llm(cfg: Settings, provider: str, key: str, model: str | None = None) -> LLMProvider:
    """Per-request provider for a key supplied by the browser (D3). Base URLs are fixed server-side,
    so a client cannot redirect its key (or ours) to another host."""
    if provider == "openai":
        return OpenAILLM(key, model or cfg.openai_model, cfg.llm_timeout_s, byok=True)
    if provider == "anthropic":
        return AnthropicLLM(key, model or cfg.anthropic_model, cfg.llm_timeout_s, byok=True)
    if provider == "groq":
        m = model or cfg.groq_model
        if m not in GROQ_FREE_MODELS:
            raise ValueError("model not allowed")
        return GroqLLM(key, m, cfg.llm_timeout_s, byok=True)
    if provider == "gemini":
        m = model or cfg.gemini_model
        if m not in GEMINI_FREE_MODELS:
            raise ValueError("model not allowed")
        return GeminiLLM(key, m, cfg.llm_timeout_s, byok=True)
    raise ValueError("unsupported provider")


def build_llm(cfg: Settings) -> LLMProvider:
    p = cfg.ai_llm_provider
    if p == "local":
        return OllamaLLM(cfg.ollama_base_url, cfg.ollama_model, cfg.llm_timeout_s)
    if p == "openai":
        return OpenAILLM(cfg.openai_api_key, cfg.openai_model, cfg.llm_timeout_s)
    if p == "anthropic":
        return AnthropicLLM(cfg.anthropic_api_key, cfg.anthropic_model, cfg.llm_timeout_s)
    if p == "groq":
        return GroqLLM(cfg.groq_api_key, cfg.groq_model, cfg.llm_timeout_s)
    if p == "gemini":
        return GeminiLLM(cfg.gemini_api_key, cfg.gemini_model, cfg.llm_timeout_s)
    return NoLLM()


def model_not_allowed_message(provider: str) -> str:
    """Client-facing error when X-LLM-Model is outside the free-tier allowlist. Never includes the key."""
    if provider == "groq":
        allowed = ", ".join(GROQ_FREE_MODELS)
        kind = "Allowed Groq model"
    elif provider == "gemini":
        allowed = ", ".join(GEMINI_FREE_MODELS)
        kind = "Free-tier Gemini models"
    else:
        return f"Model not allowed for {provider}. The key was not used or stored."
    return f"Model not allowed for {provider}. {kind}: {allowed}. The key was not used or stored."

