# PSI records adjacent to Combustion Science

The challenge Resources tab links to the PSI search https://psi.nasa.gov/physci/repo/search?q=combustion .
On 2026-11-15 that web search listed **26** investigations ("1 – 26 of 26"):

- the 24 records with Research Area = Combustion Science, stored in `../PSI-*.json`
  (PSI-10, 20, 21, 22, 23, 25, 26, 39, 47, 60, 62, 68, 69, 98, 99, 100, 101, 102, 106, 107, 115, 117, 142, 159), and
- two records from other research areas whose text mentions combustion in passing:

| Accession | Title | Research Area | Type | Why it matched |
|---|---|---|---|---|
| PSI-108 | Surface Tension Driven Convection Experiment-1 (STDCE-1) | Fluid Physics | Microgravity Investigation | Impacts text: thermocapillary techniques are used "in the study of combustion" |
| PSI-181 | Structure and Properties of Pb-Sn and Pb-free Sn-Ag-Cu Solders Produced in Terrestrial vs. Microgravity Environments under Extremes of Elevated and Cryo Temperatures | Materials Science | Ground Investigation | Impacts text: applies to "boiling, heat transfer, combustion" |

These two files are unchanged API responses from `https://psi.nasa.gov/geode-py/ws/repo/investigations/<ID>`, fetched 2026-11-15
(CC0-1.0 per record). They are kept so every record on the official resource link is in the repo. They are **not** in the
24-investigation seed: neither is a combustion or fire-safety investigation. The seed lists them under
`catalog_stats.adjacent_records` (accession, title, research area and the verbatim `researchImpacts` clause that
mentions combustion), and the app shows them as link-out cards on the Beyond PSI page. They are never counted, ranked,
filtered or added to the search index.

The PSI JSON search API (`/geode-py/ws/repo/search?q=combustion`) uses broader free-text matching and returns 133 hits. The
research-area filter (`ffield=Research Area&fvalue=combustion science`) still returns 24 as of 2026-11-15.
