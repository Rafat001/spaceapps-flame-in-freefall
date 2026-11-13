import pytest
"""Structured QA beyond the golden phrasings: generic intents, citations, flags, no hard-coded numbers."""
import re
from pathlib import Path


def qa(client, q):
    return client.post("/api/qa", json={"question": q}).json()


def test_generic_intents(client):
    r = qa(client, "How many tests are in SPICE?")
    assert r["answer_kind"] == "direct" and "469" in r["answer"] and r["citations"][0]["rows"]
    r = qa(client, "What was the highest air rate in SPICE?")
    assert "85.28" in r["answer"] and "CSV record 139" in r["answer"]
    r = qa(client, "What is the lowest oxygen in BASS-II?")
    assert "13.6" in r["answer"]
    r = qa(client, "What range of pressure did FLEX-2 use?")
    assert "0.5; 1.0" in r["answer"]


def test_unknown_question_returns_none(client):
    assert qa(client, "Tell me a poem about flames")["answer_kind"] == "none"


def test_every_citation_has_provenance_and_locator(client):
    for q in ["What were the conditions and burn times of the two Saffire-I samples?",
              "What caused the 1997 fire aboard Mir and how many crew were aboard?",
              "What does the challenge video ask teams to build?"]:
        r = qa(client, q)
        for c in r["citations"]:
            assert c.get("provenance") and c.get("locator") and c.get("url", "").startswith("https://"), (q, c)


def test_transcript_citations_are_timestamped_and_labelled(client):
    r = qa(client, "How does a candle flame look in microgravity, according to the challenge video?")
    c = r["citations"][0]
    assert c["locator"] == "[02:58]" and "t=178s" in c["url"] and "auto-captions" in c["label"]


def test_no_numeric_literals_in_answer_templates():
    """Recipes compute numbers from data; the only literals allowed are thresholds parsed from the question."""
    src = (Path(__file__).parents[1] / "app" / "qa" / "engine.py").read_text()
    literals = [re.sub(r"\{[^{}]*\}", "", m) for m in re.findall(r'f"([^"\n]*)"', src)]
    bad = [n for lit in literals for n in re.findall(r"\b\d{2,}\b", re.sub(r"PSI-\d+", "", lit))]
    assert not bad, bad


@pytest.mark.parametrize("q,expect", [
    ("How many tests in ACME CFI-G meet the lunar target of at least 30% oxygen at or below 10.2 psi?",
     "ACME CFI-G: 48 row(s) meet all limits on the same row (20 normal flames, 28 inverse flames)"),
    ("Which investigations have rows with at least 30% oxygen at or below 527.49 mmHg?", "FLEX-2: 8 row(s)"),
    ("Did FLEX test at least 30% O2 below 10.2 psi?", "FLEX: no row meets all limits on the same row. Closest: CSV record 38"),
])
def test_threshold_phrasings_route_to_coverage(session, q, expect):
    from app.qa.engine import answer

    a = answer(session, q)
    assert a and expect in a["answer"], a and a["answer"]
    assert a["citations"]


def test_multi_table_rows_cited_per_file(session):
    from app.qa.engine import answer

    a = answer(session, "How many tests in ACME CFI-G meet the lunar target of at least 30% oxygen at or below 10.2 psi?")
    files = {c["file"]: len(c["rows"]) for c in a["citations"] if c.get("rows")}
    assert files == {"PSI-159_Experimental table_CFI-G_Inverse Flames.csv": 28, "PSI-159_Experimental table_CFI-G_Normal Flames.csv": 20}
