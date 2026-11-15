"""PSI analyzed-data files (PSI-39 CFI summaries, PSI-47 DAFT logs) and the adjacent PSI records (PSI-108, PSI-181)."""
from sqlalchemy import func, select

from app.ingest.analyzed import parse_cfi_summary
from app.models import Chunk, Document, TestRun


def test_cfi_legend_parser_reads_printed_values():
    text = ("Thu, Mar 9, 2017\nFLEX-1206\nF068A03\nP = 771.201 mmHg\nYO2 = 0.210\nYN2 = 0.790\nDodecane\n"
            "D0 = 4.039 mm\nDext = 3.577 mm\nkavg = 0.379 mm\nkavg, cool = 0.385 mm\nDext, cool = 0.497 mm\n")
    s = parse_cfi_summary(text)
    assert (s["flex_number"], s["cir_point"], s["test_date"], s["fuel"]) == ("1206", "F068A03", "2017-03-09", "Dodecane")
    assert s["values_as_printed"] == {"pressure_mmhg": "771.201", "y_o2": "0.210", "y_n2": "0.790", "d0_mm": "4.039",
                                      "dext_mm": "3.577", "kavg_mm2_s": "0.379", "kavg_cool_mm2_s": "0.385", "dext_cool_mm": "0.497"}
    assert s["oxygen_pct"] == 21.0 and abs(s["pressure_kpa"] - 102.82) < 0.01


def test_cfi_summaries_on_detail(client):
    d = client.get("/api/investigations/psi-39").json()["analyzed_data"]
    assert d["kind"] == "cfi_run_summaries" and d["evidence_label"].startswith("Reported by authors")
    rows = {r["id"]: r for r in d["cfi_run_summaries"]}
    assert len(rows) == 30
    final = rows["FLEX-1206_Summary"]
    assert final["kind"] == "summary" and final["values_as_printed"]["kavg_mm2_s"] == "0.379"
    assert [r["csv_record"] for r in final["cfi_table_records"]] == [2]
    assert rows["FLEX-1206_Summary-prelim"]["kind"] == "preliminary"
    assert rows["FLEX-1393_Summary"]["fuel"] == "Farnesane" and rows["FLEX-1393_Summary"]["cfi_table_records"] == []
    bad = [f for f in d["files"] if f["status"] != "parsed"]
    assert [f["short_name"] for f in bad] == ["FLEX-1248_Summary.pdf"] and bad[0]["note"]


def test_daft_logs_on_detail(client):
    d = client.get("/api/investigations/psi-47").json()
    a = d["analyzed_data"]
    assert a["kind"] == "daft_logs" and len(a["files"]) == 12
    keys = {(lg["instrument"], lg["test_id"]) for lg in a["instrument_logs"]}
    assert keys == {(i, t) for i in ("P-Trak", "DustTrak") for t in ("1", "2", "3", "4")}  # de-duplicated across workbooks
    p2 = next(lg for lg in a["instrument_logs"] if lg["instrument"] == "P-Trak" and lg["test_id"] == "2")
    assert p2["units"] == "particles/cc" and p2["n_values"] == 724 and p2["max"] == 45400.0 and len(p2["files"]) == 8
    assert [b["bag"] for b in a["bag_summary"]] == ["Bag #1", "Bag#2", "Bag#3"]
    assert sum(1 for x in d["documents"] if x["type"] == "psi_analyzed_data") == 12


def test_analyzed_chunks_indexed_and_kept_apart(session):
    n = dict(session.execute(select(Chunk.investigation_id, func.count()).where(Chunk.source_type == "psi_analyzed_data")
                             .group_by(Chunk.investigation_id)).all())
    assert n["psi-39"] == 30 and n["psi-47"] >= 9 and set(n) == {"psi-39", "psi-47"}
    c = session.scalars(select(Chunk).where(Chunk.source_type == "psi_analyzed_data", Chunk.section.like("%FLEX-1206%"))).first()
    assert "kavg" in c.text and c.source_url.startswith("https://psi.nasa.gov/geode-py/ws/studies/PSI-39/download")
    assert session.get(Document, c.document_id).type == "psi_analyzed_data"
    # analyzed data never becomes experimental-table rows
    assert session.scalar(select(func.count()).select_from(TestRun)) == 2009


def test_adjacent_records_listed_but_not_counted(client, session):
    o = client.get("/api/nasa/other-experiments").json()
    adj = {r["accession"]: r for r in o["adjacent_psi_records"]}
    assert set(adj) == {"PSI-108", "PSI-181"} and o["adjacent_psi_note"]
    assert all("combustion" in r["why_listed"].lower() for r in adj.values())
    assert adj["PSI-181"]["why_listed"].startswith("(iii)")  # just the clause that mentions combustion
    assert client.get("/api/stats").json()["investigations"] == 24
    assert client.get("/api/investigations/psi-108").status_code == 404
    assert not session.scalars(select(Chunk).where(Chunk.text.like("%PSI-108%") | Chunk.text.like("%PSI-181%"))).first()
