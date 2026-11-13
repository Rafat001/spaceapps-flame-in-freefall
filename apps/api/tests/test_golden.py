"""Golden-question harness (T5). Fixture: tests/fixtures/golden_questions.json."""
import json
import unicodedata
from pathlib import Path

import pytest

GOLD = json.loads((Path(__file__).parent / "fixtures" / "golden_questions.json").read_text())
QS = GOLD["questions"]
LOCATOR_HINTS = ("CSV record", "p. ", "[", "field", "Flight Platform", "hits.total", "totalFileSize", "Research Area", "¶", "section")


def _n(s: str) -> str:
    return unicodedata.normalize("NFKC", s or "").lower()


def check(item: dict, r: dict) -> list[str]:
    errs = []
    ans = _n(r.get("answer") or "")
    if item["type"] == "abstain":
        if r.get("answer_kind") != "abstain":
            errs.append(f"expected abstain, got {r.get('answer_kind')}")
    else:
        if r.get("answer_kind") in (None, "none", "abstain"):
            errs.append(f"expected an answer, got {r.get('answer_kind')}")
        accs = set(r.get("accessions") or [])
        missing_acc = [a for a in item["expected_accessions"] if a not in accs]
        if missing_acc:
            errs.append(f"missing citations for {missing_acc}")
        if not any(any(h in (c.get("locator") or "") for h in LOCATOR_HINTS) for c in r.get("citations") or []):
            errs.append("no row/page/timestamp/field locator")
        if any("CSV record" in (s.get("location") or "") for s in item["source"]) and not any(c.get("rows") for c in r["citations"]):
            errs.append("expected a CSV row citation")
    miss = [m for m in item["must_include"] if _n(m) not in ans]
    if miss:
        errs.append(f"missing {miss}")
    return errs


@pytest.mark.parametrize("item", QS, ids=[q["id"] for q in QS])
def test_golden_structured(client, item):
    r = client.post("/api/qa", json={"question": item["question"]}).json()
    assert check(item, r) == [], (item["id"], r.get("answer"))


@pytest.mark.parametrize("item", [q for q in QS if q.get("coverage_params")], ids=lambda q: q["id"])
def test_golden_coverage_params(client, item):
    out = client.post("/api/coverage", json=item["coverage_params"]).json()
    got = {r["investigation"]["id"] for r in out["results"] if r["verdict"] == "documented_match"}
    assert got == set(item["coverage_expected_matches"]), item["id"]


def test_golden_through_assistant_endpoint(client):
    """The assistant (no LLM) returns the same direct answers and abstentions."""
    for item in QS[:10] + [q for q in QS if q["type"] == "abstain"]:
        r = client.post("/api/ask", json={"question": item["question"]}).json()
        if item["type"] == "abstain":
            assert r["mode"] == "abstained", item["id"]
        else:
            assert r["mode"] == "direct" and r["direct"]["answer_kind"] != "abstain", item["id"]


def test_golden_covers_pdfs_and_transcript():
    srcs = " ".join(s.get("file", "") + " " + s.get("location", "") for q in QS for s in q["source"])
    assert "fact sheet" in srcs.lower() or "saffire.pdf" in srcs
    assert "iss-mini-book" in srcs  # Researcher's Guide
    assert sum(1 for q in QS for s in q["source"] if "transcript" in s.get("file", "")) >= 4


def test_scope_registry_quotes_exist(session):
    from app.qa.core import Ctx
    from app.qa.scope import NOT_IN_PSI

    ctx = Ctx(session)
    for _, src, quote in NOT_IN_PSI:
        assert ctx.find_chunk(src, quote) is not None, quote
