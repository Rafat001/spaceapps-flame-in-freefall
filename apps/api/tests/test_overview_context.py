"""Dataset + publication context fed to the overview and Ask answers."""
from app.services.overview_context import context_citations


def test_flex2_context_has_dataset_and_publications(session):
    cites = context_citations(session, ["psi-68"], "droplet diameter")
    kinds = {c["source_type"]: c for c in cites}
    assert set(kinds) == {"psi_experimental_table", "psi_publication_listing"}
    assert "Initial Droplet Diameter" in kinds["psi_experimental_table"]["excerpt"]
    pubs = kinds["psi_publication_listing"]["excerpt"]
    assert "publications are listed" in pubs and "Initial Diameter Effects" in pubs
    assert all(c["investigation_id"] == "psi-68" and c["source_url"] for c in cites)


def test_context_unknown_investigation_is_empty(session):
    assert context_citations(session, ["nope"], "anything") == []


def test_ask_includes_context_for_named_investigation(session):
    from app.services import ask as ask_svc

    class NoLLM:
        def health(self):
            return {"ok": False, "message": "none"}

    out = ask_svc.ask(session, "What publications and data exist for FLEX-2 on extinction?", NoLLM(), None, None)
    types = {c["source_type"] for c in out["citations"]}
    assert "psi_publication_listing" in types
    refs = [c["ref"] for c in out["citations"]]
    assert refs == [f"S{i}" for i in range(1, len(refs) + 1)]
