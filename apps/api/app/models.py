"""Data model (PRD section 8). Numeric conditions live on TestRun, not on Investigation.

Each condition stores: normalised min/max (single values have min == max), the verbatim
source text, what the value refers to (context), approximate flag, parse flags and a
verification_status. A NULL min/max means unknown / Not reported and never passes a filter.
"""
from __future__ import annotations

from sqlalchemy import JSON, Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Investigation(Base):
    __tablename__ = "investigations"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    accession: Mapped[str] = mapped_column(String, index=True)
    acronym: Mapped[str | None] = mapped_column(String)
    title: Mapped[str] = mapped_column(String)
    family: Mapped[str] = mapped_column(String, index=True)
    objective: Mapped[str | None] = mapped_column(Text)
    approach: Mapped[str | None] = mapped_column(Text)
    hypothesis: Mapped[str | None] = mapped_column(Text)
    research_impacts: Mapped[str | None] = mapped_column(Text)
    fuel_class: Mapped[str] = mapped_column(String, index=True)
    fuel_class_basis: Mapped[str | None] = mapped_column(Text)
    fuel_class_note: Mapped[str | None] = mapped_column(Text)
    solid_emulation: Mapped[bool] = mapped_column(Boolean, default=False)
    partial_gravity_mimic: Mapped[bool] = mapped_column(Boolean, default=False)
    hardware: Mapped[str | None] = mapped_column(String)
    hardware_link: Mapped[str | None] = mapped_column(String)
    flight_platform: Mapped[str | None] = mapped_column(String)
    project_type: Mapped[str | None] = mapped_column(String)
    gravity_regime: Mapped[str] = mapped_column(String, default="unknown")
    gravity_regime_basis: Mapped[str | None] = mapped_column(String)
    sub_research_area: Mapped[str | None] = mapped_column(String)
    doi: Mapped[str | None] = mapped_column(String)
    source_url: Mapped[str] = mapped_column(String)
    api_url: Mapped[str | None] = mapped_column(String)
    license: Mapped[str | None] = mapped_column(String)
    release_date: Mapped[str | None] = mapped_column(String)
    investigation_start: Mapped[str | None] = mapped_column(String)
    investigation_end: Mapped[str | None] = mapped_column(String)
    last_checked_at: Mapped[str | None] = mapped_column(String)
    raw_source_path: Mapped[str | None] = mapped_column(String)
    topics: Mapped[dict] = mapped_column(JSON, default=dict)
    measurement_types: Mapped[dict] = mapped_column(JSON, default=dict)
    brief_facts: Mapped[list] = mapped_column(JSON, default=list)
    data_availability: Mapped[dict] = mapped_column(JSON, default=dict)

    documents: Mapped[list["Document"]] = relationship(back_populates="investigation", cascade="all, delete-orphan")
    test_runs: Mapped[list["TestRun"]] = relationship(back_populates="investigation", cascade="all, delete-orphan")


class Document(Base):
    __tablename__ = "documents"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    investigation_id: Mapped[str | None] = mapped_column(ForeignKey("investigations.id"), index=True)
    title: Mapped[str] = mapped_column(Text)
    url: Mapped[str | None] = mapped_column(String)
    doi: Mapped[str | None] = mapped_column(String)
    type: Mapped[str] = mapped_column(String)
    authors: Mapped[str | None] = mapped_column(Text)
    publication_date: Mapped[str | None] = mapped_column(String)
    local_path: Mapped[str | None] = mapped_column(String)
    checksum: Mapped[str | None] = mapped_column(String)
    investigation: Mapped[Investigation | None] = relationship(back_populates="documents")
    chunks: Mapped[list["Chunk"]] = relationship(back_populates="document", cascade="all, delete-orphan")


class Chunk(Base):
    __tablename__ = "chunks"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id"), index=True)
    investigation_id: Mapped[str | None] = mapped_column(String, index=True)
    text: Mapped[str] = mapped_column(Text)
    section: Mapped[str | None] = mapped_column(String)
    page: Mapped[str | None] = mapped_column(String)  # None = not applicable / not reported
    source_url: Mapped[str | None] = mapped_column(String)
    verification_status: Mapped[str] = mapped_column(String)  # psi_metadata | psi_experimental_table | challenge_brief
    embedding_id: Mapped[int | None] = mapped_column(Integer)
    document: Mapped[Document] = relationship(back_populates="chunks")


class TestRun(Base):
    __tablename__ = "test_runs"
    __test__ = False  # not a pytest class
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    investigation_id: Mapped[str] = mapped_column(ForeignKey("investigations.id"), index=True)
    run_label: Mapped[str] = mapped_column(String)
    row_kind: Mapped[str] = mapped_column(String, default="test")  # test | session | test_matrix
    material: Mapped[str | None] = mapped_column(Text)
    sample_geometry: Mapped[str | None] = mapped_column(Text)
    flow_direction: Mapped[str | None] = mapped_column(String)
    gravity_regime: Mapped[str] = mapped_column(String, default="unknown")

    oxygen_pct_min: Mapped[float | None] = mapped_column(Float, index=True)
    oxygen_pct_max: Mapped[float | None] = mapped_column(Float, index=True)
    oxygen_source_text: Mapped[str | None] = mapped_column(String)
    oxygen_context: Mapped[str | None] = mapped_column(String)
    oxygen_meta: Mapped[dict | None] = mapped_column(JSON)

    pressure_kpa_min: Mapped[float | None] = mapped_column(Float, index=True)
    pressure_kpa_max: Mapped[float | None] = mapped_column(Float, index=True)
    pressure_source_text: Mapped[str | None] = mapped_column(String)
    pressure_meta: Mapped[dict | None] = mapped_column(JSON)

    airflow_m_s_min: Mapped[float | None] = mapped_column(Float, index=True)
    airflow_m_s_max: Mapped[float | None] = mapped_column(Float, index=True)
    airflow_source_text: Mapped[str | None] = mapped_column(String)
    airflow_context: Mapped[str | None] = mapped_column(String)
    airflow_meta: Mapped[dict | None] = mapped_column(JSON)

    source_document_id: Mapped[str | None] = mapped_column(String)
    source_row: Mapped[int | None] = mapped_column(Integer)
    verification_status: Mapped[str] = mapped_column(String, default="psi_experimental_table")
    raw: Mapped[dict] = mapped_column(JSON, default=dict)

    investigation: Mapped[Investigation] = relationship(back_populates="test_runs")
    measurements: Mapped[list["Measurement"]] = relationship(back_populates="test_run", cascade="all, delete-orphan")


class Measurement(Base):
    __tablename__ = "measurements"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    test_run_id: Mapped[int] = mapped_column(ForeignKey("test_runs.id"), index=True)
    variable: Mapped[str] = mapped_column(String, index=True)
    value: Mapped[float | None] = mapped_column(Float)
    value_text: Mapped[str | None] = mapped_column(String)
    unit: Mapped[str | None] = mapped_column(String)
    method: Mapped[str | None] = mapped_column(String)
    source_column: Mapped[str | None] = mapped_column(String)
    source_document_id: Mapped[str | None] = mapped_column(String)
    source_page: Mapped[str | None] = mapped_column(String)
    verification_status: Mapped[str] = mapped_column(String)
    test_run: Mapped[TestRun] = relationship(back_populates="measurements")
