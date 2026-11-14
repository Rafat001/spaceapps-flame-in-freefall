"""NASA program summaries (Glenn Combustion Science page + fact sheets) and experiments with no PSI data."""
import re

from app.models import Chunk, Investigation
from app.services import nasa_program as N

ALLOWED_KINDS = {"resource", "reference", "user_supplied_guide"}


def check_provenance(p, where):
    assert isinstance(p, dict) and p, f"{where}: missing provenance"
    assert p.get("kind") in ALLOWED_KINDS, f"{where}: bad kind {p.get('kind')}"
    if p["kind"] == "reference":
        assert p.get("reference_of"), f"{where}: reference without parent resource"
    else:
        assert p.get("resource"), f"{where}: no resource named"


CURATED = {"psi-26", "psi-25", "psi-98", "psi-99", "psi-100", "psi-102", "psi-101", "psi-47", "psi-69", "psi-68", "psi-107",
           "psi-106", "psi-20", "psi-21", "psi-22", "psi-10", "psi-23", "psi-159"}
NOT_IN_PSI = {"FM2", "SoFIE", "FLARE", "Saffire-IV", "Saffire-V", "Saffire-VI", "BASS-M", "FLEX-2J", "FLEX-ICE-GA", "LUCI"}


def _cites(d):
    out = []
    if isinstance(d, dict):
        if "citation" in d:
            out.append(d["citation"])
        for v in d.values():
            out += _cites(v)
    elif isinstance(d, list):
        for v in d:
            out += _cites(v)
    return out


def test_every_excerpt_is_verbatim():
    assert N.verify() == []


def test_mapping_targets_existing_investigations(session):
    ids = {i.id for i in session.query(Investigation).all()}
    assert set(N.data()["investigations"]) == CURATED
    assert CURATED <= ids
    for iid, s in N.data()["investigations"].items():
        assert s["facts"], iid
        assert s.get("program") in (None, *N.data()["programs"]), iid


def test_every_summary_item_has_a_citation(client):
    for iid in CURATED:
        d = client.get(f"/api/investigations/{iid}").json()
        p = d["nasa_program"]
        assert p and p["lead"]["quote"] and d["nasa_hint"]["quote"] == p["lead"]["quote"]
        cites = _cites(p)
        assert len(cites) >= 1 + len(p["facts"])
        for c in cites:
            assert c["url"].startswith("https://www.nasa.gov/") or c["url"].startswith("https://www.spaceappschallenge.org/"), c
            assert c["locator"], c
            check_provenance(c["provenance"], iid)
            if c["source_type"] in ("nasa_fact_sheet", "nasa_guide"):
                assert c["locator"].startswith("p. ") and "#page=" in c["url"]


def test_uncovered_investigations_show_nothing(client):
    for iid in ("psi-39", "psi-60", "psi-62", "psi-115", "psi-117", "psi-142"):
        d = client.get(f"/api/investigations/{iid}").json()
        assert d["nasa_program"] is None and d["nasa_hint"] is None


def test_compare_notes_carry_the_psi_value(client):
    d = client.get("/api/investigations/psi-98").json()
    period = [n for n in d["nasa_program"]["notes"] if n["psi_field"] == "investigation_period"][0]
    assert "Mission Completed July 2016" in period["quotes"][0]["quote"]
    assert "2008" in period["psi_value"]
    flex = client.get("/api/investigations/psi-69").json()["nasa_program"]["notes"]
    assert any(n["psi_field"] == "oxygen" and "% O2" in n["psi_value"] for n in flex)


def test_other_experiments_listed_with_citations(client):
    r = client.get("/api/nasa/other-experiments").json()
    acr = {i["acronym"] for i in r["items"]}
    assert NOT_IN_PSI <= acr
    for it in r["items"]:
        assert it["label"] == "Described by NASA; no PSI test data"
        assert it["facts"] and all(f["citation"]["url"].startswith("https://") for f in it["facts"])
        for c in _cites(it):
            check_provenance(c["provenance"], it["id"])


def test_other_experiments_never_counted_or_ranked(client, session):
    names = [e["pattern"] for e in N.not_in_psi_entries() if e["group"] != "facility"]
    invs = session.query(Investigation).all()
    assert len(invs) == 24
    for i in invs:
        for pat in names:
            assert not re.fullmatch(pat, i.acronym or "", re.I), (i.acronym, pat)
    listing = client.get("/api/investigations?page_size=100").json()
    assert listing["total"] == 24
    for scen in client.get("/api/meta").json()["scenarios"]:
        rank = client.get(f"/api/rank?scenario={scen}").json()
        ids = {x["investigation"]["id"] for x in rank["results"]}
        assert ids <= {i.id for i in invs}
    assert client.get("/api/meta").json()["counts"]["investigations"] == 24


def test_chunks_indexed_with_provenance(session):
    chunks = session.query(Chunk).filter(Chunk.id.like("nasa-%")).all()
    linked = {c.investigation_id for c in chunks if c.investigation_id}
    assert linked == CURATED
    x = [c for c in chunks if c.id.startswith("nasa-x-")]
    assert x and all(c.investigation_id is None and "no PSI test data" in c.text for c in x)
    for c in chunks:
        check_provenance(c.provenance, c.id)
        assert c.source_url.startswith("https://") and c.locator


def _qa(client, q):
    return client.post("/api/qa", json={"question": q}).json()


def test_what_is_answers_for_non_psi(client):
    for q, must in [("What is SoFIE?", "Current Combustion Experiments"), ("What is FLARE?", "JAXA"),
                    ("What is FM2?", "first-ever combustion experiment"), ("What is Saffire-V?", "Saffire-V"),
                    ("What is the FLEX-2J experiment?", "JAXA"), ("What is BASS-M?", "44 textile samples")]:
        r = _qa(client, q)
        assert r["answer_kind"] == "direct" and r["intent"] == "nasa_not_in_psi", q
        assert "no PSI test data" in r["answer"] and must in r["answer"], q
        assert r["citations"] and all(c.get("url") for c in r["citations"]), q
        assert r["accessions"] == [], q


def test_data_questions_about_non_psi_abstain(client):
    for q in ("What oxygen levels did Saffire-V test?", "What were the spread rates measured in FM2?", "Show me SoFIE data",
              "What results did FLARE produce?"):
        r = _qa(client, q)
        assert r["answer_kind"] == "abstain", q
        assert "no PSI test data" in r["answer"] or "not in PSI" in r["answer"], q
        assert r["citations"], q


def test_what_is_for_psi_investigation_uses_nasa_text(client):
    r = _qa(client, "What is FLEX-2?")
    assert r["intent"] == "nasa_description" and "PSI-68" in r["answer"] and "mimic real combustor conditions" in r["answer"]
    r = _qa(client, "What is ACME?")
    assert all(a in r["accessions"] for a in ("PSI-10", "PSI-20", "PSI-21", "PSI-22", "PSI-23", "PSI-159"))


def test_common_words_do_not_trigger(client):
    assert N.match_not_in_psi("the flare of a candle in gel and mist") == []
