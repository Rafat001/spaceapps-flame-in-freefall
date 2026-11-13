from __future__ import annotations

import csv
import io
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.ai.registry import state
from app.db import get_session
from app.labels import NOT_CERTIFICATION, PARTIAL_GRAVITY_WARNING, RELEVANCE_DISCLAIMER
from app.models import Chunk, Investigation, Measurement, TestRun
from app.scenarios import REFERENCE_ATMOSPHERES, SCENARIOS
from app.services import ask as ask_svc
from app.services import catalog, compare as compare_svc, coverage as coverage_svc, ranking
from app.services.serialize import inv_card, inv_detail
from app.units import to_kpa, to_m_s

router = APIRouter(prefix="/api")

PressureUnit = Literal["kPa", "psi", "atm", "bar", "mmHg"]
FlowUnit = Literal["m/s", "cm/s", "mm/s"]


@router.get("/health")
def health(s: Session = Depends(get_session)):
    n = s.scalar(select(func.count()).select_from(Investigation)) or 0
    return {"ok": True, "investigations": n, "ai": state.status(),
            "notices": [NOT_CERTIFICATION, PARTIAL_GRAVITY_WARNING]}


def _seed_stats() -> dict:
    import json

    from app.config import settings

    p = settings.data_dir / "seed" / "investigations.v2.json"
    d = json.loads(p.read_text())
    return {"catalog": d.get("catalog_stats"), "seed_version": d.get("seed_version"),
            "accessed_at": d.get("psi_accessed_at"), "partial_gravity_gap": d.get("partial_gravity_gap")}


@router.get("/stats")
def stats(s: Session = Depends(get_session)):
    """Catalog statistics computed from the saved PSI records (with as-of dates); nothing hard-coded."""
    from app.ingest.table_specs import COUNTABLE_KINDS

    seed = _seed_stats()
    invs = s.scalars(select(Investigation)).all()
    by_kind = dict(s.execute(select(TestRun.row_kind, func.count()).group_by(TestRun.row_kind)).all())
    by_src = dict(s.execute(select(Chunk.source_type, func.count()).group_by(Chunk.source_type)).all())
    return {**seed, "investigations": len(invs), "ground": sum(1 for i in invs if i.is_ground),
            "microgravity": sum(1 for i in invs if not i.is_ground),
            "countable_rows": sum(v for k, v in by_kind.items() if k in COUNTABLE_KINDS), "rows_by_kind": by_kind,
            "chunks_by_source_type": by_src, "chunks": sum(by_src.values())}


@router.get("/meta")
def meta(s: Session = Depends(get_session)):
    from app.ingest.table_specs import COUNTABLE_KINDS
    from app.services.lenses import LENS_SOURCE, LENSES

    invs = s.scalars(select(Investigation)).all()
    return {"families": sorted({i.family for i in invs}), "fuel_classes": sorted({i.fuel_class for i in invs}),
            "gravity_regimes": sorted({i.gravity_regime for i in invs}),
            "topics": sorted({t for i in invs for t in i.topics}),
            "measurement_types": sorted({t for i in invs for t in i.measurement_types}),
            "hardware": sorted({i.hardware for i in invs if i.hardware}),
            "platforms": sorted({i.platform for i in invs if i.platform}),
            "lenses": {k: {"label": v["label"], "question": v["question"]} for k, v in LENSES.items()},
            "lens_source": LENS_SOURCE, "catalog_stats": _seed_stats()["catalog"],
            "scenarios": {k: v["label"] for k, v in SCENARIOS.items()}, "reference_atmospheres": REFERENCE_ATMOSPHERES,
            "counts": {"investigations": len(invs), "test_runs": s.query(TestRun).filter(TestRun.row_kind.in_(COUNTABLE_KINDS)).count(),
                       "table_rows": s.query(TestRun).count(),
                       "measurements": s.query(Measurement).count(), "chunks": s.query(Chunk).count()}}


@router.get("/investigations")
def list_investigations(
    q: str | None = None, family: str | None = None, fuel_class: str | None = None, hardware: str | None = None,
    gravity_regime: str | None = None, topic: str | None = None, measurement_type: str | None = None,
    material: str | None = None, platform: str | None = None, lens: str | None = None,
    oxygen_min: float | None = Query(None, ge=0, le=100), oxygen_max: float | None = Query(None, ge=0, le=100),
    pressure_min: float | None = Query(None, ge=0), pressure_max: float | None = Query(None, ge=0),
    pressure_unit: PressureUnit = "kPa",
    airflow_min: float | None = Query(None, ge=0), airflow_max: float | None = Query(None, ge=0), airflow_unit: FlowUnit = "m/s",
    sort: Literal["relevance", "title", "completeness", "accession"] = "relevance",
    scenario: str = "lunar_habitat", page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=100),
    s: Session = Depends(get_session),
):
    invs, text_scores = catalog.search(
        s, q=q, family=family, fuel_class=fuel_class, hardware=hardware, gravity_regime=gravity_regime, topic=topic,
        measurement_type=measurement_type, material=material, platform=platform, lens=lens,
        oxygen=catalog.NumericRange(oxygen_min, oxygen_max),
        pressure=catalog.NumericRange(to_kpa(pressure_min, pressure_unit), to_kpa(pressure_max, pressure_unit)),
        airflow=catalog.NumericRange(to_m_s(airflow_min, airflow_unit), to_m_s(airflow_max, airflow_unit)))
    cards = [inv_card(i) for i in invs]
    if scenario in SCENARIOS:
        scores = {r["investigation"]["id"]: r["score"] for r in ranking.rank(s, scenario, [i.id for i in invs])["results"]}
        for c in cards:
            c["relevance_score"] = scores.get(c["id"])
    if sort == "title":
        cards.sort(key=lambda c: c["title"])
    elif sort == "completeness":
        cards.sort(key=lambda c: (-c["data_completeness"], c["accession"]))
    elif sort == "accession":
        cards.sort(key=lambda c: int(c["accession"].split("-")[1]))
    elif not q:
        cards.sort(key=lambda c: (-(c.get("relevance_score") or 0), c["id"]))
    total = len(cards)
    start = (page - 1) * page_size
    return {"total": total, "page": page, "page_size": page_size, "items": cards[start:start + page_size],
            "applied_filters": {k: v for k, v in dict(q=q, family=family, fuel_class=fuel_class, hardware=hardware,
                                gravity_regime=gravity_regime, topic=topic, measurement_type=measurement_type,
                                material=material, platform=platform, lens=lens, oxygen_min=oxygen_min, oxygen_max=oxygen_max, pressure_min=pressure_min,
                                pressure_max=pressure_max, pressure_unit=pressure_unit if (pressure_min or pressure_max) else None,
                                airflow_min=airflow_min, airflow_max=airflow_max,
                                airflow_unit=airflow_unit if (airflow_min or airflow_max) else None).items() if v is not None},
            "notes": ["Numeric filters use only known, source-backed PSI table values; Not reported values never pass.",
                      "Relevance score = research relevance for the selected scenario, not hazard."]}


@router.get("/investigations/{inv_id}")
def get_investigation(inv_id: str, s: Session = Depends(get_session)):
    inv = s.scalars(select(Investigation).where(Investigation.id == inv_id.lower()).options(
        selectinload(Investigation.test_runs).selectinload(TestRun.measurements),
        selectinload(Investigation.documents))).first()
    if not inv:
        raise HTTPException(404, "Investigation not found")
    return inv_detail(inv)


class CompareIn(BaseModel):
    ids: list[str] = Field(min_length=2, max_length=3)


@router.post("/compare")
def compare(body: CompareIn, s: Session = Depends(get_session)):
    return compare_svc.compare(s, [i.lower() for i in body.ids])


@router.get("/rank")
def rank(scenario: str = "lunar_habitat", lens: str | None = None, include_ground: bool = True,
         s: Session = Depends(get_session)):
    try:
        return ranking.rank(s, scenario, lens=lens, include_ground=include_ground)
    except KeyError:
        raise HTTPException(400, f"Unknown scenario. Options: {sorted(SCENARIOS)}") from None


class CoverageIn(BaseModel):
    fuel_class: str | None = None
    material: str | None = Field(None, max_length=100)
    oxygen_min: float | None = Field(None, ge=0, le=100)
    oxygen_max: float | None = Field(None, ge=0, le=100)
    pressure_min: float | None = Field(None, ge=0)
    pressure_max: float | None = Field(None, ge=0)
    pressure_unit: PressureUnit = "kPa"
    airflow_min: float | None = Field(None, ge=0)
    airflow_max: float | None = Field(None, ge=0)
    airflow_unit: FlowUnit = "m/s"
    gravity_regime: str | None = None
    hardware: str | None = Field(None, max_length=100)
    measurement_type: str | None = None
    family: str | None = None
    application_scenario: str | None = None
    diluent: Literal["He", "CO2", "N2"] | None = None
    platform: str | None = Field(None, max_length=60)
    include_oxidizer_stream: bool = True
    max_runs: int = Field(10, ge=1, le=60)


@router.post("/coverage")
def coverage(body: CoverageIn, s: Session = Depends(get_session)):
    q = coverage_svc.CoverageQuery(**{k: (v or None) if isinstance(v, str) and k not in ("pressure_unit", "airflow_unit") else v
                                      for k, v in body.model_dump().items()})
    out = coverage_svc.coverage(s, q)
    if body.application_scenario in SCENARIOS:
        scores = {r["investigation"]["id"]: r["score"] for r in ranking.rank(s, body.application_scenario)["results"]}
        for r in out["results"]:
            r["relevance_score"] = scores.get(r["investigation"]["id"])
        out["relevance_disclaimer"] = RELEVANCE_DISCLAIMER
    return out


class AskIn(BaseModel):
    question: str = Field(min_length=3, max_length=1000)
    investigation_ids: list[str] | None = None
    k: int = Field(6, ge=1, le=12)


@router.post("/ask")
def ask(body: AskIn, s: Session = Depends(get_session)):
    emb, _ = state.embedder
    return ask_svc.ask(s, body.question, state.llm, emb, state.index, k=body.k,
                       investigation_ids=[i.lower() for i in body.investigation_ids] if body.investigation_ids else None)


@router.get("/settings/ai")
def ai_settings():
    return state.status()


class AISettingsIn(BaseModel):
    ai_llm_provider: Literal["local", "openai", "anthropic", "none"] | None = None
    ai_embedding_provider: Literal["local", "openai", "hash"] | None = None
    ollama_model: str | None = Field(None, max_length=100)
    openai_model: str | None = Field(None, max_length=100)
    anthropic_model: str | None = Field(None, max_length=100)


@router.put("/settings/ai")
def update_ai_settings(body: AISettingsIn):
    """Switch providers/models at runtime (in-memory; .env stays the default). API keys are env-only by design."""
    state.reset(**body.model_dump())
    return state.status()


@router.post("/ingest/rebuild")
def ingest_rebuild():
    """Re-load data/seed/*.json into SQLite and rebuild FTS + vector indexes with the active embedder."""
    from app.ingest.load import load

    info = load()
    state.reset()
    return info


@router.get("/export.csv")
def export_csv(ids: str = Query(..., description="comma-separated investigation ids"), s: Session = Depends(get_session)):
    id_list = [i.strip().lower() for i in ids.split(",") if i.strip()][:20]
    invs = s.scalars(select(Investigation).where(Investigation.id.in_(id_list)).options(
        selectinload(Investigation.test_runs), selectinload(Investigation.documents))).all()
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["accession", "acronym", "title", "family", "fuel_class", "hardware", "gravity_regime",
                "oxygen_pct_range", "pressure_kpa_range", "airflow_m_s_range", "n_test_runs", "source_url", "doi",
                "notes"])
    for inv in invs:
        c = inv_card(inv)["conditions"]
        w.writerow([inv.accession, inv.acronym, inv.title, inv.family, inv.fuel_class, inv.hardware or "Not reported",
                    inv.gravity_regime, c["oxygen"]["display"], c["pressure"]["display"], c["airflow"]["display"],
                    inv_card(inv)["n_test_runs"], inv.source_url, inv.doi or "",
                    "Ranges aggregate PSI table rows; research discovery only, not a safety certification."])
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=flame-in-freefall-export.csv"})
