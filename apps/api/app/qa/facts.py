"""Facts that exist only visually in an official resource (not in any text we index).

Each one was transcribed by the curator from a frame of the user-supplied challenge guidance video and is
labelled as such; the frame time is the citation. Keep this list minimal."""

VIDEO_URL = "https://www.youtube.com/watch?v=AVuEiKxOpc0"

VISUAL_FACTS = {
    "psi_tabs": {
        "text": "A PSI investigation page (PSI-101 shown) has these sections in its left sidebar: Description, Experimental Table, "
                "Modeling Table, Hardware, Representative Images, Data files and documents, Publications, Version History",
        "locator": "[06:10]",
        "url": f"{VIDEO_URL}&t=370s",
        "note": "Visual only: read from the video frame at 06:10 (curator transcription, checked 2026-11-13); not in the auto-captions.",
        "provenance": {"kind": "user_supplied_guide", "resource": "Challenge guidance video (user-supplied challenge guide)",
                       "resource_url": VIDEO_URL, "note": "video frame, curator transcription"},
    },
}
