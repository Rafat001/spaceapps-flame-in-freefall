"""Explorer 'most relevant first' must follow the scenario ranking order, with or without a text query."""


def _ranks(client, **params):
    r = client.get("/api/investigations", params={"page_size": 100, **params})
    assert r.status_code == 200
    body = r.json()
    return [c["relevance_rank"] for c in body["items"] if c.get("relevance_rank")], body


def test_default_sort_follows_ranking(client):
    ranks, body = _ranks(client)
    assert ranks == sorted(ranks) and ranks[0] == 1
    assert body["sort"] == "relevance" and body["ranked_total"] >= len(ranks)
    lunar = client.get("/api/rank", params={"scenario": "lunar_habitat"}).json()["results"]
    assert [c["id"] for c in body["items"] if c.get("relevance_rank")][:5] == [r["investigation"]["id"] for r in lunar][:5]


def test_text_query_still_sorted_by_relevance(client):
    ranks, _ = _ranks(client, q="flame")
    assert ranks == sorted(ranks)


def test_accession_query_is_exact_lookup(client):
    for q in ("PSI 10", "psi-10", "PSI10"):
        items = client.get("/api/investigations", params={"q": q}).json()["items"]
        assert [c["accession"] for c in items] == ["PSI-10"], q


def test_exact_acronym_listed_first(client):
    items = client.get("/api/investigations", params={"q": "FLEX-2"}).json()["items"]
    assert items[0]["acronym"] == "FLEX-2"
