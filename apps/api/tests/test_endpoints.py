"""Smoke test: every read endpoint the web app calls answers 200 with the fields the pages use."""
import logging

import pytest

GETS = ["/api/meta", "/api/stats", "/api/investigations", "/api/investigations/psi-159", "/api/investigations/psi-60",
        "/api/rank?scenario=lunar_habitat", "/api/rank?scenario=lunar_habitat&include_ground=false", "/api/earth",
        "/api/explainer", "/api/lunar/points", "/api/settings/ai", "/api/export.csv?ids=psi-159,psi-68", "/api/health"]


@pytest.mark.parametrize("path", GETS)
def test_get_ok(client, path):
    r = client.get(path)
    assert r.status_code == 200, (path, r.text[:300])


def test_meta_fields(client):
    m = client.get("/api/meta").json()
    assert m["counts"]["investigations"] == 24 and m["counts"]["test_runs"] == 1982
    assert m["catalog_stats"]["as_of"] and m["lenses"] and m["platforms"]


def test_cors_allows_web_origin(client):
    r = client.get("/api/meta", headers={"Origin": "http://localhost:3000"})
    assert r.headers.get("access-control-allow-origin") == "http://localhost:3000"


def test_redaction_keeps_uvicorn_access_log_shape():
    from app.security import RedactingFilter

    rec = logging.LogRecord("uvicorn.access", logging.INFO, __file__, 1, '%s - "%s %s HTTP/%s" %d',
                            ("127.0.0.1:1", "GET", "/api/ask?k=sk-proj-abcdefghijklmnopqrstuvwx", "1.1", 200), None)
    RedactingFilter().filter(rec)
    assert isinstance(rec.args, tuple) and len(rec.args) == 5
    assert "abcdefghijklmnop" not in rec.getMessage()


def test_modeling_export_has_every_countable_row(client):
    import csv
    import io

    r = client.get("/api/export/modeling.csv")
    assert r.status_code == 200
    rows = list(csv.DictReader(io.StringIO(r.text)))
    assert len(rows) == 1982
    assert all(x["source_row"] and x["accession"] for x in rows)
    d = client.get("/api/export/dictionary").json()["columns"]
    assert [c["name"] for c in d] == list(rows[0].keys())
    lunar = [x for x in rows if x["oxygen_pct_max"] and x["pressure_kpa_min"]
             and float(x["oxygen_pct_max"]) >= 30 and float(x["pressure_kpa_min"]) <= 10.2 * 6.894757]
    assert len(lunar) == 74
