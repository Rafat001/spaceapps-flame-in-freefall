"""SpaceFire Evolution page data (apps/web/lib/spacefire.json): exact official titles and URLs from the
challenge Resources tab, and every quote word for word in its source page."""
import html
import json
import re
from pathlib import Path

from app.services.nasa_program import norm

ROOT = Path(__file__).resolve().parents[3]
DATA = json.loads((ROOT / "apps/web/lib/spacefire.json").read_text())
TEXT = ROOT / "data/sources/official/text"
TAB = (ROOT / "data/sources/official/html/resources_tab_extracted.html").read_text()


def _tab_links():
    return {html.unescape(re.sub("<[^>]+>", "", t)).strip(): u
            for u, t in re.findall(r'<a[^>]*href="([^"]+)"[^>]*>(.*?)</a>', TAB, re.S)}


def _items():
    return [i for g in DATA["groups"] for i in g["items"]]


def test_three_groups_exact_order():
    assert [g["title"] for g in DATA["groups"]] == [
        "Lessons from Spacecraft Fires", "Development of Fire Safety Technologies", "Guideline"]
    assert [[i["title"] for i in g["items"]] for g in DATA["groups"]] == [
        ["Apollo 1", "Apollo 13", "25 Years Ago: Fire Aboard Space Station Mir"],
        ["Fireman’s Air Tanks", "Fire Detector", "New Technology for the Fire Attire"],
        ["A Researcher’s Guide to International Space Station Combustion Science"]]


def test_titles_and_urls_match_resources_tab():
    links = _tab_links()
    for i in _items():
        assert links.get(i["title"]) == i["url"], i["title"]


def test_resources_tab_descriptions_verbatim():
    tab = norm(html.unescape(re.sub("<[^>]+>", " ", TAB)))
    for i in _items():
        assert norm(i["resources_tab"]) in tab, i["id"]


def test_excerpts_and_dates_verbatim_in_source_page():
    for i in _items():
        page = norm((TEXT / f"{i['src']}.txt").read_text())
        for q in i["excerpts"] + [i["date_quote"]]:
            assert norm(q) in page, (i["id"], q[:60])
        assert len(i["excerpt_labels"]) == len(i["excerpts"])


def test_sources_are_official_challenge_resources():
    assert DATA["provenance"]
    for i in _items():
        assert i["url"].startswith("https://") and i["host"] in i["url"]
