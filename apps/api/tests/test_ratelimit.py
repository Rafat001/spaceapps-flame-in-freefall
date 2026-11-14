"""Per-IP and site-wide limits on server-key AI use in POST /api/ask. Provider HTTP is mocked; fake keys only."""
import httpx
import pytest

from app import ratelimit
from app.ai.providers import llm as llm_mod
from app.ai.registry import state

Q = {"question": "How many tests were run in SAFFIRE-II?"}


def test_sliding_windows():
    ratelimit.reset()
    t = 1_000_000.0
    assert all(ratelimit.allow("1.1.1.1", 2, 3, 100, 100, now=t + i)[0] for i in range(2))
    ok, why = ratelimit.allow("1.1.1.1", 2, 3, 100, 100, now=t + 2)
    assert not ok and "per minute" in why
    assert ratelimit.allow("2.2.2.2", 2, 3, 100, 100, now=t + 2)[0]  # other visitor unaffected
    assert ratelimit.allow("1.1.1.1", 2, 3, 100, 100, now=t + 61)[0]  # minute window slid
    ok, why = ratelimit.allow("1.1.1.1", 2, 3, 100, 100, now=t + 122)
    assert not ok and "per day" in why
    ratelimit.reset()
    assert ratelimit.allow("a", 10, 10, 1, 10, now=t)[0]
    ok, why = ratelimit.allow("b", 10, 10, 1, 10, now=t + 1)
    assert not ok and "site-wide" in why
    ratelimit.reset()


@pytest.fixture()
def server_groq(monkeypatch):
    calls = []

    def fake_post(url, headers=None, json=None, timeout=None):
        calls.append(url)
        return httpx.Response(200, json={"choices": [{"message": {"content": "Summary [S0]."}}]}, request=httpx.Request("POST", url))

    monkeypatch.setattr(llm_mod.httpx, "post", fake_post)
    cfg = state.cfg.model_copy(update={"ai_llm_provider": "groq", "groq_api_key": "gsk_server" + "E" * 40,
                                       "ask_rate_per_min": 2, "ask_rate_per_day": 200})
    monkeypatch.setattr(state, "cfg", cfg)
    monkeypatch.setattr(state, "_llm", None)
    ratelimit.reset()
    yield calls
    ratelimit.reset()
    monkeypatch.setattr(state, "_llm", None)


def test_server_key_rate_limited_per_ip(client, server_groq):
    h = {"X-Forwarded-For": "203.0.113.5"}
    for _ in range(2):
        d = client.post("/api/ask", json=Q, headers=h).json()
        assert d["ai_summary"] and "llm_notice" not in d
    d = client.post("/api/ask", json=Q, headers=h).json()
    assert d["answer"] and not d.get("ai_summary") and "2 AI summaries per minute" in d["llm_notice"]
    assert len(server_groq) == 2
    # another visitor still gets a summary
    d = client.post("/api/ask", json=Q, headers={"X-Forwarded-For": "198.51.100.9"}).json()
    assert d["ai_summary"] and len(server_groq) == 3
    assert "gsk_server" not in str(d)


def test_own_key_not_counted_against_server_limit(client, server_groq):
    h = {"X-Forwarded-For": "203.0.113.7", "X-LLM-Provider": "groq", "X-LLM-Key": "gsk_mine" + "F" * 40}
    for _ in range(4):
        d = client.post("/api/ask", json=Q, headers=h).json()
        assert d["ai_summary"] and "llm_notice" not in d


def test_peek_does_not_consume():
    ratelimit.reset()
    t = 2_000_000.0
    for _ in range(5):
        q = ratelimit.peek("9.9.9.9", 10, 200, 25, 900, now=t)
    assert q["you"]["minute"]["remaining"] == 10 and q["site"]["day"]["remaining"] == 900 and q["you"]["minute"]["resets_at"] is None
    ratelimit.allow("9.9.9.9", 10, 200, 25, 900, now=t)
    q = ratelimit.peek("9.9.9.9", 10, 200, 25, 900, now=t + 1)
    assert q["you"]["minute"]["remaining"] == 9 and q["you"]["day"]["remaining"] == 199 and q["site"]["day"]["remaining"] == 899
    assert q["you"]["minute"]["resets_at"] == t + 60 and q["you"]["remaining"] == 9
    assert ratelimit.peek("9.9.9.9", 10, 200, 25, 900, now=t + 61)["you"]["minute"]["remaining"] == 10
    ratelimit.reset()


def test_quota_endpoint_read_only_and_decreases_after_asks(client, server_groq):
    h = {"X-Forwarded-For": "203.0.113.20"}
    a = client.get("/api/ask/quota", headers=h).json()
    b = client.get("/api/ask/quota", headers=h).json()
    assert a["server_ai"] and a["provider"] == "groq" and a["server_key_configured"]
    assert a["you"]["minute"] == b["you"]["minute"] and a["you"]["minute"]["remaining"] == 2  # limit from config, not hardcoded
    assert "gsk_server" not in str(a)
    d = client.post("/api/ask", json=Q, headers=h).json()
    assert d["quota"]["you"]["minute"]["remaining"] == 1 and d["quota"]["site"]["day"]["remaining"] == state.cfg.ask_global_per_day - 1
    c = client.get("/api/ask/quota", headers=h).json()
    assert c["you"]["minute"]["remaining"] == 1 and c["you"]["day"]["remaining"] == 199
    other = client.get("/api/ask/quota", headers={"X-Forwarded-For": "198.51.100.20"}).json()
    assert other["you"]["minute"]["remaining"] == 2 and other["site"]["day"]["remaining"] == state.cfg.ask_global_per_day - 1


def test_abstained_questions_do_not_consume_quota(client, server_groq):
    h = {"X-Forwarded-For": "203.0.113.21"}
    d = client.post("/api/ask", json={"question": "What is the boiling point of water on Mars?"}, headers=h).json()
    assert d["mode"] == "abstained" and d["quota"]["you"]["minute"]["remaining"] == 2 and server_groq == []


def test_quota_with_own_key_and_without_server_key(client, server_groq, monkeypatch):
    h = {"X-LLM-Provider": "groq", "X-LLM-Key": "gsk_mine" + "F" * 40}
    d = client.post("/api/ask", json=Q, headers=h).json()
    assert d["quota"]["own_key"] is True and "gsk_mine" not in str(d)
    monkeypatch.setattr(state, "cfg", state.cfg.model_copy(update={"ai_llm_provider": "none", "groq_api_key": None}))
    monkeypatch.setattr(state, "_llm", None)
    q = client.get("/api/ask/quota").json()
    assert q["server_ai"] is False and q["server_key_configured"] is False


def test_failed_provider_call_is_refunded(client, monkeypatch, server_groq):
    def failing_post(url, headers=None, json=None, timeout=None):
        server_groq.append(url)
        return httpx.Response(503, json={"error": "busy"}, request=httpx.Request("POST", url))

    monkeypatch.setattr(llm_mod.httpx, "post", failing_post)
    h = {"X-Forwarded-For": "203.0.113.44"}
    for _ in range(4):  # limit is 2/min: failures must not use it up
        d = client.post("/api/ask", json=Q, headers=h).json()
        assert "per minute" not in (d.get("llm_notice") or "")
    q = client.get("/api/ask/quota", headers=h).json()
    assert q["you"]["minute"]["used"] == 0 and q["site"]["day"]["used"] == 0
    assert len(server_groq) == 4


def test_investigation_overview_uses_site_quota(client, server_groq):
    h = {"X-Forwarded-For": "203.0.113.55"}
    for _ in range(2):
        client.get("/api/investigations/psi-117/overview", headers=h)
    q = client.get("/api/ask/quota", headers=h).json()
    assert q["you"]["minute"]["used"] == 2
    d = client.get("/api/investigations/psi-117/overview", headers=h).json()
    assert d["answer"] is None and "per minute" in d["llm_notice"] and d["answer_label"] == "Computed summary (no AI)"
    assert len(server_groq) == 2


def test_refund_removes_only_that_use():
    ratelimit.reset()
    t = 3_000_000.0
    ratelimit.allow("7.7.7.7", 5, 5, 5, 5, now=t)
    ratelimit.allow("7.7.7.7", 5, 5, 5, 5, now=t + 1)
    ratelimit.refund("7.7.7.7", t + 1)
    q = ratelimit.peek("7.7.7.7", 5, 5, 5, 5, now=t + 2)
    assert q["you"]["minute"]["used"] == 1 and q["site"]["day"]["used"] == 1
    ratelimit.reset()
