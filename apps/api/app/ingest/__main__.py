import sys

from app.runtime_compat import configure_native_threads

configure_native_threads()


def _prebuilt_ok() -> bool:
    """True when the database and vector index baked into the image are present and were built with the embedder
    this process will use (so boot can skip re-ingesting)."""
    try:
        import json

        from sqlalchemy import create_engine, text

        from app.ai.providers.embeddings import get_embedder
        from app.config import settings

        meta = json.loads((settings.index_dir / "meta.json").read_text())
        with create_engine(settings.db_url).connect() as c:
            n = c.execute(text("SELECT count(*) FROM investigations")).scalar() or 0
        emb, _ = get_embedder(settings)
        return n > 0 and meta.get("signature") == emb.signature
    except Exception:  # noqa: BLE001 - anything missing or different: rebuild
        return False


if "--if-needed" in sys.argv and _prebuilt_ok():
    print("Prebuilt catalog and index match this configuration; skipping ingest.")
else:
    from app.ingest.load import main

    main()
