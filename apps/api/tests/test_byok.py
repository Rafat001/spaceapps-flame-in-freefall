"""D3 bring-your-own-key and admin lock. All provider HTTP is mocked; no real keys anywhere."""
import logging

import httpx
import pytest

from app.ai.providers import llm as llm_mod
from app.ai.registry import state
from app.security import redact

FAKE = {"openai": "sk-test-" + "A" * 40, "anthropic": "sk-ant-test-" + "B" * 40, "groq": "gsk_test" + "C" * 44,
        "gemini": "AIzaSyTest" + "E" * 28}
Q = {"question": "How many tests were run in SAFFIRE-II?"}


class Recorder:
    def __init__(self, status=200, echo_key=False, headers=None):
        self.calls, self.status, self.echo, self.headers = [], status, echo_key, headers or {}

    def __call__(self, url, headers=None, json=None, timeout=None):
        self.calls.append({"url": url, "headers": dict(headers or {}), "json": json})
        auth = (headers or {}).get("Authorization") or (headers or {}).get("x-api-key") or ""
        req = httpx.Request("POST", url)
        if self.status != 200:
            body = {"error": f"invalid key {auth}"} if self.echo else {"error": "bad"}
            return httpx.Response(self.status, json=body, headers=self.headers, request=req)
        if "anthropic" in url:
            return httpx.Response(200, json={"content": [{"type": "text", "text": "Nine tests [S1]."}]}, request=req)
        return httpx.Response(200, json={"choices": [{"message": {"content": "Nine tests [S1]."}}]}, request=req)


@pytest.fixture()
def rec(monkeypatch):
    r = Recorder()
    monkeypatch.setattr(llm_mod.httpx, "post", r)
    return r


def _hdr(p, key=None, model=None):
    h = {"X-LLM-Provider": p, "X-LLM-Key": key or FAKE[p]}
    if model:
        h["X-LLM-Model"] = model
    return h


@pytest.mark.parametrize("provider,url,auth", [
    ("openai", "https://api.openai.com/v1/chat/completions", "Authorization"),
    ("anthropic", "https://api.anthropic.com/v1/messages", "x-api-key"),
    ("groq", "https://api.groq.com/openai/v1/chat/completions", "Authorization"),
    ("gemini", "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", "Authorization"),
])
def test_byok_used_for_that_request_only_and_never_echoed(client, rec, caplog, provider, url, auth):
    caplog.set_level(logging.DEBUG)
    r = client.post("/api/ask", json=Q, headers=_hdr(provider))
    assert r.status_code == 200
    assert FAKE[provider] not in r.text
    assert len(rec.calls) == 1 and rec.calls[0]["url"] == url
    assert FAKE[provider] in rec.calls[0]["headers"][auth]
    assert FAKE[provider] not in caplog.text
    # next request without the header falls back to the server default (none) -> no provider call
    r2 = client.post("/api/ask", json=Q)
    assert len(rec.calls) == 1 and FAKE[provider] not in r2.text
    assert state.cfg.openai_api_key is None and state.cfg.groq_api_key is None and state.cfg.anthropic_api_key is None and state.cfg.gemini_api_key is None


def test_groq_default_model_allowlist_and_free_params(client, rec):
    client.post("/api/ask", json=Q, headers=_hdr("groq"))
    body = rec.calls[-1]["json"]
    assert body["model"] == "openai/gpt-oss-120b"
    assert body["reasoning_effort"] == "low" and body["include_reasoning"] is False and body["max_completion_tokens"] <= 1000
    client.post("/api/ask", json=Q, headers=_hdr("groq", model="openai/gpt-oss-20b"))
    assert rec.calls[-1]["json"]["model"] == "openai/gpt-oss-20b"
    n = len(rec.calls)
    for paid in ("llama-3.3-70b-versatile", "qwen/qwen3.8-27b", "gpt-4o"):
        r = client.post("/api/ask", json=Q, headers=_hdr("groq", model=paid))
        assert r.status_code == 400 and FAKE["groq"] not in r.text
    assert len(rec.calls) == n


def test_groq_server_env_provider(rec):
    cfg = state.cfg.model_copy(update={"ai_llm_provider": "groq", "groq_api_key": "gsk_env" + "D" * 40})
    p = llm_mod.build_llm(cfg)
    assert isinstance(p, llm_mod.GroqLLM) and p.base_url == "https://api.groq.com/openai/v1"
    assert p.model == "openai/gpt-oss-120b"
    h = p.health()
    assert h["ok"] and "gsk_env" not in str(h) and "gsk_env" not in repr(p) and "30 RPM" in h["free_limits"]
    assert p.chat("s", "u").startswith("Nine")
    assert rec.calls[-1]["url"] == "https://api.groq.com/openai/v1/chat/completions"


def test_groq_env_model_outside_allowlist_is_refused(rec):
    cfg = state.cfg.model_copy(update={"ai_llm_provider": "groq", "groq_api_key": "gsk_env" + "D" * 40,
                                       "groq_model": "llama-3.3-70b-versatile"})
    p = llm_mod.build_llm(cfg)
    assert not p.health()["ok"] and "openai/gpt-oss-120b" in p.health()["message"]
    with pytest.raises(llm_mod.LLMUnavailable):
        p.chat("s", "u")
    assert rec.calls == []


def test_admin_cannot_switch_to_paid_groq_model(client, monkeypatch):
    from app import security

    monkeypatch.setattr(security.settings, "app_env", "development")
    monkeypatch.setattr(state, "cfg", state.cfg.model_copy(update={"admin_token": None}))
    assert client.put("/api/settings/ai", json={"groq_model": "llama-3.3-70b-versatile"}).status_code == 400


def test_gemini_default_model_allowlist_and_free_params(client, rec):
    client.post("/api/ask", json=Q, headers=_hdr("gemini"))
    body = rec.calls[-1]["json"]
    assert rec.calls[-1]["url"] == "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
    assert body["model"] == "gemini-3.8-flash"
    assert body["reasoning_effort"] == "low" and body["max_tokens"] <= 1000
    client.post("/api/ask", json=Q, headers=_hdr("gemini", model="gemini-3.5-flash-lite"))
    assert rec.calls[-1]["json"]["model"] == "gemini-3.5-flash-lite"
    n = len(rec.calls)
    for paid in ("gemini-4-carbon", "gemini-2.5-flash", "gpt-4o"):
        r = client.post("/api/ask", json=Q, headers=_hdr("gemini", model=paid))
        assert r.status_code == 400 and FAKE["gemini"] not in r.text
        assert "gemini-3.8-flash" in r.text
    assert len(rec.calls) == n


def test_gemini_server_env_provider(rec):
    cfg = state.cfg.model_copy(update={"ai_llm_provider": "gemini", "gemini_api_key": "AIzaSyEnv" + "F" * 28})
    p = llm_mod.build_llm(cfg)
    assert isinstance(p, llm_mod.GeminiLLM) and p.base_url == "https://generativelanguage.googleapis.com/v1beta/openai"
    assert p.model == "gemini-3.8-flash"
    h = p.health()
    assert h["ok"] and "AIzaSyEnv" not in str(h) and "AIzaSyEnv" not in repr(p)
    assert "Free of charge" in h["free_limits"]
    assert p.chat("s", "u").startswith("Nine")
    assert rec.calls[-1]["url"] == "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"


def test_gemini_missing_key_is_clear_and_makes_no_http_call(rec):
    cfg = state.cfg.model_copy(update={"ai_llm_provider": "gemini", "gemini_api_key": None})
    p = llm_mod.build_llm(cfg)
    h = p.health()
    assert h["ok"] is False and "GEMINI_API_KEY" in h["message"]
    with pytest.raises(llm_mod.LLMUnavailable, match="GEMINI_API_KEY"):
        p.chat("s", "u")
    assert rec.calls == []


def test_gemini_env_model_outside_allowlist_is_refused(rec):
    cfg = state.cfg.model_copy(update={"ai_llm_provider": "gemini", "gemini_api_key": "AIzaSyEnv" + "F" * 28,
                                       "gemini_model": "gemini-4-carbon"})
    p = llm_mod.build_llm(cfg)
    assert not p.health()["ok"] and "gemini-3.8-flash" in p.health()["message"]
    with pytest.raises(llm_mod.LLMUnavailable):
        p.chat("s", "u")
    assert rec.calls == []


def test_admin_cannot_switch_to_paid_gemini_model(client, monkeypatch):
    from app import security

    monkeypatch.setattr(security.settings, "app_env", "development")
    monkeypatch.setattr(state, "cfg", state.cfg.model_copy(update={"admin_token": None}))
    assert client.put("/api/settings/ai", json={"gemini_model": "gemini-4-carbon"}).status_code == 400


def test_groq_429_falls_back_to_template_with_notice(client, monkeypatch, caplog):
    caplog.set_level(logging.DEBUG)
    r = Recorder(status=429, echo_key=True, headers={"retry-after": "7"})
    monkeypatch.setattr(llm_mod.httpx, "post", r)
    # direct-answer question: computed answer kept, AI summary skipped with a notice
    d = client.post("/api/ask", json=Q, headers=_hdr("groq")).json()
    assert d["mode"] == "direct" and d["answer"] and d["ai_summary"] is None
    assert "HTTP 429" in d["llm_notice"] and "7 s" in d["llm_notice"]
    # retrieval question: templated summary plus the notice
    d = client.post("/api/ask", json={"question": "What do the sources say about smoke particle size in microgravity?"},
                    headers=_hdr("groq")).json()
    if d["mode"] == "retrieval_only":
        assert "HTTP 429" in d["llm_notice"] and d["template_summary"]
    assert FAKE["groq"] not in str(d) and FAKE["groq"] not in caplog.text


def test_provider_error_echoing_key_is_redacted(client, monkeypatch, caplog):
    caplog.set_level(logging.DEBUG)
    r = Recorder(status=401, echo_key=True)
    monkeypatch.setattr(llm_mod.httpx, "post", r)
    for p in ("openai", "groq", "gemini", "anthropic"):
        resp = client.post("/api/ask", json=Q, headers=_hdr(p))
        assert resp.status_code == 200
        assert FAKE[p] not in resp.text and FAKE[p] not in caplog.text
        assert "HTTP 401" in resp.text


def test_key_header_refused_on_other_endpoints(client, rec):
    for method, path in [("get", "/api/investigations"), ("get", "/api/health"), ("post", "/api/coverage"), ("get", "/api/rank")]:
        kw = {"json": {}} if method == "post" else {}
        r = getattr(client, method)(path, headers=_hdr("openai"), **kw)
        assert r.status_code == 400 and FAKE["openai"] not in r.text
    assert rec.calls == []


def test_invalid_provider_or_key_not_echoed(client, rec):
    r = client.post("/api/ask", json=Q, headers={"X-LLM-Provider": "evil", "X-LLM-Key": FAKE["openai"]})
    assert r.status_code == 400 and FAKE["openai"] not in r.text
    bad = "short"
    r = client.post("/api/ask", json=Q, headers={"X-LLM-Provider": "openai", "X-LLM-Key": bad})
    assert r.status_code == 400 and "short" not in r.text
    assert rec.calls == []


def test_https_required_in_production(client, rec, monkeypatch):
    from app import security

    monkeypatch.setattr(security.settings, "app_env", "production")
    r = client.post("/api/ask", json=Q, headers={**_hdr("openai"), "X-Forwarded-Proto": "http"})
    assert r.status_code == 400 and "HTTPS" in r.text
    r = client.post("/api/ask", json=Q, headers={**_hdr("openai"), "X-Forwarded-Proto": "https"})
    assert r.status_code == 200
    assert len(rec.calls) == 1


def test_client_cannot_redirect_key_to_another_host(client, rec):
    client.post("/api/ask", json=Q, headers={**_hdr("groq"), "X-LLM-Base-Url": "https://evil.example"})
    assert rec.calls and all(c["url"].startswith("https://api.groq.com/openai/v1/") for c in rec.calls)


def test_redact_patterns():
    s = f"Authorization: Bearer {FAKE['openai']} x-api-key={FAKE['anthropic']} {FAKE['groq']} {FAKE['gemini']}"
    out = redact(s)
    assert all(v not in out for v in FAKE.values())


def test_admin_lock(client, monkeypatch):
    from app import security

    body = {"ai_llm_provider": "none"}
    # development, no token: allowed
    monkeypatch.setattr(state, "cfg", state.cfg.model_copy(update={"admin_token": None}))
    monkeypatch.setattr(security.settings, "app_env", "development")
    assert client.put("/api/settings/ai", json=body).status_code == 200
    # production, no token: disabled
    monkeypatch.setattr(security.settings, "app_env", "production")
    assert client.put("/api/settings/ai", json=body).status_code == 403
    assert client.post("/api/ingest/rebuild").status_code == 403
    # token set: required
    monkeypatch.setattr(state, "cfg", state.cfg.model_copy(update={"admin_token": "t0ken-for-tests"}))
    assert client.put("/api/settings/ai", json=body).status_code == 401
    assert client.put("/api/settings/ai", json=body, headers={"X-Admin-Token": "wrong"}).status_code == 401
    r = client.put("/api/settings/ai", json=body, headers={"X-Admin-Token": "t0ken-for-tests"})
    assert r.status_code == 200 and "t0ken-for-tests" not in r.text
    monkeypatch.setattr(security.settings, "app_env", "development")
