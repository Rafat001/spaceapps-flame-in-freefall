"""Small in-memory LRU + TTL cache for AI answers made with the site's shared (server) key.

Answers are deterministic for a given question (temperature 0, fixed corpus, fixed prompt), so a repeated
question — the same Explorer search, or the same investigation overview — is served from memory: instantly,
without spending Groq tokens or site quota. Only clean results are stored (no provider failure, no quota notice).
Visitors who use their own key are never served from, or written to, this cache. It lives in one process and is
cleared when the catalog is reloaded or AI settings change, and on restart.
"""
from __future__ import annotations

import copy
import re
import threading
import time
from collections import OrderedDict
from typing import Any

MAX_ENTRIES = 256
TTL_SECONDS = 6 * 3600

_lock = threading.Lock()
_items: "OrderedDict[tuple, tuple[float, dict]]" = OrderedDict()
stats = {"hits": 0, "misses": 0, "stores": 0}


def normalize(question: str) -> str:
    """Case-, whitespace- and trailing-punctuation-insensitive form of a question."""
    return re.sub(r"\s+", " ", question.strip().lower()).rstrip(" ?.!")


def make_key(kind: str, question: str, *, k: int, ids: list[str] | None, provider: str, model: str,
             effort: str | None) -> tuple:
    return (kind, normalize(question), k, tuple(sorted(ids)) if ids else None, provider, model, effort)


def get(key: tuple, now: float | None = None) -> dict | None:
    now = time.time() if now is None else now
    with _lock:
        hit = _items.get(key)
        if hit is None or now - hit[0] > TTL_SECONDS:
            if hit is not None:
                _items.pop(key, None)
            stats["misses"] += 1
            return None
        _items.move_to_end(key)
        stats["hits"] += 1
        stored_at, value = hit
    out = copy.deepcopy(value)
    out["cache"] = {"hit": True, "age_s": int(now - stored_at),
                    "note": "Served from this site's answer cache: no new AI call was made and no quota was used."}
    return out


def cacheable(result: dict) -> bool:
    """Only clean outcomes: no provider failure / quota notice and no setup problem."""
    return not result.get("llm_notice") and not result.get("setup_message")


def put(key: tuple, result: dict, now: float | None = None) -> None:
    if not cacheable(result):
        return
    value = copy.deepcopy({k: v for k, v in result.items() if k not in ("quota", "cache")})
    with _lock:
        _items[key] = (time.time() if now is None else now, value)
        _items.move_to_end(key)
        while len(_items) > MAX_ENTRIES:
            _items.popitem(last=False)
        stats["stores"] += 1


def clear() -> None:
    with _lock:
        _items.clear()


def info() -> dict[str, Any]:
    with _lock:
        return {"entries": len(_items), "max_entries": MAX_ENTRIES, "ttl_seconds": TTL_SECONDS, **stats}
