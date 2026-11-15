"""Citations read S1, S2, S3… in order of first mention; chunks never start/end mid-word; anchors pick the cited passage."""
import re

from app.ingest.load import split_text
from app.services.ask import anchor_citations, check_citations, renumber_citations


def _cites(n):
    return [{"ref": f"S{i}", "excerpt": f"Source {i} text."} for i in range(1, n + 1)]


def test_renumber_follows_first_mention():
    cites = _cites(9)
    text, used, _ = check_citations("Claim A [S9][S4]. Claim B [S2]. Claim C [S9, S7].", cites)
    text, new, used = renumber_citations(text, cites, used)
    assert text == "Claim A [S1][S2]. Claim B [S3]. Claim C [S1][S4]."
    assert [c["ref"] for c in new] == [f"S{i}" for i in range(1, 10)]
    # the content moved with its ref
    assert [c["excerpt"] for c in new[:4]] == ["Source 9 text.", "Source 4 text.", "Source 2 text.", "Source 7 text."]
    assert used == {"S1", "S2", "S3", "S4"}
    refs = [int(r) for r in re.findall(r"\[S(\d+)\]", text)]
    firsts = list(dict.fromkeys(refs))
    assert firsts == sorted(firsts)


def test_renumber_keeps_fixed_s0_and_is_noop_when_sorted():
    cites = _cites(3)
    text, new, _ = renumber_citations("Computed [S0]. See [S3] and [S1].", cites, fixed=("S0",))
    assert text == "Computed [S0]. See [S1] and [S2]."
    assert new[0]["excerpt"] == "Source 3 text."
    same, unchanged, _ = renumber_citations("A [S1]. B [S2].", cites)
    assert same == "A [S1]. B [S2]." and unchanged is cites


def test_anchor_picks_the_sentence_the_claim_rests_on():
    cites = [{"ref": "S1", "excerpt": "BASS burned many samples. Flames over thin fuels spread slower at "
                                      "reduced oxygen in microgravity. The hardware was the Microgravity Science Glovebox."}]
    out = anchor_citations("Flames over thin fuels spread slower at reduced oxygen. [S1]", cites)
    assert out[0]["anchor"] == "Flames over thin fuels spread slower at reduced oxygen in microgravity."
    assert "anchor" not in anchor_citations("Unrelated claim [S1].", cites)[0]


def test_split_text_never_cuts_inside_a_word():
    words = ("Experiment flammability oxygen concentration microgravity specimen burning ignition " * 60).split()
    t = " ".join(words)  # no sentence boundaries at all
    parts = split_text(t, size=300, overlap=80)
    vocab = set(words)
    assert len(parts) > 3
    for p in parts:
        toks = p.split()
        assert toks[0] in vocab and toks[-1] in vocab, (toks[0], toks[-1])
