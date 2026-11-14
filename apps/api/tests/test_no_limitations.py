"""AI answers carry no 'Limitations' / 'Gaps' section (user request); abstention and partial answers still work."""
import pytest

from app.services import ask as ask_svc
from tests.test_ask import FakeLLM, _ask

PMMA_WITH_LIMITS = ("**PMMA** spheres were burned in the ISS glovebox [S1].\n\n"
                    "- Flame shape depended on oxygen and flow [S1]\n\n"
                    "**Limitations:** The sources do not give flame spread rates for PMMA at lunar conditions.")


@pytest.mark.parametrize("text,keep,gone", [
    (PMMA_WITH_LIMITS, ["PMMA", "Flame shape"], ["Limitations", "lunar conditions"]),
    ("- A [S1]\n\nLimitations: none of the sources\ncover lunar gravity.", ["- A [S1]"], ["Limitations", "lunar gravity"]),
    ("Intro [S1]\n\n### Limitations\n- no data\n- more\n\n**Publications**\n- Paper [S3]",
     ["Intro", "**Publications**", "Paper [S3]"], ["Limitations", "no data"]),
    ("Intro [S1]\n\n**Gaps**\nThe sources don't cover X.\n\nAfter para [S2]", ["Intro", "After para"], ["Gaps", "cover X"]),
    ("* **Caveats:** no pressure data.\n* **Data:** rows at 21 % [S2]", ["**Data:**"], ["Caveats", "no pressure"]),
    ("What the sources do not establish: anything about Mars.", [], ["Mars"]),
])
def test_strip_limitations(text, keep, gone):
    out = ask_svc.strip_limitations(text)
    for k in keep:
        assert k in out
    for g in gone:
        assert g not in out


def test_strip_keeps_ordinary_uses_of_the_words():
    for t in ("- Gap analysis shows flame spread [S1]", "Limitations of PMMA testing include X [S1]",
              "The flammability limits were mapped [S2]"):
        assert ask_svc.strip_limitations(t) == t


def test_prompts_do_not_ask_for_limitations():
    assert "'Limitations:' line" not in ask_svc.SYSTEM_PROMPT
    assert "Never write a 'Limitations'" in ask_svc.SYSTEM_PROMPT
    assert "Limitations:" not in ask_svc.CONTEXT_INSTRUCTION


def test_assistant_answer_has_no_limitations_section(session):
    llm = FakeLLM(PMMA_WITH_LIMITS)
    j = _ask(session, "What happened when PMMA burned in BASS?", llm)
    assert j["mode"] == "llm" and "PMMA" in j["answer"]
    assert "Limitations" not in j["answer"] and "lunar conditions" not in j["answer"]
    assert "Limitations:" not in llm.last_user and "do not add a Limitations" in llm.last_user


def test_abstention_still_works(session):
    j = _ask(session, "What happened when PMMA burned in BASS?", FakeLLM("INSUFFICIENT_EVIDENCE: nothing on that."))
    assert j["abstained"] and j["mode"] == "abstained"
