"""Registry of the official challenge resources saved under data/sources/official/.

The challenge "Resources" tab (captured 2026-11-13, America/New_York) lists 11 NASA links. Only the PSI
repository is a dataset; the rest are context documents. Each entry below points at an unchanged local copy.
Run `python -m app.ingest.official_sources` to (re)write data/sources/official/MANIFEST.md with SHA-256 sums.
"""
from __future__ import annotations

import hashlib
from pathlib import Path

from app.config import settings

ACCESSED = "2026-11-13"
CHALLENGE_RESOURCES_URL = "https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/?tab=resources"
VIDEO_URL = "https://www.youtube.com/watch?v=AVuEiKxOpc0"

_FS = "https://www.nasa.gov/wp-content/uploads/2025/07/"
GUIDE_PDF = "np-2015-10-034-jsc_combustion_in_reduced_gravity-iss-mini-book-011116-508"

# kind: html page (text extracted to text/<id>.txt) or pdf (per-page text in pdf_pages/<id>/pN.txt)
# source_type drives labels in the UI. accessions = PSI investigations the document is about (by acronym in title).
OFFICIAL_DOCS: list[dict] = [
    {"id": "nasa_combustion_science", "title": "NASA Combustion Science (Glenn Research Center)", "kind": "html",
     "source_type": "nasa_program_page", "url": "https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/",
     "accessions": []},
    {"id": GUIDE_PDF, "title": "A Researcher's Guide to International Space Station Combustion Science (NP-2015-10-034-JSC)",
     "kind": "pdf", "source_type": "nasa_guide", "url": f"https://www.nasa.gov/wp-content/uploads/2016/05/{GUIDE_PDF}.pdf",
     "landing": "https://www.nasa.gov/missions/station/a-researchers-guide-to-combustion-science/", "accessions": []},
    {"id": "advanced-combustion-via-microgravity-experiments-acme", "title": "ACME fact sheet (NASA GRC)", "kind": "pdf",
     "source_type": "nasa_fact_sheet", "url": _FS + "advanced-combustion-via-microgravity-experiments-acme.pdf",
     "accessions": ["PSI-10", "PSI-20", "PSI-21", "PSI-22", "PSI-23", "PSI-159"]},
    {"id": "burning-and-suppression-of-solids-bass", "title": "BASS fact sheet (NASA GRC)", "kind": "pdf",
     "source_type": "nasa_fact_sheet", "url": _FS + "burning-and-suppression-of-solids-bass.pdf", "accessions": ["PSI-26", "PSI-25"]},
    {"id": "dust-and-aerosol-measurement-feasibility-test-daft", "title": "DAFT fact sheet (NASA GRC)", "kind": "pdf",
     "source_type": "nasa_fact_sheet", "url": _FS + "dust-and-aerosol-measurement-feasibility-test-daft.pdf", "accessions": ["PSI-47"]},
    {"id": "flame-extinguishment-experiment-flex", "title": "FLEX fact sheet (NASA GRC)", "kind": "pdf",
     "source_type": "nasa_fact_sheet", "url": _FS + "flame-extinguishment-experiment-flex.pdf", "accessions": ["PSI-69", "PSI-68"]},
    {"id": "smoke-aerosol-measurement-experiment-same", "title": "SAME fact sheet (NASA GRC)", "kind": "pdf",
     "source_type": "nasa_fact_sheet", "url": _FS + "smoke-aerosol-measurement-experiment-same.pdf", "accessions": ["PSI-102", "PSI-101"]},
    {"id": "smoke-point-in-co-flow-experiment-spice", "title": "SPICE fact sheet (NASA GRC)", "kind": "pdf",
     "source_type": "nasa_fact_sheet", "url": _FS + "smoke-point-in-co-flow-experiment-spice.pdf", "accessions": ["PSI-107"]},
    {"id": "spacecraft-fire-safety-demonstration-saffire", "title": "Saffire fact sheet (NASA GRC)", "kind": "pdf",
     "source_type": "nasa_fact_sheet", "url": _FS + "spacecraft-fire-safety-demonstration-saffire.pdf",
     "accessions": ["PSI-98", "PSI-99", "PSI-100"]},
    {"id": "structure-liftoff-in-combustion-experiment-slice", "title": "SLICE fact sheet (NASA GRC)", "kind": "pdf",
     "source_type": "nasa_fact_sheet", "url": _FS + "structure-liftoff-in-combustion-experiment-slice.pdf", "accessions": ["PSI-106"]},
    {"id": "apollo1", "title": "Apollo 1 (NASA OSMA lessons learned)", "kind": "html", "source_type": "nasa_history",
     "url": "https://sma.nasa.gov/sma-disciplines/accllp/apollo-1", "accessions": []},
    {"id": "apollo13", "title": "Apollo 13 (NASA OSMA lessons learned)", "kind": "html", "source_type": "nasa_history",
     "url": "https://sma.nasa.gov/sma-disciplines/accllp/apollo-13", "accessions": []},
    {"id": "mir_fire", "title": "25 Years Ago: Fire Aboard Space Station Mir (NASA History)", "kind": "html",
     "source_type": "nasa_history", "url": "https://www.nasa.gov/history/25-years-ago-fire-aboard-space-station-mir/", "accessions": []},
    {"id": "spinoff_air_tanks", "title": "Fireman's Air Tanks (NASA Spinoff)", "kind": "html", "source_type": "nasa_spinoff",
     "url": "https://spinoff.nasa.gov/node/9582", "accessions": []},
    {"id": "spinoff_fire_detector", "title": "Fire Detector (NASA Spinoff)", "kind": "html", "source_type": "nasa_spinoff",
     "url": "https://spinoff.nasa.gov/node/9407", "accessions": []},
    {"id": "spinoff_fire_attire", "title": "New Technology for the Fire Attire (NASA Spinoff)", "kind": "html",
     "source_type": "nasa_spinoff", "url": "https://spinoff.nasa.gov/node/9918", "accessions": []},
]

LINK_ONLY = [
    {"title": "NASA ScienceCasts: The Power of Studying Combustion on the ISS", "url": "https://www.youtube.com/watch?v=W1oXykoz9zg",
     "note": "Video, 219 s, published 2018-03-13. Link only (not ingested)."},
    {"title": "PSI Data Repository: Combustion Science", "url": "https://psi.nasa.gov/physci/repo/search?q=combustion",
     "note": "Dataset. Records + experimental tables ingested from data/sources/psi/; raw zip/video archives are linked, never copied."},
]

VIDEO = {"title": "2026 Challenge | Flame in Freefall: SI-Powered Fire Safety Insights from Microgravity Combustion",
         "url": VIDEO_URL, "uploader": "NASA Space Apps Challenge", "uploaded": "2026-11-10", "duration": "8:39",
         "transcript": "data/sources/official/video/transcript.txt",
         "note": "YouTube auto-captions (no manual subtitles); names are spelled as captioned. Video file not stored."}


def official_dir() -> Path:
    return settings.data_dir / "sources" / "official"


def doc_pages(doc: dict) -> list[tuple[str | None, str]]:
    """[(page, text)] for a registry entry. HTML pages have page None."""
    base = official_dir()
    if doc["kind"] == "pdf":
        d = base / "pdf_pages" / doc["id"]
        pages = sorted(d.glob("p*.txt"), key=lambda p: int(p.stem[1:]))
        return [(p.stem[1:], p.read_text(errors="replace")) for p in pages]
    return [(None, (base / "text" / f"{doc['id']}.txt").read_text(errors="replace"))]


def _sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def write_manifest() -> Path:
    base = official_dir()
    lines = ["# Official resources: raw captures", "",
             f"Captured {ACCESSED} (America/New_York) from the challenge Resources tab: {CHALLENGE_RESOURCES_URL}",
             "Files are unchanged copies. HTML pages were fetched with curl; `text/` holds their extracted text and "
             "`pdf_pages/<id>/pN.txt` holds `pdftotext` output per PDF page. Generated by `python -m app.ingest.official_sources`.",
             "", "| Local file | Source URL | Type | SHA-256 |", "|---|---|---|---|"]
    for d in OFFICIAL_DOCS:
        f = base / ("pdf" if d["kind"] == "pdf" else "html") / f"{d['id']}.{d['kind']}"
        lines.append(f"| {f.relative_to(base)} | {d['url']} | {d['source_type']} | `{_sha(f)}` |")
    for extra in ["html/resources_tab.html", "html/resources_tab_extracted.html", "video/meta.json", "video/transcript.txt"]:
        f = base / extra
        url = VIDEO_URL if extra.startswith("video") else CHALLENGE_RESOURCES_URL
        lines.append(f"| {extra} | {url} | {'video_metadata' if 'video' in extra else 'challenge_page'} | `{_sha(f)}` |")
    psi = settings.data_dir / "sources" / "psi"
    lines += ["", "## PSI files added on 2026-11-13", "", "| Local file | Source URL | SHA-256 |", "|---|---|---|"]
    for a in ["PSI-60", "PSI-62", "PSI-115", "PSI-117", "PSI-142"]:
        lines.append(f"| ../psi/{a}.json | https://psi.nasa.gov/geode-py/ws/repo/investigations/{a} | `{_sha(psi / f'{a}.json')}` |")
    lines.append(f"| ../psi/search_q_combustion_all_areas.json | https://psi.nasa.gov/geode-py/ws/repo/search?q=combustion&size=200 | "
                 f"`{_sha(psi / 'search_q_combustion_all_areas.json')}` |")
    for f in sorted((psi / "analyzed").iterdir()) + [psi / "experimental_tables" / "PSI-142_Experimental table_Data Summary Table.csv"]:
        acc = f.name.split("_")[0]
        lines.append(f"| ../psi/{f.parent.name}/{f.name} | https://psi.nasa.gov/geode-py/ws/studies/{acc}/download?file={f.name.replace(' ', '%20')} | `{_sha(f)}` |")
    lines += ["", "## Link only (not stored)", ""]
    for l in LINK_ONLY:
        lines.append(f"- [{l['title']}]({l['url']}): {l['note']}")
    lines.append(f"- Guidance video [{VIDEO['title']}]({VIDEO['url']}), {VIDEO['duration']}, uploaded {VIDEO['uploaded']}: "
                 "metadata and transcript stored in `video/`; the video file itself is not stored.")
    lines += ["", "Raw PSI zip / ts / mp4 archives (about 13.5 TB) are never downloaded or ingested; the app links out to PSI.", ""]
    out = base / "MANIFEST.md"
    out.write_text("\n".join(lines))
    return out


if __name__ == "__main__":
    print(write_manifest())
