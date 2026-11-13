from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers.api import router
from app.security import ALLOWED_HEADERS, byok_guard, install_log_redaction, redact

install_log_redaction()

app = FastAPI(title="Flame in Freefall API", version="0.1.0",
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
