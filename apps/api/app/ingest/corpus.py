"""Non-PSI corpus chunks: official documents (page-chunked PDFs, HTML pages) and the guidance-video transcript.

Every chunk carries a citation (source URL + page / paragraph / timestamp) and a provenance block naming the
official resource it comes from. Nothing outside the resources (or their own references) is indexed.
"""
from __future__ import annotations

import re

from app.config import settings
from app.ingest.official_sources import CHALLENGE_RESOURCES_URL, OFFICIAL_DOCS, VIDEO, doc_pages

SOURCE_LABEL = {
    "nasa_program_page": "NASA program page (official resource)",
    "nasa_guide": "NASA Researcher's Guide (official resource)",
    "nasa_fact_sheet": "NASA fact sheet (official resource)",
    "nasa_history": "NASA incident history (official resource)",
    "nasa_spinoff": "NASA Spinoff page (official resource)",
    "guidance_video": "Official guidance video, auto-captions",
}


def doc_provenance(d: dict) -> dict:
    """Provenance block for an OFFICIAL_DOCS entry: the resource itself, or a reference linked from resource #2."""
    if d["source_type"] == "nasa_fact_sheet" or d.get("reference_of"):
        return {"kind": "reference", "resource": d["title"], "resource_url": d["url"],
                "reference_of": d.get("reference_of") or "NASA Combustion Science (resource #2)",
                "parent_url": OFFICIAL_DOCS[0]["url"], "listed_on": CHALLENGE_RESOURCES_URL}
    return {"kind": "resource", "resource": d["title"], "resource_url": d.get("landing") or d["url"],
            "listed_on": CHALLENGE_RESOURCES_URL}


def _norm(t: str) -> str:
    t = t.replace("\u00ad", "").replace("\ufb01", "fi").replace("\ufb02", "fl").replace("\ufb00", "ff")
    t = t.replace("\ufb03", "ffi").replace("\ufb04", "ffl")
    t = re.sub(r"-\n(?=[a-z])", "", t)  # de-hyphenate line breaks
    return re.sub(r"\s+", " ", t).strip()


def _split(t: str, size: int = 900) -> list[str]:
    from app.ingest.load import split_text

    return split_text(t, size=size, overlap=150)


def doc_chunks() -> list[dict]:
    out = []
    for d in OFFICIAL_DOCS:
        prov = doc_provenance(d)
        n = 0
        for page, text in doc_pages(d):
            t = _norm(text)
            if len(t) < 40:
                continue
            parts = _split(t)
            for k, part in enumerate(parts, 1):
                loc = f"p. {page}" if page else f"¶{k}"
                url = f"{d['url']}#page={page}" if page else d["url"]
                out.append({"id": f"doc-{d['id'][:40]}-{n:03d}", "document_id": d["id"], "text": part,
                            "section": d["title"] + (f", page {page}" if page else ""), "page": page, "locator": loc,
                            "source_url": url, "source_type": d["source_type"], "verification_status": d["source_type"],
                            "accessions": d["accessions"], "provenance": prov})
                n += 1
    return out


_TS = re.compile(r"^\[(\d\d):(\d\d)\]\s*(.*)$")


def transcript_chunks(max_chars: int = 350) -> list[dict]:
    path = settings.data_dir / "sources" / "official" / "video" / "transcript.txt"
    lines = path.read_text().splitlines()
    speaker, buf, start, out = None, [], None, []
    prov = {"kind": "resource", "resource": "Official guidance video (supplied by the user as the challenge guide)",
            "resource_url": VIDEO["url"], "note": "YouTube auto-captions"}

    def flush():
        nonlocal buf, start
        if buf:
            mm, ss = start
            secs = int(mm) * 60 + int(ss)
            txt = " ".join(buf)
            out.append({"id": f"video-{len(out):03d}", "document_id": "guidance-video",
                        "text": f"{speaker + ': ' if speaker else ''}{txt}", "section": f"Guidance video [{mm}:{ss}]"
                        + (f" — {speaker}" if speaker else ""), "page": None, "locator": f"[{mm}:{ss}]",
                        "source_url": f"{VIDEO['url']}&t={secs}s", "source_type": "guidance_video",
                        "verification_status": "guidance_video", "accessions": [], "provenance": prov,
                        "timestamp_s": secs})
        buf, start = [], None

    for ln in lines:
        m = _TS.match(ln.strip())
        if not m:
            continue
        mm, ss, body = m.groups()
        if body.endswith(":") and len(body) < 60 and not body.startswith("["):
            flush()
            speaker = body[:-1]
            continue
        if body.startswith("[") and body.endswith("]"):
            continue
        if start is None:
            start = (mm, ss)
        buf.append(body)
        if sum(len(b) for b in buf) > max_chars:
            flush()
    flush()
    return out
