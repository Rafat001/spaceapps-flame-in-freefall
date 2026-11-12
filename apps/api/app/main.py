from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers.api import router

app = FastAPI(title="Flame in Freefall API", version="0.1.0",
              description="Research discovery over NASA PSI microgravity combustion investigations. Not a safety authority. "
                          "An independent team project for the 2026 NASA Space Apps Challenge; not affiliated with or endorsed by NASA.")
app.add_middleware(CORSMiddleware, allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
                   allow_methods=["GET", "POST", "PUT"], allow_headers=["*"])
app.include_router(router)


@app.get("/")
def root():
    return {"name": "Flame in Freefall API", "docs": "/docs", "health": "/api/health"}
