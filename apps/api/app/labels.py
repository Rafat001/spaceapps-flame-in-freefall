"""Evidence labels shown in the UI (FOUNDATION_BRIEF scientific rules)."""

LABELS = {
    "psi_metadata": "Reported by authors (PSI record)",
    "psi_experimental_table": "Reported by authors (PSI experimental table)",
    "measured_psi_table": "Measured (as listed in PSI experimental table)",
    "challenge_brief": "Official challenge brief",
    "rule_tag": "Curator classification (rule-based keyword match)",
    "ai": "AI interpretation",
    "computed": "Computed summary (no AI)",
    "not_established": "Not established",
    "not_reported": "Not reported",
}

NOT_REPORTED = "Not reported"

RELEVANCE_DISCLAIMER = ("Research relevance score for discovery only. It is NOT a hazard, flammability or safety score, "
                        "and a low score does not mean low fire risk.")
PARTIAL_GRAVITY_WARNING = ("PSI currently has no partial-gravity combustion data (official challenge brief). Microgravity "
                           "results do not directly establish lunar or Martian performance; LUCI and FM2 data are expected "
                           "in the future.")
NOT_CERTIFICATION = ("This is a research discovery prototype, not a certified fire-risk calculator, materials "
                     "qualification system or spacecraft safety authority.")


def label(status: str | None) -> str:
    return LABELS.get(status or "not_reported", LABELS["not_reported"])
