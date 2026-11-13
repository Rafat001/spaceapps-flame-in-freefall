"""Small in-memory sliding-window limiter for POST /api/ask when it would spend the shared server key.

Per-IP limits stop one visitor from using up the key; the global caps keep the whole deployment under the
provider's free-plan limits even if per-IP identification is imperfect (e.g. shared NAT, spoofed headers).
State is per process and resets on restart, which is fine for a single free Render instance.
"""
from __future__ import annotations

import threading
import time
from collections import defaultdict, deque

from fastapi import Request

_lock = threading.Lock()
_hits: dict[str, deque] = defaultdict(deque)


def client_ip(request: Request) -> str:
    # Render (and most proxies) put the original client first in X-Forwarded-For.
    fwd = request.headers.get("x-forwarded-for", "")
    ip = fwd.split(",")[0].strip() if fwd else ""
    return ip or (request.client.host if request.client else "unknown")


def _take(key: str, limit: int, window: float, now: float) -> bool:
    if limit <= 0:
        return True
    q = _hits[key]
    while q and q[0] <= now - window:
        q.popleft()
    if len(q) >= limit:
        return False
    return True


def allow(ip: str, per_min: int, per_day: int, global_min: int, global_day: int, now: float | None = None) -> tuple[bool, str | None]:
    """Record one server-key LLM use if every window has room. Returns (allowed, reason)."""
    now = time.time() if now is None else now
    checks = [(f"ip-m:{ip}", per_min, 60.0, f"{per_min} AI summaries per minute per visitor"),
              (f"ip-d:{ip}", per_day, 86400.0, f"{per_day} AI summaries per day per visitor"),
              ("g-m", global_min, 60.0, "the site-wide per-minute AI limit"),
              ("g-d", global_day, 86400.0, "the site-wide daily AI limit")]
    with _lock:
        for key, limit, window, why in checks:
            if not _take(key, limit, window, now):
                return False, why
        for key, limit, _, _ in checks:
            if limit > 0:
                _hits[key].append(now)
    return True, None


def reset() -> None:
    with _lock:
        _hits.clear()
