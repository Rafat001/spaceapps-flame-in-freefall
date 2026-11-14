"""Bring-your-own-key (D3) and admin lock.

BYOK rules
- The browser keeps the key in sessionStorage (that tab only) and sends it in ``X-LLM-Key`` over HTTPS,
  only with assistant requests (POST /api/ask).
- The server uses it for that one request: it lives on a per-request provider object, is never stored,
  logged, or echoed, and is only sent to the fixed provider base URL.
- The header is refused on every other endpoint, so a client mistake is visible instead of silent.
- Log records and error messages pass through ``redact``.

Admin lock
- PUT /api/settings/ai and POST /api/ingest/rebuild need ``X-Admin-Token`` equal to ADMIN_TOKEN.
- When ADMIN_TOKEN is unset they are disabled in production and open only in local development.
"""
from __future__ import annotations

import contextvars
import hmac
import logging
import re
from dataclasses import dataclass

from fastapi import HTTPException, Request

from app.ai.providers.llm import BYOK_PROVIDERS
from app.config import settings

KEY_HEADER = "x-llm-key"
PROVIDER_HEADER = "x-llm-provider"
MODEL_HEADER = "x-llm-model"
ADMIN_HEADER = "x-admin-token"
BYOK_PATHS = {"/api/ask"}
ALLOWED_HEADERS = ["Content-Type", "X-LLM-Key", "X-LLM-Provider", "X-LLM-Model", "X-Admin-Token"]

_current_secrets: contextvars.ContextVar[tuple[str, ...]] = contextvars.ContextVar("secrets", default=())
_KEY_PATTERNS = [
    re.compile(r"sk-ant-[A-Za-z0-9_\-]{8,}"),
    re.compile(r"sk-[A-Za-z0-9_\-]{8,}"),
    re.compile(r"gsk_[A-Za-z0-9]{8,}"),
    re.compile(r"AIza[0-9A-Za-z_\-]{8,}"),
    re.compile(r"(?i)(bearer\s+)[A-Za-z0-9._\-]{8,}"),
    re.compile(r"(?i)(x-llm-key|x-api-key|x-admin-token|authorization)(['\"]?\s*[:=]\s*['\"]?)[^\s'\",}]+"),
]
REDACTED = "[REDACTED]"


def redact(text: str) -> str:
    out = str(text)
    for s in _current_secrets.get():
        if s:
            out = out.replace(s, REDACTED)
    for p in _KEY_PATTERNS:
        out = p.sub(lambda m: (m.group(1) + (m.group(2) if m.lastindex and m.lastindex >= 2 else "") + REDACTED)
                    if m.lastindex else REDACTED, out)
    return out


class RedactingFilter(logging.Filter):
    """Redacts key-like strings from log records without changing their shape (uvicorn's access formatter unpacks args)."""

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.args, tuple):
            record.args = tuple(redact(a) if isinstance(a, str) else a for a in record.args)
        elif isinstance(record.args, dict):
            record.args = {k: redact(v) if isinstance(v, str) else v for k, v in record.args.items()}
        if isinstance(record.msg, str):
            record.msg = redact(record.msg)
        if record.exc_info:
            # keep the exception type and where it was raised, drop the text (it can carry request data)
            et, _, tb = record.exc_info
            where = ""
            while tb is not None and tb.tb_next is not None:
                tb = tb.tb_next
            if tb is not None:
                where = f" at {tb.tb_frame.f_code.co_filename.rsplit('/', 1)[-1]}:{tb.tb_lineno}"
            record.msg = f"{record.msg} [{et.__name__ if et else 'Exception'}{where}; details suppressed]"
            record.exc_info, record.exc_text = None, None
        return True


def install_log_redaction() -> None:
    f = RedactingFilter()
    for name in ("", "uvicorn", "uvicorn.error", "uvicorn.access", "fastapi", "httpx", "httpcore"):
        lg = logging.getLogger(name)
        if not any(isinstance(x, RedactingFilter) for x in lg.filters):
            lg.addFilter(f)
        for h in lg.handlers:
            if not any(isinstance(x, RedactingFilter) for x in h.filters):
                h.addFilter(f)
    # httpx logs request URLs at INFO; keep it quiet so nothing request-specific reaches the logs
    logging.getLogger("httpx").setLevel(logging.WARNING)


@dataclass(frozen=True)
class BYOK:
    provider: str
    key: str
    model: str | None

    def __repr__(self) -> str:
        return f"BYOK(provider={self.provider!r}, model={self.model!r}, key=[REDACTED])"


_KEY_RE = re.compile(r"^[\x21-\x7e]{16,512}$")
_MODEL_RE = re.compile(r"^[A-Za-z0-9._:\-/]{1,100}$")


def _is_https(request: Request) -> bool:
    proto = request.headers.get("x-forwarded-proto", request.url.scheme).split(",")[0].strip().lower()
    host = (request.client.host if request.client else "") or ""
    return proto == "https" or (not settings.is_production and host in ("127.0.0.1", "::1", "localhost", "testclient"))


def byok_from_request(request: Request) -> BYOK | None:
    key = request.headers.get(KEY_HEADER)
    if not key:
        return None
    key = key.strip()
    _current_secrets.set((*_current_secrets.get(), key))
    provider = (request.headers.get(PROVIDER_HEADER) or "").strip().lower()
    if provider not in BYOK_PROVIDERS:
        raise HTTPException(400, f"X-LLM-Provider must be one of {list(BYOK_PROVIDERS)} when a key is supplied.")
    if not _KEY_RE.match(key):
        raise HTTPException(400, "The supplied API key is not in a valid format (it was not used or stored).")
    if not _is_https(request):
        raise HTTPException(400, "API keys are only accepted over HTTPS (the key was not used or stored).")
    model = (request.headers.get(MODEL_HEADER) or "").strip() or None
    if model and not _MODEL_RE.match(model):
        raise HTTPException(400, "X-LLM-Model contains unsupported characters.")
    return BYOK(provider, key, model)


async def byok_guard(request: Request, call_next):
    """Middleware: refuse the key header outside assistant endpoints; scrub secrets from the request context."""
    token = _current_secrets.set(())
    try:
        if request.headers.get(KEY_HEADER) and request.url.path not in BYOK_PATHS and request.method != "OPTIONS":
            from fastapi.responses import JSONResponse

            return JSONResponse({"detail": "X-LLM-Key is only accepted on the assistant endpoint (POST /api/ask). "
                                           "It was not used or stored."}, status_code=400)
        return await call_next(request)
    finally:
        _current_secrets.reset(token)


def require_admin(request: Request) -> None:
    tok = settings_token()
    if not tok:
        if settings.is_production:
            raise HTTPException(403, "Disabled: ADMIN_TOKEN is not set on this deployment.")
        return
    given = request.headers.get(ADMIN_HEADER) or ""
    if not hmac.compare_digest(given.encode(), tok.encode()):
        raise HTTPException(401, "Admin token required (X-Admin-Token).")


def settings_token() -> str | None:
    from app.ai.registry import state

    return state.cfg.admin_token
