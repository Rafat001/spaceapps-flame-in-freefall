from __future__ import annotations

import logging
import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers.api import router
from app.security import ALLOWED_HEADERS, byok_guard, install_log_redaction, redact

install_log_redaction()


def warm_caches() -> None:
    """Build the catalog snapshot, rankings, cards, /api/meta and the search indexes once at boot, so the first
    Explorer search after a (cold) start does not pay for them. Best effort: a failure only means a slower first call."""
    try:
        from app.ai.registry import state
        from app.db import SessionLocal
        from app.routers import api as routes
        from app.scenarios import SCENARIOS
        from app.services import ranking, snapshot
        from app.services.serialize import inv_card

        state.embedder, state.index  # noqa: B018 - load the embedder and vector index
        with SessionLocal() as s:
            invs = snapshot.investigations(s)
            for i in invs.values():
                snapshot.memo(("card", i.id), lambda i=i: inv_card(i))
            for sc in SCENARIOS:
                ranking.rank(s, sc)
            routes.meta(s)
    except Exception as e:  # noqa: BLE001
        logging.getLogger("app").warning("cache warm-up skipped: %s", type(e).__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    threading.Thread(target=warm_caches, name="warm-caches", daemon=True).start()
    yield


app = FastAPI(title="Flame in Freefall API", version="0.1.0", lifespan=lifespan,
              description="Research discovery over NASA PSI microgravity combustion investigations. Not a safety authority. "
                          "An independent team project for the 2026 NASA Space Apps Challenge; not affiliated with or endorsed by NASA.")
app.middleware("http")(byok_guard)
app.add_middleware(CORSMiddleware, allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
                   allow_methods=["GET", "POST", "PUT", "OPTIONS"], allow_headers=ALLOWED_HEADERS)


@app.exception_handler(Exception)
async def _unhandled(request: Request, exc: Exception):
    logging.getLogger("app").error(redact(f"Unhandled {type(exc).__name__} on {request.method} {request.url.path}"))
    return JSONResponse({"detail": "Internal error (details withheld)."}, status_code=500)
app.include_router(router)


@app.get("/")
def root():
    return {"name": "Flame in Freefall API", "docs": "/docs", "health": "/api/health"}
