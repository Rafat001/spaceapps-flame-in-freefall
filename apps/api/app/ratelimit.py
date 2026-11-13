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


def _windows(ip: str, per_min: int, per_day: int, global_min: int, global_day: int):
    return {"you": {"minute": (f"ip-m:{ip}", per_min, 60.0), "day": (f"ip-d:{ip}", per_day, 86400.0)},
            "site": {"minute": ("g-m", global_min, 60.0), "day": ("g-d", global_day, 86400.0)}}


def peek(ip: str, per_min: int, per_day: int, global_min: int, global_day: int, now: float | None = None) -> dict:
    """Remaining server-key AI answers per window, WITHOUT recording a use. resets_at = when the oldest counted use expires."""
    now = time.time() if now is None else now
    out: dict = {}
    with _lock:
        for who, wins in _windows(ip, per_min, per_day, global_min, global_day).items():
            out[who] = {}
            for name, (key, limit, window) in wins.items():
                q = _hits.get(key) or deque()
                live = [t for t in q if t > now - window]
                used = len(live)
                out[who][name] = {"limit": limit, "used": used, "remaining": max(limit - used, 0) if limit > 0 else None,
                                  "resets_at": (min(live) + window) if live else None, "window_s": int(window)}
    out["you"]["remaining"] = min(x for x in (out["you"]["minute"]["remaining"], out["you"]["day"]["remaining"],
                                                out["site"]["minute"]["remaining"], out["site"]["day"]["remaining"]) if x is not None) \
        if any(out[w][n]["remaining"] is not None for w in ("you", "site") for n in ("minute", "day")) else None
    out["now"] = now
    return out


def reset() -> None:
    with _lock:
        _hits.clear()
