"""Catalog snapshot + AI answer cache (Explorer search speed). Provider HTTP is mocked; no real keys."""
import httpx
import pytest

from app.ai.providers import llm as llm_mod
from app.ai.registry import state
from app.services import answer_cache, snapshot

PMMA = {"question": "PMMA flame spread"}


class OK:
    def __init__(self, status=200):
        self.calls, self.status = [], status

    def __call__(self, url, headers=None, json=None, timeout=None):
        self.calls.append(json)
        req = httpx.Request("POST", url)
        if self.status != 200:
            return httpx.Response(self.status, json={"error": "x"}, request=req)
        return httpx.Response(200, json={"choices": [{"message": {"content": "PMMA flame spread was studied [S1]."},
                                                      "finish_reason": "stop"}],
                                         "usage": {"prompt_tokens": 100, "completion_tokens": 20, "total_tokens": 120}},
                              request=req)


@pytest.fixture()
def server_groq(monkeypatch):
    from app import ratelimit

    monkeypatch.setattr(state, "cfg", state.cfg.model_copy(update={"ai_llm_provider": "groq",
                                                                    "groq_api_key": "gsk_server" + "E" * 40}))
    monkeypatch.setattr(state, "_llm", None)
    ratelimit.reset()
    yield
    monkeypatch.setattr(state, "_llm", None)
    ratelimit.reset()


def test_repeat_search_served_from_cache_without_new_call_or_quota(client, monkeypatch, server_groq):
    rec = OK()
    monkeypatch.setattr(llm_mod.httpx, "post", rec)
    a = client.post("/api/ask", json=PMMA).json()
    assert a["mode"] == "llm" and len(rec.calls) == 1 and "cache" not in a
    used = a["quota"]["you"]["minute"]["used"]
    b = client.post("/api/ask", json={**PMMA, "question": "  pmma FLAME spread? "}).json()
    assert len(rec.calls) == 1, "repeat search must not call the provider again"
    assert b["cache"]["hit"] is True and b["answer"] == a["answer"] and b["citations"] == a["citations"]
    assert b["quota"]["you"]["minute"]["used"] == used, "a cached answer must not use site quota"
    # a different question (or a different k) is a new AI call
    client.post("/api/ask", json={**PMMA, "k": 8})
    client.post("/api/ask", json={"question": "PMMA ignition"})
    assert len(rec.calls) == 3


def test_overview_cached_per_investigation_and_query(client, monkeypatch, server_groq):
    rec = OK()
    monkeypatch.setattr(llm_mod.httpx, "post", rec)
    client.get("/api/investigations/psi-117/overview", params={"q": "flame spread"})
    client.get("/api/investigations/psi-117/overview", params={"q": "Flame spread"})
    assert len(rec.calls) == 1
    client.get("/api/investigations/psi-117/overview", params={"q": "soot"})
    client.get("/api/investigations/psi-26/overview", params={"q": "flame spread"})
    assert len(rec.calls) == 3


def test_failed_calls_are_not_cached(client, monkeypatch, server_groq):
    monkeypatch.setattr(llm_mod.httpx, "post", OK(status=503))
    d = client.post("/api/ask", json=PMMA).json()
    assert d.get("llm_notice") and "cache" not in d
    rec = OK()
    monkeypatch.setattr(llm_mod.httpx, "post", rec)
    d = client.post("/api/ask", json=PMMA).json()
    assert len(rec.calls) == 1 and d["mode"] == "llm" and "cache" not in d


def test_own_key_answers_are_never_cached(client, monkeypatch, server_groq):
    rec = OK()
    monkeypatch.setattr(llm_mod.httpx, "post", rec)
    h = {"X-LLM-Provider": "groq", "X-LLM-Key": "gsk_test" + "C" * 44}
    client.post("/api/ask", json=PMMA, headers=h)
    d = client.post("/api/ask", json=PMMA, headers=h).json()
    assert len(rec.calls) == 2 and "cache" not in d
    assert answer_cache.info()["entries"] == 0


def test_usage_is_per_request(client, monkeypatch, server_groq):
    """Token usage shown with an answer belongs to that answer (the shared provider object is never mutated)."""
    rec = OK()
    monkeypatch.setattr(llm_mod.httpx, "post", rec)
    d = client.post("/api/ask", json=PMMA).json()
    assert d["llm_usage"]["total_tokens"] == 120
    assert getattr(state.llm, "last_usage", None) is None


def test_cache_lru_and_ttl():
    k1 = answer_cache.make_key("ask", "a", k=6, ids=None, provider="groq", model="m", effort="medium")
    answer_cache.put(k1, {"answer": "x"}, now=1000)
    assert answer_cache.get(k1, now=1000 + answer_cache.TTL_SECONDS - 1)["answer"] == "x"
    assert answer_cache.get(k1, now=1000 + answer_cache.TTL_SECONDS + 1) is None
    for n in range(answer_cache.MAX_ENTRIES + 5):
        answer_cache.put(("k", n), {"answer": n})
    assert answer_cache.info()["entries"] == answer_cache.MAX_ENTRIES
    assert answer_cache.get(("k", 0)) is None and answer_cache.get(("k", answer_cache.MAX_ENTRIES + 4)) is not None
    answer_cache.put(("bad",), {"answer": "x", "llm_notice": "busy"})
    assert answer_cache.get(("bad",)) is None
    answer_cache.put(("abstain",), {"answer": "Insufficient evidence", "mode": "abstained"})
    assert answer_cache.get(("abstain",)) is None


def test_snapshot_reused_and_cleared_on_reset(session):
    a = snapshot.investigations(session)
    assert snapshot.investigations(session) is a and len(a) == 24
    inv = next(iter(a.values()))
    assert inv.test_runs is not None and inv.documents is not None  # loaded, usable after the session closed
    state.reset()
    assert snapshot.investigations(session) is not a


def test_explorer_search_matches_uncached_ranking(client, session):
    """The memoised ranking/cards give the same Explorer answer as a fresh computation."""
    first = client.get("/api/investigations", params={"q": "PMMA flame spread", "sort": "match"}).json()
    snapshot.clear()
    fresh = client.get("/api/investigations", params={"q": "PMMA flame spread", "sort": "match"}).json()
    assert first == fresh and first["total"] > 0
    assert all(c["relevance_rank"] for c in first["items"])
