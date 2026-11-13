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
