"""D3 bring-your-own-key and admin lock. All provider HTTP is mocked; no real keys anywhere."""
import logging

import httpx
import pytest

from app.ai.providers import llm as llm_mod
from app.ai.registry import state
from app.security import redact

FAKE = {"openai": "sk-test-" + "A" * 40, "anthropic": "sk-ant-test-" + "B" * 40, "xai": "xai-test-" + "C" * 40}
Q = {"question": "How many tests were run in SAFFIRE-II?"}


class Recorder:
    def __init__(self, status=200, echo_key=False):
        self.calls, self.status, self.echo = [], status, echo_key

    def __call__(self, url, headers=None, json=None, timeout=None):
        self.calls.append({"url": url, "headers": dict(headers or {}), "json": json})
        auth = (headers or {}).get("Authorization") or (headers or {}).get("x-api-key") or ""
        req = httpx.Request("POST", url)
        if self.status != 200:
            body = {"error": f"invalid key {auth}"} if self.echo else {"error": "bad"}
            return httpx.Response(self.status, json=body, request=req)
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
    ("xai", "https://api.x.ai/v1/chat/completions", "Authorization"),
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
    assert state.cfg.openai_api_key is None and state.cfg.xai_api_key is None and state.cfg.anthropic_api_key is None


def test_xai_default_model_and_override(client, rec):
    client.post("/api/ask", json=Q, headers=_hdr("xai"))
    assert rec.calls[-1]["json"]["model"] == "grok-4.7"
    client.post("/api/ask", json=Q, headers=_hdr("xai", model="grok-4.7-mini"))
    assert rec.calls[-1]["json"]["model"] == "grok-4.7-mini"


def test_xai_server_env_provider(monkeypatch, rec):
    cfg = state.cfg.model_copy(update={"ai_llm_provider": "xai", "xai_api_key": "xai-env-" + "D" * 30, "xai_model": "grok-4.7"})
    p = llm_mod.build_llm(cfg)
    assert isinstance(p, llm_mod.XaiLLM) and p.base_url == "https://api.x.ai/v1"
    assert p.health()["ok"] and "xai-env" not in str(p.health()) and "xai-env" not in repr(p)
    assert p.chat("s", "u").startswith("Nine")
    assert rec.calls[-1]["url"] == "https://api.x.ai/v1/chat/completions"


def test_provider_error_echoing_key_is_redacted(client, monkeypatch, caplog):
    caplog.set_level(logging.DEBUG)
    r = Recorder(status=401, echo_key=True)
    monkeypatch.setattr(llm_mod.httpx, "post", r)
    for p in ("openai", "xai", "anthropic"):
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
    client.post("/api/ask", json=Q, headers={**_hdr("xai"), "X-LLM-Base-Url": "https://evil.example"})
    assert all(c["url"].startswith("https://api.x.ai/") for c in rec.calls)


def test_redact_patterns():
    s = f"Authorization: Bearer {FAKE['openai']} x-api-key={FAKE['anthropic']} {FAKE['xai']}"
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
