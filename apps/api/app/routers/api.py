from __future__ import annotations

import csv
import io
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.ai.registry import state
from app.security import require_admin
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
            "lenses": {k: {"label": v["label"]} for k, v in LENSES.items()},
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
    sort: Literal["relevance", "match", "title", "completeness", "accession"] = "relevance",
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
    scenario_label, ranked_total = None, 0
    if scenario in SCENARIOS:
        ranked = ranking.rank(s, scenario)  # rank against the whole catalog so "#n" means the same on every page
        scenario_label, ranked_total = ranked["scenario_label"], len(ranked["results"])
        by_id = {r["investigation"]["id"]: r for r in ranked["results"]}
        for c in cards:
            r = by_id.get(c["id"])
            c["relevance_score"] = r["score"] if r else None
            c["relevance_rank"] = r["rank"] if r else None
            c["relevance_tier"] = r["tier"] if r else None
    if sort == "title":
        cards.sort(key=lambda c: c["title"])
    elif sort == "completeness":
        cards.sort(key=lambda c: (-c["data_completeness"], c["accession"]))
    elif sort == "accession":
        cards.sort(key=lambda c: int(c["accession"].split("-")[1]))
    elif sort == "match":
        pass  # keep full-text (BM25) order from catalog.search
    else:
        # Same order as the scenario ranking: same-row target matches first, then weighted score.
        # An exact ID / acronym hit from the search box is always listed first.
        cards.sort(key=lambda c: (0 if text_scores.get(c["id"], 0) >= catalog.EXACT_MATCH else 1,
                                  c.get("relevance_rank") or 10_000, c["id"]))
    total = len(cards)
    start = (page - 1) * page_size
    return {"total": total, "page": page, "page_size": page_size, "items": cards[start:start + page_size],
            "sort": sort, "scenario": scenario, "scenario_label": scenario_label,
            "ranked_total": ranked_total,
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


@router.get("/investigations/{inv_id}/overview")
def investigation_overview(inv_id: str, request: Request, q: str | None = Query(None, max_length=400),
                           s: Session = Depends(get_session)):
    """AI overview of all work done in this investigation, optionally scoped to a search query.

    Uses the existing ask service with the investigation scoped so the LLM synthesises
    what this record contributes in relation to the query (e.g. 'Heat Release Rate').
    Falls back to a templated answer when no LLM is configured.
    """
    from app.ai.providers.llm import build_byok_llm, GROQ_FREE_MODELS
    from app.security import byok_from_request

    inv_id_lower = inv_id.lower()
    inv = s.scalars(select(Investigation).where(Investigation.id == inv_id_lower)).first()
    if not inv:
        raise HTTPException(404, "Investigation not found")

    # Build a focused question: if the caller passes a search query, incorporate it;
    # otherwise generate a general overview of the investigation.
    if q and q.strip():
        question = (
            f"Summarise all work done in the {inv.acronym} investigation ({inv.title}) "
            f"that is relevant to '{q.strip()}'. "
            "Cover the objectives, experimental conditions, key findings, and measurement types "
            "reported for this topic. Cite every claim with [S#]."
        )
    else:
        question = (
            f"Provide an overview of the {inv.acronym} investigation ({inv.title}): "
            "what were the objectives, experimental conditions, key findings and measurement types? "
            "Cite every claim with [S#]."
        )

    emb, _ = state.embedder
    byok = byok_from_request(request) if request else None
    if byok:
        try:
            llm = build_byok_llm(state.cfg, byok.provider, byok.key, byok.model)
        except ValueError:
            raise HTTPException(400, f"Model not allowed for {byok.provider}. Free Groq models: {', '.join(GROQ_FREE_MODELS)}.") from None
    else:
        llm = state.llm

    result = ask_svc.ask(
        s, question, llm, emb, state.index,
        k=8,
        investigation_ids=[inv_id_lower],
    )
    return {
        "investigation_id": inv_id_lower,
        "acronym": inv.acronym,
        "title": inv.title,
        "query": q or None,
        **result,
    }


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
def ask(body: AskIn, request: Request, s: Session = Depends(get_session)):
    """Assistant. Optional BYOK headers (X-LLM-Provider, X-LLM-Key, X-LLM-Model) are used for this request only."""
    from app.ai.providers.llm import build_byok_llm
    from app.security import byok_from_request

    from app.ai.providers.llm import GROQ_FREE_MODELS, QuotaGuardLLM
    from app.ratelimit import allow, client_ip

    emb, _ = state.embedder
    byok = byok_from_request(request)
    ip = client_ip(request)
    if byok:
        try:
            llm = build_byok_llm(state.cfg, byok.provider, byok.key, byok.model)
        except ValueError:
            raise HTTPException(400, f"Model not allowed for {byok.provider}. Free Groq models: {', '.join(GROQ_FREE_MODELS)}. "
                                     "The key was not used or stored.") from None
    else:
        llm = state.llm
        if _server_ai_on():
            c = state.cfg
            llm = QuotaGuardLLM(llm, lambda: allow(ip, c.ask_rate_per_min, c.ask_rate_per_day, c.ask_global_per_min, c.ask_global_per_day))
    out = ask_svc.ask(s, body.question, llm, emb, state.index, k=body.k,
                      investigation_ids=[i.lower() for i in body.investigation_ids] if body.investigation_ids else None)
    out["quota"] = {"own_key": True, "message": "Using your own key: no site limit applies."} if byok else _quota(ip)
    return out


def _server_ai_on() -> bool:
    llm = state.llm
    return llm.name not in ("none", "local") and bool(llm.health().get("ok"))


def _quota(ip: str) -> dict:
    from app.ratelimit import peek

    c = state.cfg
    on = _server_ai_on()
    q = peek(ip, c.ask_rate_per_min, c.ask_rate_per_day, c.ask_global_per_min, c.ask_global_per_day)
    llm = state.llm
    return {"own_key": False, "server_ai": on, "provider": llm.name if on else None, "model": llm.model if on else None,
            "server_key_configured": bool(getattr(llm, "_key", None)) and llm.name != "none",
            "you": q["you"], "site": q["site"], "now": q["now"],
            "counts": "Only AI summaries made with the shared server key count. Computed answers and citations are unlimited.",
            "settings_path": "/settings"}


@router.get("/ask/quota")
def ask_quota(request: Request):
    """Read-only: the caller's and the site's remaining server-key AI answers. Does not consume quota."""
    from app.ratelimit import client_ip

    return _quota(client_ip(request))


@router.get("/earth")
def earth(s: Session = Depends(get_session)):
    from app.services.earth import earth_panel

    return earth_panel(s)


@router.get("/nasa/other-experiments")
def nasa_other_experiments(s: Session = Depends(get_session)):
    """Experiments and facilities the official resources describe that have no PSI Combustion Science record.
    Never counted, filtered or ranked."""
    from app.services.nasa_program import other_experiments

    return other_experiments(s)


@router.get("/explainer")
def explainer(s: Session = Depends(get_session)):
    from app.services.earth import explainer as ex

    return {"items": ex(s), "note": "Quotes from the official challenge resources only."}


@router.get("/lunar/points")
def lunar_points(s: Session = Depends(get_session)):
    """Every countable row with known O2 and pressure, for the O2-vs-pressure chart with the lunar target box."""
    from app.ingest.table_specs import COUNTABLE_KINDS

    atm = SCENARIOS["lunar_habitat"]["atmosphere"]
    rows = s.execute(select(TestRun.investigation_id, TestRun.source_row, TestRun.subtable, TestRun.oxygen_pct_min,
                            TestRun.oxygen_pct_max, TestRun.pressure_kpa_min, TestRun.pressure_kpa_max, TestRun.oxygen_is_stream,
                            TestRun.row_kind).where(TestRun.row_kind.in_(COUNTABLE_KINDS), TestRun.oxygen_pct_max.is_not(None),
                                                    TestRun.pressure_kpa_min.is_not(None))).all()
    acr = dict(s.execute(select(Investigation.id, Investigation.acronym)).all())
    pts = [{"investigation_id": r[0], "acronym": acr.get(r[0]), "row": r[1], "subtable": r[2], "o2_min": r[3], "o2_max": r[4],
            "p_min": r[5], "p_max": r[6], "stream": bool(r[7]), "matrix": r[8] == "test_matrix",
            "in_target": r[4] >= atm["oxygen_pct_min"] and r[5] <= atm["pressure_kpa_max"]} for r in rows]
    return {"target": atm, "points": pts, "n": len(pts),
            "note": "Range rows (sessions, test matrix) are drawn at their extremes. Unknown values are not drawn."}


class QAIn(BaseModel):
    question: str = Field(min_length=3, max_length=1000)


@router.post("/qa")
def qa(body: QAIn, s: Session = Depends(get_session)):
    """Structured answer only (no retrieval, no LLM). Returns answer_kind 'none' when no computed answer applies."""
    from app.qa.engine import answer

    out = answer(s, body.question)
    return out or {"question": body.question.strip(), "answer_kind": "none", "answer": None, "citations": [],
                   "message": "No computed answer for this question; use /api/ask for retrieval over the official sources."}


@router.get("/settings/ai")
def ai_settings():
    return state.status()


class AISettingsIn(BaseModel):
    ai_llm_provider: Literal["local", "openai", "anthropic", "groq", "none"] | None = None
    ai_embedding_provider: Literal["local", "openai", "hash"] | None = None
    ollama_model: str | None = Field(None, max_length=100)
    openai_model: str | None = Field(None, max_length=100)
    anthropic_model: str | None = Field(None, max_length=100)
    groq_model: str | None = Field(None, max_length=100)


@router.put("/settings/ai", dependencies=[Depends(require_admin)])
def update_ai_settings(body: AISettingsIn):
    """Switch providers/models at runtime (in-memory; .env stays the default). API keys are env-only by design."""
    from app.ai.providers.llm import GROQ_FREE_MODELS

    if body.groq_model and body.groq_model not in GROQ_FREE_MODELS:
        raise HTTPException(400, f"groq_model must be a free-plan model: {', '.join(GROQ_FREE_MODELS)}")
    state.reset(**body.model_dump())
    return state.status()


@router.post("/ingest/rebuild", dependencies=[Depends(require_admin)])
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


MODELING_DICTIONARY = [
    ("accession", "PSI accession (e.g. PSI-159)", ""), ("acronym", "Investigation acronym", ""),
    ("platform", "Platform as listed in the PSI record", ""), ("is_ground", "Ground lab / modeling study (true) or flight", ""),
    ("subtable", "Experimental table within the investigation", ""), ("row_kind", "test | session | test_matrix (only countable rows exported)", ""),
    ("source_file", "PSI experimental table CSV file", ""), ("source_row", "CSV record number in that file (1 = first data record)", ""),
    ("material", "Material / fuel as written in PSI", ""), ("material_normalized", "Curator alias for material (rule-based)", ""),
    ("oxygen_pct_min", "Oxygen, lower bound of the row", "% by volume"), ("oxygen_pct_max", "Oxygen, upper bound of the row", "% by volume"),
    ("oxygen_is_stream", "O2 is the burner oxidizer stream (inverse flames), not ambient (decision D5)", ""),
    ("oxygen_source_text", "Oxygen cell verbatim", ""),
    ("pressure_kpa_min", "Pressure, lower bound", "kPa"), ("pressure_kpa_max", "Pressure, upper bound", "kPa"),
    ("pressure_source_text", "Pressure cell verbatim", ""),
    ("airflow_m_s_min", "Air / oxidizer flow speed, lower bound", "m/s"), ("airflow_m_s_max", "Air / oxidizer flow speed, upper bound", "m/s"),
    ("airflow_source_text", "Flow cell verbatim", ""), ("diluents", "Diluent mole fractions where the table lists them", "JSON"),
    ("flags", "Data-quality flags; values are never silently corrected (decision D4)", "; separated"),
    ("source_url", "PSI record URL", ""),
]


@router.get("/export/modeling.csv")
def export_modeling(s: Session = Depends(get_session)):
    """T8: every countable PSI table row with SI-normalised numbers, verbatim cells, flags and source row (data dictionary below)."""
    import json as _json

    from app.ingest.table_specs import COUNTABLE_KINDS

    invs = {i.id: i for i in s.scalars(select(Investigation)).all()}
    runs = s.scalars(select(TestRun).where(TestRun.row_kind.in_(COUNTABLE_KINDS))
                     .order_by(TestRun.investigation_id, TestRun.source_file, TestRun.source_row)).all()
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow([k for k, _, _ in MODELING_DICTIONARY])
    for r in runs:
        inv = invs[r.investigation_id]
        vals = {"accession": inv.accession, "acronym": inv.acronym, "platform": inv.platform, "is_ground": inv.is_ground,
                "diluents": _json.dumps(r.diluents or {}, sort_keys=True) if r.diluents else "",
                "flags": "; ".join(f if isinstance(f, str) else f.get("code", str(f)) for f in (r.flags or [])),
                "source_url": inv.source_url}
        w.writerow([vals[k] if k in vals else ("" if getattr(r, k) is None else getattr(r, k)) for k, _, _ in MODELING_DICTIONARY])
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=flame-in-freefall-modeling.csv"})


@router.get("/export/dictionary")
def export_dictionary():
    return {"columns": [{"name": k, "description": d, "unit": u} for k, d, u in MODELING_DICTIONARY],
            "note": "Rows are PSI experimental-table rows (row kinds test, session, test_matrix). Notes, pre-test and continuation rows "
                    "are excluded. Unknown values are blank, never guessed. Research discovery only, not a safety certification."}
