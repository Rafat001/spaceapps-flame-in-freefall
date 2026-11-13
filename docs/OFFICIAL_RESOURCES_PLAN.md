# Official resources: analysis and implementation plan

Flame in Freefall · 2026 NASA Space Apps Challenge · hackathon Nov 14–15, 2026
Written 2026-11-13 (America/New_York). Analysis only; nothing in the app has changed yet.
Raw captures are in `/workspace/official-resources/` on the build box (see its `MANIFEST.md`). The step "Save raw files" below copies them into `data/sources/official/`.

**Golden set:** `docs/golden_questions.draft.json` has 72 items (55 lookup, 5 coverage, 4 comparison, 8 abstain); G060–G072 are claims from the guidance video, checked against fetched data.

**Revision 2026-11-13 (afternoon):** added the guidance-video section and video-derived tasks V1–V11. Corrected the data volume (13.50 TB / 12.28 TiB, not 6.27 TB). Re-prioritized §8.

---

## 0. Summary

- **What the Resources tab lists.** It has 11 links, all NASA. Only one of them is a dataset: the PSI repository, Combustion Science. The other 10 are context: a NASA program page with 8 fact-sheet PDFs, a 56-page Researcher's Guide, a 3.6-minute video, 3 incident histories, and 3 spinoff pages. No CSV is attached to the challenge itself.
- **PSI Combustion Science has 24 investigations: 19 microgravity and 5 ground.**
  - All 19 microgravity records are already in `data/sources/psi/` and are byte-identical to today's API responses.
  - Only 16 of them are in the seed. **PSI-10 (ACME Flame Design), PSI-21 (ACME CLD Flame) and PSI-23 (ACME s-Flame) are missing**, even though the brief talks about "the six experiments in the ACME project". Their tables (377 rows) are already on disk.
  - **The 5 ground investigations are new:** PSI-60, PSI-62, PSI-115, PSI-117 and PSI-142, released between Sep 2024 and Jun 2026. They are modeling and lab studies that reuse flight data from SPICE, BASS, SAME and FLEX.
- **The PSI combustion file set is 13.50 TB (12.28 TiB): the sum of each record's `totalFileSize` as fetched 2026-11-13.** *(Corrected in the 2026-11-13 revision. The first draft said 6.27 TB / 16,354 files, which summed only the per-record `added` list. That list is a version change list, and it is empty or near-empty for FLEX, FLEX-2, BRE, CLD, E-FIELD, SAFFIRE-II and SLICE.)*
  - Almost all of it is zip, ts and mp4 raw data. We keep linking out to it.
  - Small, valuable files we can ingest: 42 report and science-document PDFs (126 MB, counted from record listings; 7 investigations have no listing in their JSON), analyzed CSV/XLS files, and the PSI-142 and PSI-117 tables.
- **Main capability gap: production can't actually answer data questions.**
  - The live app runs retrieval-only, with no LLM. `/api/ask` returns snippets and `answer: null`.
  - Table rows are not in the text index; only one table-summary chunk per investigation is.
  - So questions like "burn time of FLEX test 20CAL08", "how many Saffire-II samples?" or "max O2 in CFI-G?" get no answer today (verified locally on 2026-11-13).
  - **Fix:** add a deterministic structured-QA layer over `test_runs`. It needs no LLM and gives exact, row-cited answers on free hosting.
- **Correctness bugs found in the current seed:**
  - SAFFIRE-II note rows are counted as tests.
  - ACME E-FIELD continuation rows are counted as sessions.
  - The lunar ranking gives FLEX full atmosphere credit even though "0 rows meeting both" conditions.
  - FLEX CSV has cp1252 dashes that decode to "�".
  - There are also several source anomalies that need visible flags. All are listed in §5.

---

## Guidance video (2026-11-10)

**Source:** "2026 Challenge | Flame in Freefall: SI-Powered Fire Safety Insights from Microgravity Combustion", NASA Space Apps Challenge channel, uploaded 2026-11-10, 8:39. https://youtu.be/AVuEiKxOpc0 (https://www.youtube.com/watch?v=AVuEiKxOpc0)

- **Transcript:** `/workspace/spaceapps-video/transcript.txt`. These are YouTube auto-captions; no manual subtitles exist. Names below are spelled as the captions render them, so verify spellings before quoting on screen.
- **Metadata:** `/workspace/spaceapps-video/meta.json`.
- **Frames checked:** 00:01, 06:10, 06:40, 06:50 and 07:20, in `/workspace/spaceapps-video/frames/`.

| Time | Speaker (as captioned) | Role | Key points |
|---|---|---|---|
| 00:04–01:54 | Tracy Prater | Program Scientist, Physical Sciences, NASA HQ | No buoyancy-driven convection, so ignition, propagation and extinguishment differ. Return to the Moon "to stay" means understanding partial gravity. Lunar habitats will have increased O2 to mitigate decompression sickness and allow more spacesuit activity, and raised O2 plus partial gravity affect material flammability. **The data "can inform fire safety protocols, design of fire suppression systems, and how we screen materials to assess the risk of fire."** |
| 01:54–04:15 | Yichen Alice Chen | UC Irvine, MAE (Lasers, Flames… research group); subject-matter expert | Gaseous, liquid and solid fuels studied in drop towers, parabolic flights, sounding rockets, suborbital flights and the ISS. Candle on Earth: teardrop, yellow (soot carried up). In µg: more spherical, soot-free, blue, no flicker. E-FIELD: ion-driven wind makes a teardrop flame even in µg. BASS-II acrylic rod in fan-driven flow, with bubbling melt. BRE porous burner. |
| 04:18–06:55 | Shubha Yusen | Lead scientist, PSI, Marshall Space Flight Center | psi.nasa.gov. Six physical-science areas. **"24 investigations with 12 terabytes of data."** Investigation page: overview (objectives, approach), folders on the left, Data files and documents with a per-sample Reduced Gravity folder tree, publications with DOIs. Users find it overwhelming and the data hard to interpret for designing safer spacecraft and lunar habitats. |
| 07:01–08:39 | Xiaoting Miao | Associate Professor, Case Western Reserve University, MAE; subject-matter expert | Required slide: "build an SI-powered, web-based dashboard that summarizes, ranks, and interprets…". The three user goals (identify, extract, highlight) match the brief. Earth add-on: fine water mist extinguishers from the ISS, smoke detection, firefighter gear (protective clothing, air tanks). |

### Findings and what they change

1. **Title mismatch.** The video's opening title card (00:01) reads "Flame in Freefall: **AI-Powered** Fire Safety Insights…". The official challenge page, the video title and the 07:20 slide say "**SI-Powered**". The app keeps the official "SI-Powered" title. We note the discrepancy here and will not copy "AI-Powered".
2. **Data volume.**
   - On camera (05:54): "24 investigations with 12 terabytes".
   - The sum of `totalFileSize` across the 24 records fetched on 2026-11-13 is **13.50 TB decimal = 12.28 TiB**, so "12 TB" matches the binary figure.
   - Our first draft's 6.27 TB was an undercount from the `added` version change list; it is corrected in §0 and §1.
   - **Rule:** the app computes the figure from the fetched PSI data at ingest and shows "13.5 TB (12.3 TiB), PSI records as of YYYY-MM-DD". "12 TB" is never hardcoded (task V2).
3. **Lunar focus.** NASA HQ leads with lunar habitats (raised O2 to reduce decompression-sickness risk) and partial gravity. **The lunar raised-O2 scenario becomes the lead demo flow** (task V3):
   - Scenario: brief target O2 ≥ 30% at ≤ 10.2 psi.
   - "Has it been done?": exact runs (CFI-G 48 rows; Flame Design inverse 18 once PSI-10 is in; FLEX closest miss at 10.33 psi).
   - Ranked list.
   - An honest **partial-gravity gap view**: no partial-gravity combustion data in PSI (brief). LUCI and FM2 are future. E-FIELD only *mimics* it. 0-g and 1-g data can *bound* but not predict. Show what 1-g counterpart data exists (SAFFIRE-II 1-g columns).
4. **Three insight lenses (from NASA HQ, 01:41).** Every investigation and every finding is tagged to one or more lenses, each tag citing the sentence or column that justifies it (task V4):
   - **(a) Fire safety protocols** — e.g. FLEX fact-sheet text on venting the cabin as an extinguishing strategy (FLEX p.2); Saffire's "operational protocols for dealing with fire emergencies" (Saffire p.1).
   - **(b) Fire suppression system design** — FLEX, FLEX-2 (CO2 / He suppressants), CFI; Guide p.26 water-mist history.
   - **(c) Material fire-risk screening** — BASS, BASS-II (NASA-STD-6001 gap, PSI-25 objective), Saffire I–III, BRE (material-flammability emulation), SAME and SAME-R (smoke from spacecraft materials, which overlaps detection).
   - Tags are "Curator classification (rule-based)" with quoted evidence, not AI.
5. **The required verbs and three goals, each mapped to a concrete screen** (task V5):

| Slide item | Screen | Status |
|---|---|---|
| **Summarize** | Home summary cards (24 investigations, rows, TB as-of, platforms, lens counts) + Investigation detail "At a glance" card + Variables view | Partial (cards are new) |
| **Rank** | Relevance ranking (`/insights`) with lunar habitat as default, plus lens filter | Exists; fix T9 |
| **Interpret** | Plain-language interpretation block on each investigation and each answer (below) | Missing |
| Goal 1: identify investigations relevant to crew habitats | Lead lunar flow + scenario ranking + "Has it been done?" | Exists / partial |
| Goal 2: extract data for predictive modeling | Modeling export (T8) + per-run table with SI units, flags and data dictionary | Partial |
| Goal 3: highlight research for next-gen controls and equipment | Insight lenses (b) and (c) plus a detection view (SAME, SAME-R, DAFT) and a hardware view (CIR, MDCA, MSG) | Missing |

   **"Interpret"** means plain-language interpretation of results.
   - **Deterministic path (default, no LLM):** templated sentences built only from computed facts. Example: "FLEX burned 2 fuels in 274 tests at 12–34% O2 and 526–2,320 mmHg; 186 ended in extinction. Varied: O2, pressure, He/CO2 fraction, droplet size. Held constant: …". Each clause links to its rows. Templates also cover: what varied vs constant; how it relates to the lunar target (match / closest miss with numbers); which lenses apply and why; and what cannot be concluded (partial gravity, certification).
   - **Optional LLM path:** narrative written only from the deterministic facts and cited sources. It may not add numbers. Enabled by admin key or bring-your-own-key, **pending the user's decision (D3)**.
6. **PSI page parity.** PSI investigation pages have the tabs Description, Experimental Table, Modeling Table, Hardware, Representative Images, Data files and documents, Publications, Version History (frame 06:10). Coverage check against the JSON on disk:

| PSI tab | In record JSON? | In our ingest today? | Feasibility | Task |
|---|---|---|---|---|
| Description | yes (objective, approach, hypothesis, impacts, dates, platform) | yes | — | — |
| Experimental Table | yes (`experimentalTable`, CSV download) | yes, 16 of 19 (+3 in T2) | — | T2 |
| Modeling Table | **no field in the JSON.** The ground investigations carry modeling outputs as "Analyzed Data" files (PSI-115 `.dat`, PSI-117 CSVs, PSI-142 xlsx). | no | Partial. Index the analyzed / model files as a "Modeling data" section. A real Modeling Table endpoint is unknown (not probed further). | V6 |
| Hardware | yes (`experimentHardware`, `experimentHardwareLink`) | yes (`hardware`, `hardware_link`) | — | facet in T7 |
| Representative Images | yes (`images[]`; also `Representative Image(s)` files): PSI-10 (5), PSI-22 (4 listed in `images`), PSI-25 (1), PSI-47 (1), PSI-159 (2). Sizes 9.9 KB–1.3 MB. | no | **Feasible.** Public download confirmed: PSI-25 image via `/geode-py/ws/studies/PSI-25/download?file=…`, HTTP 200, 37,525 B, image/jpeg. Link-out thumbnails (hotlink via the download URL, or cache ≤ 400 KB copies with credit "NASA PSI, CC0"). Skip logos (ACME logo) per brand rules; skip PSI-179's 9.4 MB image. | V6 |
| Data files and documents (folder tree) | **Partial.** `added[]` carries `remote_path`, `subcategory` (e.g. `Reduced Gravity/Kapton/Run 061`), `file_size` and `date_created` for 17 of 24 investigations. It is empty or one entry for FLEX, FLEX-2, BRE, CLD, E-FIELD, SAFFIRE-II and SLICE even though their `totalFileSize` is 17 GB–2 TB. `added` is a version change list, so trees may be incomplete even where present. | no (only file counts and sizes) | Metadata-only tree index for the 17. For the 7, show total size + "browse on PSI" link. A public listing endpoint was not found (`/studies/<id>/files` returns 403, so we did not pursue it). | V7 |
| Publications | yes (`publications[]` with DOIs) | yes (metadata only) | — | — |
| Version History | yes (`version`, `versionReason`, `versionMessage`, `modifiedDate`) | no | Feasible. Show "PSI version N, modified DATE, reason" on detail; used for the as-of stamp. | V6 |

   **SAME-R folder check.** On-disk PSI-101 has Raw Data > Reduced Gravity > **Cotton Lamp wick, Kapton, Pyrell, Silicone, Teflon**. Each has `Run NNN` subfolders (some tagged "Aged" / "Unaged") and a "Videos, Images" folder, and Analyzed Data mirrors the same material folders. The video frames at 06:40–06:50 show the same five. **PEEK and PVC do not appear** in the record or in the frames we checked, so the app must not list them. SAME (PSI-102) adds a Dibutyl Phthalate folder.
7. **Test platforms (02:25).** The video names drop towers, parabolic flights, sounding rockets, suborbital flights and the ISS. The PSI `Flight Platform` field supports only: ISS 18, Cygnus 1 (SAFFIRE-II), blank 3 and "Not Applicable" 2 (ground). SAFFIRE-I and -III say ISS while their hardware is a Cygnus enclosure, so flag that. **Add `platform` as a filter with those values plus "Ground lab / model".** Show drop tower / parabolic / sounding rocket / suborbital only as text mentions with citations (PSI-10 approach: drop towers + ISS; PSI-26 hypothesis: longer than drop towers or parabolic aircraft), never as a platform value (task V8).
8. **"Why microgravity fire differs" explainer for judges** (task V9). One short panel citing only official sources:
   - Brief: candle flame becomes a blue sphere reliant on diffusion.
   - NASA Combustion Science page: ~2,300 K flame vs ~300 K ambient, an eight-fold density change, buoyant flow causes lift and flicker.
   - Guide p.2: drop-tower spherical ethylene flame; 1-g vs 0-g candle; BASS acrylic sphere at 17% O2.
   - PSI-25 objective: rods, fan-driven forced flow.
   - PSI-22 objective: electric fields and chemi-ions.
   - PSI-20 objective: porous burners, 25 and 50 mm.
   - Video timestamps as a secondary citation.
   - No video stills are embedded (the video carries the Space Apps logo; brand rule). Use PSI representative images where licensed CC0.
9. **Earth add-on mapping** (task V10). Each mapping is labelled **Documented** (official text links them) or **Inferred** (thematic, our curation):
   - **Smoke detection:**
     - Documented: DAFT (PSI-47) and SAME (PSI-102) give guidance for spacecraft smoke-detector designers (Guide p.26). The DAFT fact sheet covers distinguishing dust from smoke.
     - Inferred: the Fire Detector spinoff (1978, discriminates smoke from dust) relates to SAME, SAME-R and DAFT.
   - **Fine water mist:**
     - Documented: Mist experiment STS-107 (2003), then water-mist extinguishers to the ISS in Dec 2015 (Guide p.26). Mist is not a PSI investigation.
     - Inferred: thematic link to FLEX and FLEX-2 suppression research.
   - **Protective clothing (Fire Attire, 1982) and air tanks (1976):** no PSI investigation is linked by official text, so they are **context only**. A possible inferred link from fire-resistant fabrics to Nomex / SIBAL samples in Saffire is labelled inferred.
10. **Analytical, not a prettier file browser.** The video shows PSI as a nested folder browser. Our dashboard leads with summary cards, ranking, charts (e.g. O2 vs pressure scatter of all runs with the lunar target box; runs per investigation; lens coverage) and answers. File trees appear only as a secondary "Data files" tab with link-outs (task V11).

---

## 1. Resource inventory

These are the links from the Resources tab, in page order. Everything was fetched on 2026-11-13.

| # | Resource | URL | Owner | Format / size | Access | What it contains | Accessible? |
|---|---|---|---|---|---|---|---|
| 1 | PSI Data Repository: Combustion Science | https://psi.nasa.gov/physci/repo/search?q=combustion | NASA BPS / GRC (PSI) | JSON API + per-file downloads; 24 investigations; 13.50 TB (12.28 TiB) by summed `totalFileSize`, as of 2026-11-13 | Public, CC0-1.0 per record. API: `geode-py/ws/repo/search`, `/repo/investigations/<ID>`, `/studies/<ID>/download?file=` (302 to S3) | Records: objective, approach, hypothesis, impacts, hardware, dates, DOI, publications, file listing. Experimental tables (CSV). Raw video/images (zip/ts/mp4). Reports and PDFs. Analyzed data. | Yes. Note: `?q=combustion` is free-text and returns 133 hits across all areas. The challenge set is the 24 with Research Area = Combustion Science. |
| 2 | NASA Combustion Science | https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/ | NASA GRC | HTML (~9.6k chars of text) + 8 PDF fact sheets (ACME 19 pp, BASS 10, DAFT 2, FLEX 5, SAME 5, SPICE 2, Saffire 2, SLICE 2) | Public | Program overview. Current experiments (FM2, SoFIE, FLARE). Archived experiments. CIR and MDCA facts (100-liter chamber, launched Nov 2008 on STS-126). | Yes |
| 3 | NASA ScienceCasts: The Power of Studying Combustion on the ISS | https://www.youtube.com/watch?v=W1oXykoz9zg | NASA | Video, 219 s, published 2018-03-13 | Public (YouTube) | Intro video | Yes. Link only, not ingested. |
| 4 | A Researcher's Guide to ISS Combustion Science | https://www.nasa.gov/missions/station/a-researchers-guide-to-combustion-science/ | NASA ISS Program Science Office | PDF, 56 pages, 1.5 MB (+ epub) | Public | 2015 review: facilities (CIR, MSG, MDCA), past results, ACME (5 experiments in 2015), SoFIE | Yes |
| 5 | Apollo 1 | https://sma.nasa.gov/sma-disciplines/accllp/apollo-1 | NASA OSMA | HTML (~16k chars) + linked PDFs | Public | Crew, the AS-204 fire on Jan 27, 1967 in a 100% O2 cabin, investigation, lessons learned | Yes |
| 6 | Apollo 13 | https://sma.nasa.gov/sma-disciplines/accllp/apollo-13 | NASA OSMA | HTML (~15k chars) + linked PDFs | Public | Oxygen tank no. 2 explosion, investigation, lessons | Yes |
| 7 | 25 Years Ago: Fire Aboard Space Station Mir | https://www.nasa.gov/history/25-years-ago-fire-aboard-space-station-mir/ | NASA JSC History | HTML (~5.7k chars) | Public | Feb 24, 1997 SFOG fire in Kvant-1, six crew aboard | Yes |
| 8 | Fireman's Air Tanks | https://spinoff.nasa.gov/node/9582 | NASA Spinoff | HTML (~2k chars) | Public | 1976 spinoff: 20 lb, 30-minute, 4,500 psi tanks | Yes |
| 9 | Fire Detector | https://spinoff.nasa.gov/node/9407 | NASA Spinoff | HTML (~2k chars) | Public | 1978 spinoff: Brunswick incipient fire detector that discriminates smoke from dust | Yes |
| 10 | New Technology for the Fire Attire | https://spinoff.nasa.gov/node/9918 | NASA Spinoff | HTML (~2.6k chars) | Public | 1982 Project FIRES (NASA + FEMA USFA, MSFC); 14 fire departments in field evaluation | Yes |
| 11 | (Details tab) | .../flame-in-freefall/?tab=details | Space Apps | HTML | Public | Text unchanged from our 2026-11-10 capture (diffed) | Yes |

**Access caveat.** The box's TLS store is missing the "AAA Certificate Services" root, which spaceappschallenge.org chains to. The pages were read with `curl -k`; WebFetch returns HTTP 500. psi.nasa.gov and nasa.gov fetch normally.

### 1a. The 24 PSI Combustion Science investigations against our catalog

| Accession | Acronym | Type | In `data/sources/psi` | In seed | Table rows (non-blank) | PSI `totalFileSize` | File entries in record JSON |
|---|---|---|---|---|---|---|---|
| PSI-26 | BASS | µg ISS | yes | yes | 122 | 163.6 GB | 211 |
| PSI-25 | BASS-II | µg ISS | yes | yes | 129 | 274.6 GB | 694 |
| PSI-98 | SAFFIRE-I | µg Cygnus | yes | yes | 4 (2 samples + 2 flow-vis) | 12.3 GB | 74 |
| PSI-99 | SAFFIRE-II | µg Cygnus | yes | yes | 15 (9 samples + 2 flow-vis + 4 notes) | 16.9 GB | 0 |
| PSI-100 | SAFFIRE-III | µg Cygnus | yes | yes | 2 | 35.2 GB | 85 |
| PSI-102 | SAME | µg ISS | yes | yes | 8 | 0.7 GB | 104 |
| PSI-101 | SAME-R | µg ISS | yes | yes | 109 | 6.3 GB | 342 |
| PSI-47 | DAFT / DAFT-2 | µg ISS | yes | yes | 2 | 41.77 MB | 32 |
| PSI-69 | FLEX | µg ISS | yes | yes | 274 | 923.8 GB | 0 |
| PSI-68 | FLEX-2 | µg ISS | yes | yes | 8 (test matrix) | 1,224.8 GB | 0 |
| PSI-39 | CFI | µg ISS | yes | yes | 87 | 718.9 GB | 2831 |
| PSI-159 | ACME CFI-G | µg ISS | yes | yes | 179 normal + 154 inverse | 2,085.6 GB | 3756 |
| PSI-20 | ACME BRE | µg ISS | yes | yes | 18 sessions | 2,035.6 GB | 1 |
| PSI-22 | ACME E-FIELD Flames | µg ISS | yes | yes | 21 sessions (+11 continuation rows) | 950.2 GB | 0 |
| PSI-107 | SPICE | µg ISS | yes | yes | 469 | 6.9 GB | 186 |
| PSI-106 | SLICE | µg ISS | yes | yes | 12 sessions | 72.9 GB | 1 |
| **PSI-10** | **ACME Flame Design** | µg ISS | yes | **no** | 207 normal + 120 inverse | 2,180.4 GB | 3807 |
| **PSI-21** | **ACME CLD Flame** | µg ISS | yes | **no** | 32 sessions | 2,005.5 GB | 1 |
| **PSI-23** | **ACME s-Flame** | µg ISS | yes | **no** | 18 sessions | 782.2 GB | 4163 |
| **PSI-60** | Computational & Experimental Analysis of SPICE Data Sets | ground | **no** | no | none | 8 KB | 1 |
| **PSI-62** | Concurrent Flame Spread Modeling (FGM) vs BASS | ground | **no** | no | none | 10 KB | 1 |
| **PSI-115** | SAME data for smoke-generation modeling | ground | **no** | no | none (44 `.dat` analyzed files, 0.26 GB) | 0.3 GB | 47 |
| **PSI-117** | Thermo-convective perturbation on cool flames (FLEX data, CFD) | ground | **no** | no | 9 analyzed CSVs (small) | 70.82 MB | 15 |
| **PSI-142** | Cool-flame transitions, counterflow (FLEX data) | ground | **no** | no | Data Summary Table, 8 rows | 0.75 MB | 2 |

**Adjacent but not in Combustion Science:** PSI-179 ASE (Aerosol Sampling Experiment, Complex Fluids). Its objective mentions smoke and aerosol hazards for crew. It's optional and link-only.

**Mentioned in the official material but not in PSI:**
- Saffire-IV, -V and -VI (Saffire fact sheet p.2)
- SoFIE, FLARE and FM2 (NASA Combustion Science page)
- LUCI and FM2 (brief: future partial-gravity data)
- LSP, TGDF and ELF (Guide p.13)

These go into a **scope registry** so the app can abstain honestly when asked about them.

---

## 2. What is in the data (schemas, units, anomalies)

Experimental tables are under `data/sources/psi/experimental_tables/`. "Rec N" means the CSV record number, where the header is record 1.

| Table | Key columns (units as in header) | Notes |
|---|---|---|
| FLEX (PSI-69) | FLEX Test #, Identifier, Date, GMT, Fuel, Ambient pressure (mmHg), O / N / "CO" / He initial mole fractions, droplet initial diameter (mm), visible flame extinction diameter (mm), "Burning rate; mm", burn time (s), Test end | Fuels: Methanol 157, Heptane 117. O2 0.12–0.34. P 526.3–2,319.9 mmHg. He up to 0.45; "CO" (CO2 suppressant) up to 0.70. Rec 115 has P = 0 (seed already flags it). 36 cells are cp1252 `0x96` dashes. Identifier 193F001 appears twice (recs 71, 74). Rec 25 date "10/24/09" uses a different format. The burning-rate unit is literally "mm"; leave it unconverted and flag it. |
| FLEX-2 (PSI-68) | Fuel, initial droplet diameter "1.5 - 5" mm, gas mixture, O2 "0.17; 0.21; 0.25; 0.3", P "0.5…3.0" atm, T 25 C, flow 0.1–5 cm/s | A per-fuel **test matrix** (8 fuels), not individual runs |
| CFI (PSI-39) | Flex Number, date, CIR id, Pressure ("1 atm"…), O2/N2/He fractions, Fiber, Fuel | 87 tests. P 0.5–5 atm. O2 0.17 or 0.21. He 0.29 or 0.59 (14 rows, all at 1 or 3 atm). Pressure is a text value with units in the cell. |
| CFI-G normal / inverse (PSI-159) | Fuel, Test, XO2, approx p (bar), burn rate (mg/s), Tad (K), Zst, hot ignition, burn time (s), SE/FT, peak burner T, Color, Comments | Inverse: 1,015 CSV records but only 154 non-blank. XO2 0.12–**0.85** (the brief's "up to 85%"). Fuels ethane, propane, butane. Normal: 179 rows, XO2 0.18–0.40, 7 rows marked as cool flames. Mixed-case Yes/yes and Inverse/inverse. |
| Flame Design (PSI-10, not seeded) | XO2, mO2/mN2/mtot (mg/s), XC2H4, pinit/pfinal/pmean (atm), mean Zst, Tad (K) | Inverse: 120 rows, XO2 0.212–0.850, pmean 0.426–3.018 atm. Normal: 207 rows (C2H4 187, C3H8 20), XO2 0.198–0.40. |
| BRE (PSI-20) | Year/Month/Date, burner size (mm), fuel bottle, O2 (percent, list), flames ignited | 25 mm (16 days) and 50 mm (2 days). 194 flames. Rec 6 "3400%" and rec 9 "2100%" are formatting artifacts (already flagged). |
| CLD Flame (PSI-21, not seeded) | Test type, Test Day (YYDDD), fuel/N2 MFC (slpm), fuel bottle, fuel conc. range, flames ignited | 32 days, 344 flames. **Fuel-bottle auto-fill artifacts:** "40% CH5"…"CH14", "100% C2H5"…"C2H11", "50% C2H5"…"C2H9", "30% C2H5", "40% CH5". |
| E-FIELD (PSI-22) | Test type, Test Day, date, mesh polarity, fuel bottle, fuel conc, flames ignited | 21 dated rows plus 11 continuation rows that only carry an extra fuel conc. Day 18319 is duplicated (recs 26 and 30). Two rounds: coflow burner, then gas-jet burner. |
| s-Flame (PSI-23, not seeded) | Test Day, atmosphere, fuel bottle, flames ignited | 18 days, 276 flames. H2/CH4/C2H4 with N2 or He. ~21% / ~30% O2. Atmosphere auto-fill artifacts "N3"…"N6". |
| BASS (PSI-26) | Date, GMT, test #, sample #, fuel sample material (free text) | 122 rows. Rec 111 date "5/15/**2103**", rec 44 "6/29/`12". Material is free text (e.g. "2 cm sphere", "Japan Wax Candle wake"). |
| BASS-II (PSI-25) | PI, Test #, date, sample, material (free text), flow restrictor, fan/air display, radiometer gain, frames, calibrated initial/final O2 (% vol), CO2 (% vol), CO (ppm) | 129 rows, 6 PIs. Initial O2 13.6–22.2. **Final O2 0.6–40.4:** a/b pairs at recs 97/98 and 128/129, and rec 3 at 1.6. Don't interpret these; flag them. Fan and air columns are display settings, not velocities. |
| SAFFIRE-I (PSI-98) | Sample, material, thickness / length / width (cm), air flow (cm/s), % O2, ignition W/s, burn time s, direction | 2 samples. Length 40.6 / width 94 here, but 94 / 40.6 in SAFFIRE-III: possible swap, flag it. |
| SAFFIRE-II (PSI-99) | As SAFFIRE-I, with units inside cells ("0.27 mm", "20 cm/s"), plus µ-g / 1-g burn and spread columns (header "?-g", encoding lost) | 9 samples (recs 2–10). Recs 13–16 are notes but the **seed marks them `test`**. Material is blank for 2-6 and 2-9. "037 mm" is probably 0.37 mm (flag, don't fix). |
| SAFFIRE-III (PSI-100) | Sample, material, thickness, L, W, air flow, direction | 2 samples, SIBAL 30 cm/s |
| SAME (PSI-102) | Sample, material, air flow (cm/s), weight-loss rate (mg/min), aging (min) | 8 rows. Rows 5–8 say "same conditions as 1-4". |
| SAME-R (PSI-101) | Sample type, test #, description, date (no year), inlet velocity (cm/s), Rt/R0, durations (s) | 109 rows, 5 materials |
| SPICE (PSI-107) | GMT date (day of year), ignition / off times, fuel, nozzle (mm), fuel rate (sccm, mg/s), air rate (cm/s) | 469 rows, 3 nozzles. Air rate −5.92 / −0.28 at recs 296–301 and 337–339 (already flagged). "14.48.19" time format. |
| SLICE (PSI-106) | Test date, fuel type | 12 sessions, 2012-02-09 to 2012-03-23 |
| DAFT (PSI-47) | Session, day, hardware, sample material, location | 2 sessions (P-Trak, DustTrak), Arizona Road Dust |
| PSI-142 (new) | Data ID, description, reference publication link, figure ID | 8 rows pointing to figures in Combustion and Flame / PROCI papers |
| PSI-117 analyzed (new) | 9 CSVs (e.g. `PROCI_2023_Alkane_Extinction_Diameter_1atm.csv`, `MST_2024_Kavg.csv`) + ReadMe xlsx | Small model/derived data. Index and link; optionally load the CSVs as "analyzed data" (not experimental). |

**Already handled well by the seed:** BRE "3400%", FLEX P = 0, SPICE negative velocities, and BASS-II using only *initial* O2 for filtering. Keep these and add tests for them.

---

## 3. Challenge requirements against current features

The sources are the Details tab (Objectives, Potential Considerations) and PRD §5.

| ID | Requirement (brief) | Current app | Status | Gap / action |
|---|---|---|---|---|
| R1 | SI-powered web dashboard that **summarizes, ranks, interprets** (reaffirmed on the video's required slide) | Dashboard, ranking, hybrid RAG. Live site is retrieval-only (no LLM). | Partial | No direct answers in production. Add structured QA (T4); optional LLM narrative (decision D3). |
| R2 | Identify investigations most relevant to crew environments: spacecraft, stations, lunar and Martian bases, rovers | Scenarios `lunar_habitat`, `pressurized_rover`, `spacecraft`, `mars_habitat`; ranking `sfsri-v0.1` | Partial | Atmosphere criterion bug (FLEX gets 1.0 with 0 same-row matches). CFI-G counts exclude inverse oxidizer-stream rows (ranking says 20, coverage says 48). Mars and spacecraft targets "Not established". Fix in T9. |
| R3 | Extract data supporting **predictive modeling** of flammability | CSV export of investigations / rows (O2, P, airflow) | Partial | Export misses Tad, Zst, burn time, burn rate, droplet diameters, ignition W/s and other columns. No data dictionary or SI-normalized export. Fix in T8. |
| R4 | Highlight research for **next-gen fire safety controls and equipment** | Topic tags (detection / suppression) | Partial | Add an "Equipment and controls" lens: detection (SAME, SAME-R, DAFT), suppression (FLEX, FLEX-2), material selection (BASS, BASS-II, Saffire, BRE), hardware (CIR, MDCA, MSG). T7. |
| R5 | Potential Earth applications (water mist, smoke detection, firefighter gear) | PSI "Research impacts / Earth benefits" text only | Missing | Earth-applications panel from the 3 spinoff pages, linked to related investigations. Water mist appears only in the brief (cite the brief). T6. |
| R6 | Rockets and propellants are out of scope | General abstention | Partial | Explicit scope rule and golden test G057. T10. |
| C1 | Audience: professors through engineers | UI | Covered | — |
| C2a | Display experimental objectives | Detail page | Covered | Add ground investigations (T3). |
| C2b | Fuels, including **shape and size** of samples or burners | `material`, `sample_geometry` string | Partial | Structured geometry fields: droplet d0, nozzle mm, burner mm, sample L/W/thickness, rod diameter from text (flagged parse). T5. |
| C2c | Other conditions: O2, airflow | `oxygen_pct`, `pressure_kpa`, `airflow_m_s` per row | Covered (where reported) | Add diluent / suppressant (He, CO2, N2) and temperature. T5. |
| C2d | **Variables: how tests in the same investigation differed and how they were the same** | — | Missing | Auto "varied vs held constant" per table, with ranges and distinct values. T5. |
| C2e | Sensors or types of measurements | Keyword tags | Partial | Add measured columns as measurement types (from headers) plus fact-sheet diagnostics with page citations. T6. |
| C3 | Similarities and differences between investigations | Compare (2–3) | Covered / partial | Add hardware-family presets and a "shared vs different" summary row. T7. |
| C4a | DAFT instrument reused from SAME | `brief_facts` | Covered | Add a golden test. |
| C4b | BRE emulates material flammability | `solid_emulation` flag | Covered | — |
| C4c | **Other PSI combustion investigations** are relevant | 16 of 24 | Missing | Ingest PSI-10, 21, 23 (T2) and the 5 ground investigations (T3). |
| C5 | Hardware groupings: ACME/CIR, MDCA/CIR, MSG/SPICE duct | `hardware` field | Partial | Hardware facet and family view (T7). The ACME group needs PSI-10, 21, 23. |
| C6 | Spacesuit and lunar atmosphere (4.3 psi, 30% / 10.2 psi) | Reference atmospheres on Home; scenarios | Covered | Boundary unit tests (T11). |
| C7 | CFI-G has the highest O2 (85%) | Data present | Covered (data) / Missing (answer) | Structured QA (T4). |
| C8a | No partial-gravity data in PSI | Disclaimers, policy notes | Covered | — |
| C8b | E-FIELD mimics partial gravity | `partial_gravity_mimic` | Covered | — |
| C8c | 0-g and 1-g results could bound intermediate gravity | — | Missing | Show 1-g counterpart data where it exists (Saffire-II 1-g columns; ground investigations) with a "bounding, not prediction" label. T6/T7. |
| P-FR04 | Detail shows data availability and documents | 264 document rows | Partial | Add PSI file categories and sizes (reports, analyzed, raw) with link-outs. T3. |
| P-FR06 | Page-level citations | PSI text only, no pages | Partial | Official PDFs page-chunked (T6). |
| P-FR09 | Provenance of every number | Per-row source text and flags | Covered | Extend flags (T1). |
| V-a | Video: official title is "SI-Powered" (title card says "AI-Powered") | App uses "SI-Powered" | Covered | Keep it; never copy "AI-Powered" (V1). |
| V-b | Video: "24 investigations with 12 terabytes" | No volume stat shown | Missing | Computed 13.50 TB / 12.28 TiB with an as-of date; no hardcoded 12 TB (V2). |
| V-c | Video (NASA HQ): lunar habitats with raised O2 (decompression sickness) + partial gravity | Lunar scenario exists, not the lead flow; partial gravity shown only as disclaimers | Partial | Lunar flow as the lead demo + partial-gravity gap view (V3). |
| V-d | Video (NASA HQ): data informs protocols, suppression design, material screening | Topic tags only | Missing | Three insight lenses with cited tags (V4). |
| V-e | Required slide: summarize / rank / interpret + 3 goals mapped to screens | Rank yes; summarize partial; interpret only via LLM (off in prod) | Partial | Summary cards, deterministic interpretation templates, optional LLM per D3 (V5). |
| V-f | PSI page parity: Modeling Table, Hardware, Representative Images, Data files tree, Version History | Hardware yes; others no | Partial | Images (link-out), version stamp, modeling-data section (V6); metadata-only file tree for 17 of 24 (V7). |
| V-g | Test platforms (drop tower … ISS) | `flight_platform` text, no filter | Partial | Platform filter on PSI values; other platforms only as cited text mentions (V8). |
| V-h | 1-g vs µg flame explainer | — | Missing | "Why microgravity fire differs" panel from official sources (V9). |
| V-i | Earth add-ons: water mist, smoke detection, firefighter gear | — | Missing | Spinoff ↔ PSI mapping labelled Documented / Inferred (V10; merges into T6). |
| V-j | Analytical dashboard, not a file browser | Explorer list + detail | Partial | Summary cards and charts on Home and lunar flow; file tree demoted to a tab (V11). |

---

## 4. Ingestion plan by resource

**Principles**
- Store raw files unchanged in `data/sources/official/` (or `psi/`) with SHA-256 checksums and an access date in `MANIFEST.md`.
- Ingest text, tables and metadata. Link out for anything large.
- Repo budget: about 3 MB added (fact sheets and the guide are about 3.3 MB of PDF). Ingest only the extracted page text; keep the PDFs out of git if size becomes a concern, since the URLs are stable.

| Resource | What we ingest | How | Size added | What we link out |
|---|---|---|---|---|
| PSI 24 combustion records | Record text sections (as now) for all 24. File listing with category, name, size and download URL. Publications metadata. | Existing `build_seed`. Add accessions to `SEED_ACCESSIONS`/`CURATION`. Add a `project_type`-aware gravity regime (ground means `1g_lab_or_model`). Add a `relationships` field (e.g. PSI-117 uses FLEX data; quote the objective sentence). | ~0.3 MB JSON (5 new records) | Raw zip, ts and mp4 (~13 TB) |
| PSI experimental tables (PSI-10, 21, 23 new) | Every row as `test_runs`, with verbatim raw and parsed conditions | `table_specs.py` mappings (columns listed in §2) | 0 (CSVs already on disk) | — |
| PSI-142 Data Summary Table | 8 rows as `analyzed_items` (data ID, description, DOI, figure) | New small table spec, `row_kind=data_index` | 1 KB | DOIs |
| PSI-117 analyzed CSVs | File index. Optionally load as `analyzed_series`, kept separate from experimental runs and labelled "Analyzed / model data (PSI ground investigation)". | Download the 9 CSVs (~270 KB) and the ReadMe xlsx | ~0.3 MB | Presentations PDFs (60 MB) |
| PSI Reports and Science Documents PDFs (42 files, 126 MB) | Stretch goal (P2): page text of the final reports under 10 MB each | `pdftotext` per page into chunks with `page` | Text only (~2–4 MB) | All PDFs |
| NASA Combustion Science page + 8 fact sheets | Page text chunks, `source_type=nasa_fact_sheet`, `page` set; linked to investigations by acronym | `pdftotext -f p -l p`; HTML via BeautifulSoup | ~0.2 MB text | PDFs |
| Researcher's Guide (56 pp) | Page chunks, `source_type=nasa_guide` | Same as above | ~0.25 MB text | PDF / epub |
| Apollo 1, Apollo 13, Mir | Short "incident context" docs (not investigations), `source_type=nasa_history` | HTML text, one chunk per section | ~40 KB | Linked PDFs (Senate reports etc.) |
| 3 spinoffs | `earth_applications` entries (title, year, summary sentence, URL) linked to topics: detection → SAME, SAME-R, DAFT; protective gear → (no PSI investigation; label it "context") | Hand-entered from the page text with a quoted sentence; no paraphrased numbers | ~5 KB | Spinoff pages, NTRS handles |
| ScienceCast video | Metadata only (title, duration, date) | Static entry | <1 KB | YouTube |
| Scope registry | Saffire IV–VI, SoFIE, FLARE, FM2, LUCI, LSP, TGDF, ELF: "mentioned in official material, not in PSI" | Static JSON with citations (fact sheet page or URL) | <5 KB | — |

**Render free-plan impact.** Rows go from 1,624 to about 2,000. Chunks go from 175 to about 600 after adding the docs. Boot-time ingest grows by seconds; memory stays well under 512 MB with hash embeddings. Keep `VECTOR_BACKEND=numpy`.

---

## 5. Data model changes

1. **`test_runs.row_kind`.** Add the values `note`, `continuation` and `data_index`.
   - Fix SAFFIRE-II recs 13–16 (`note`).
   - Merge E-FIELD continuation rows into the preceding dated row as a `fuel_conc_values` list, keep `source_rows=[…]`, and mark duplicate day 18319.
   - Counts in the UI and API use `row_kind in (test, session, test_matrix)` only.
2. **`test_runs.extra_numeric`** (JSON): every numeric column not mapped to O2, pressure or airflow (Tad, Zst, burn time, mfuel, Rt/R0, nozzle mm, etc.), stored as `{column, value, unit_as_given, unit_si, value_si}`. This feeds structured QA and the modeling export.
3. **Material and fuel normalization.**
   - Keep `material_verbatim` and add `material_normalized` plus `material_flags`.
   - Flags: `autofill_artifact_suspected` (CLD "CH5…", s-Flame "N3…"), `blank_in_source`, `alias_rule` (e.g. "clear rod" → PMMA, which needs domain-lead confirmation).
4. **Diluent and suppressant fields:** `diluent` (N2 / He) and `suppressant_fraction` {CO2, He} per row (FLEX, CFI, s-Flame).
5. **Geometry fields:** `droplet_d0_mm`, `nozzle_mm`, `burner_mm`, `sample_length_cm`, `sample_width_cm`, `sample_thickness_mm`. Each carries a source column and a flag.
6. **Data-quality flags** at row level: `date_anomaly` (BASS 2103, backtick), `possible_dimension_swap` (SAFFIRE-I), `implausible_value`, `encoding_replaced` (FLEX cp1252, decoded properly), `duplicate_identifier` (FLEX 193F001), `header_garbled` (SAFFIRE-II "?-g").
7. **`documents.source_type`:** add `nasa_fact_sheet`, `nasa_guide`, `nasa_history`, `nasa_spinoff`, `psi_report`. Add `chunks.page`, which already exists as a column and just needs populating.
8. **New tables:**
   - `relationships` (from_inv, to_inv, kind=`uses_flight_data_of`, quote, source)
   - `earth_applications`
   - `scope_registry`
   - `analyzed_items`
   - `variables_summary` (materialized per investigation: column, n distinct, min/max, constant?)
9. **Catalog version** `seed_version: 2`, with a `counts` block (investigations by type, rows by kind) that tests assert against.

---

## 6. Correctness strategy

### 6.1 Layers

1. **Source fidelity tests** (pytest, run at ingest).
   - For every table: non-blank CSV records equal ingested rows by `row_kind`; every `raw` dict equals the CSV row byte-for-byte after decoding.
   - Expected counts are pinned in a fixture file generated from the CSVs, not typed by hand.
   - Pinned: FLEX 274, CFI 87, CFI-G 179 + 154, Flame Design 207 + 120, SPICE 469, BASS 122, BASS-II 129, SAME-R 109, SAFFIRE-II 9 samples, E-FIELD 21 dated rows, and so on.
2. **Unit tests for numbers and units** (see §7).
3. **Golden Q&A** (`docs/golden_questions.draft.json`, 59 items) with a harness `apps/api/tests/test_golden.py`:
   - `lookup` and `comparison`: call `/api/ask` in structured mode. Pass when every `must_include` token appears in `answer`, every `expected_accessions` item appears in `citations`, and every number in the answer appears in a cited row's raw text or is a declared aggregate (count, min or max) with its computation shown.
   - `coverage`: call `/api/coverage` with the parsed parameters in the item (add a `coverage_params` field when finalizing). Assert the matched investigations and run counts.
   - `abstain`: assert `abstained == true` or `answer_kind == "not_reported"` / `"out_of_scope"`, with the reason containing the `must_include` token.
   - Items whose `requires` feature isn't built yet are marked `xfail(strict=True)`, so they flip to failures (which forces removing the mark) once the feature lands.
4. **Expected-answer self-check.** A script, `scripts/verify_golden.py`, recomputes each numeric expected answer directly from the cited CSV rows (pandas-free, csv module). It fails if the golden file drifts from the data. Every item already carries `source.file` and `location`.
5. **Live smoke test.** The same harness can run against the Render URL with `GOLDEN_BASE_URL`, after deploy. Tolerate the 30–60 s cold start.
6. **No-LLM guarantee.** Golden tests run with `AI_LLM_PROVIDER=none` and hash embeddings, exactly matching production. A second, optional run with an LLM checks that the narrative doesn't contradict the structured answer (numbers must be a subset of the structured answer's numbers).

### 6.2 Structured QA engine (the key new feature)

This is a deterministic layer in front of RAG: `app/services/structured_qa.py`.
- **Entity resolution:** acronym or alias to investigation, and test identifier to row (FLEX identifiers, CFI-G tests, SAFFIRE sample numbers, BASS-II test #).
- **Intents** (regex and keyword templates, no ML): `count`, `list_distinct(column)`, `range(column)`, `argmax / argmin(column)`, `row_lookup(id)`, `conditions_of(sample)`, `which_investigations(filter)` (delegates to coverage), `compare(a, b, attribute)`, `scope_check(name)`.
- **Column resolver:** a synonym map from natural words to headers per table ("oxygen" → XO2 / O initial / Percent O2 / Calibrated initial O2; "burn time" → "Burn time; s" / "Burn Time (s)" / "burn time (sec)"; "fuel" → Fuel / Fuel Bottle / Material / Sample Type).
- **Output:** `answer_kind` (`value`, `list`, `count`, `not_reported`, `out_of_scope`), a short sentence answer, a table of the cited rows (file + record), and the computation ("max over 154 non-blank rows of column XO2").
- **Fallback:** if intent or entity confidence is low, use the existing hybrid RAG (retrieval-only or LLM) and say so.
- **UI:** the Ask page shows the "Direct answer from PSI tables" card above the evidence snippets.

---

## 7. Numbers and units verification

- **Conversions:** 1 psi = 6.894757 kPa; 1 mmHg = 0.133322 kPa; 1 atm = 101.325 kPa; 1 bar = 100 kPa; cm/s ÷ 100 = m/s; mole fraction × 100 = %.
- **Boundary test (lunar target):** 10.2 psi = 70.33 kPa = 527.49 mmHg = 0.7033 bar = 0.6941 atm. Required results:
  - FLEX rec 38 (534.3 mmHg, O2 0.34) **does not** match.
  - CFI-G normal rec 32 (0.50665 bar, 0.3926) and inverse rec 15 (0.4953817 bar, 0.30) **do** match.
  - Flame Design inverse rec 24 (0.42596796 atm, 0.85) **does** match once PSI-10 is ingested.
  - FLEX rec 122 (526.3 mmHg, O2 0.18) matches on pressure only.
- **Oxidizer stream vs ambient:** CFI-G and Flame Design inverse XO2 is the burner (oxidizer) stream, not the chamber ambient. Label it `context="oxidizer stream"` in answers and in coverage, and make ranking and coverage agree on whether it counts (decision D5).
- **Columns left unconverted with a flag:** FLEX "Burning rate; mm"; BASS-II fan and air "display" values (not velocities); SAFFIRE-II "037 mm"; BRE "3400%" and "2100%"; SPICE negative air rates; FLEX P = 0.
- **Per-column unit table:** stored in `table_specs.py` (`unit_as_given`, `unit_si`, `conversion`). A test asserts that every mapped numeric column has a declared unit.
- **Display rule:** show the source value with its source unit first, then the SI value; never only the converted value (PRD FR-05).

---

## 8. Prioritized tasks for Nov 14–15 (revised after the guidance video)

- Estimates assume one engineer plus an agent, and the existing code base.
- "Was" shows the pre-video priority and hours.
- **V** tasks are new from the video.
- The lead demo is now the **lunar raised-O2 flow**, so anything that feeds it moves up.

| # | Priority | Task | Hours | Was | Unblocks golden items |
|---|---|---|---|---|---|
| T0 | P0 | Save raw official captures (resources, PDFs, 5 new PSI JSONs, PSI-142/117 files, video metadata + transcript) into `data/sources/official/` with `MANIFEST.md` | 0.5 | P0 0.5 | all citations |
| T1 | P0 | Ingest correctness fixes (SAFFIRE-II notes, E-FIELD continuation and duplicate, cp1252, row flags) + counts fixture + fidelity tests | 2.5 | P0 2.5 | G022, G024, G056, G058 |
| T2 | P0 | Seed PSI-10, 21, 23 (all 6 ACME). Feeds the lunar flow (Flame Design inverse rows). | 2.5 | P0 2.5 | G018–G021, G044 |
| T3 | P0 | Seed 5 ground investigations + relationships; include their Analyzed / "modeling" file index (part of V6) | 2.5 | P0 2.0 | G035, G036, G060 |
| V2 | P0 | Catalog stats computed at ingest: investigation counts by type, rows, **total volume from `totalFileSize` (TB + TiB) with as-of date**, platforms; `/api/meta` + Home summary cards | 1.0 | new | G060, G061, G062 |
| T4 | P0 | Structured QA engine + "Direct answer" card | 6.0 | P0 6.0 | ~45 lookup / comparison items |
| V5 | P0 | Deterministic **interpretation templates** per investigation and per answer (what was done, varied vs constant, lunar-target relation, lenses, what cannot be concluded); optional LLM narrative hook behind D3 (off by default) | 3.0 | new | interpretation checks in harness |
| V3 + T9 | P0 | **Lead lunar flow:** default scenario page = target box → exact matching runs (coverage) → ranking (fixed: same-row atmosphere match, oxidizer-stream rule per D5) → **partial-gravity gap view** (no PSI partial-g data, LUCI / FM2 future, E-FIELD mimic, 0-g/1-g bounding with SAFFIRE-II 1-g columns) | 3.0 | T9 P1 1.5 | G044, G053, G072 |
| T5 | P0 | Golden harness (`test_golden.py`, `verify_golden.py`) incl. G060–G072, `coverage_params`, xfail bookkeeping | 3.0 | P0 2.5 | gate |
| V4 | P1 | **Three insight lenses** (protocols / suppression design / material screening): rule-based tags with quoted evidence on investigations, findings and answers; lens filter on Explorer and ranking | 2.0 | new | G070, G071 |
| T6 + V10 | P1 | Official docs ingest (fact sheets, Guide pages, NASA page, incidents, spinoffs) + **Earth-applications panel with Documented / Inferred links** + page citations | 3.5 | P1 3.0 | G038–G043, G050–G052, G070, G071 |
| T7 | P1 | Variables view (varied vs constant) + geometry / diluent fields + hardware facet and compare presets | 3.0 | P1 3.0 | brief C2b, C2d, C5, G069 |
| V6 + V7 | P1 | **PSI parity:** representative-image thumbnails (link-out, CC0 credit, no logos, ≤ 1.3 MB), version stamp, "Modeling / analyzed data" section; metadata-only **Data files tree** for 17 investigations (path, size, date) + "browse on PSI" for the other 7 | 2.5 | new | G063, G064, G065 |
| V8 | P1 | `platform` field + filter (ISS / Cygnus / Ground lab-model) + Saffire I/III hardware note; cited text mentions of drop tower / parabolic | 0.5 | new | G066, G067 |
| V9 | P1 | "Why microgravity fire differs" explainer panel (official citations only) | 1.0 | new | — |
| V11 | P1 | Analytical visuals: O2-vs-pressure scatter of all runs with the lunar target box, runs per investigation, lens coverage bars; demote file tree to a tab | 2.0 | new | — |
| T10 | P1 | Scope registry + abstention rules (partial gravity, rockets, Saffire IV–VI, sounding rockets, certification) | 1.0 | P1 1.0 | G053–G059, G067 |
| T11 | P1 | Unit boundary tests + diluent filter | 1.0 | P1 1.0 | G044, G045 |
| T8 | P2 | Modeling export (all numeric columns, source + SI units, flags, data dictionary) | 1.5 | P1 1.5 | R3 / goal 2 |
| V1 | P2 | Title check: assert "SI-Powered" everywhere in UI / README; no "AI-Powered" | 0.25 | new | — |
| T12 | P2 | PSI report PDFs page text, ASE link-only, LLM narrative live per D3 | 2–4 | P2 | stretch |

**Totals**

| Bucket | Hours |
|---|---|
| P0 | 24.0 (T0 0.5, T1 2.5, T2 2.5, T3 2.5, V2 1.0, T4 6.0, V5 3.0, V3+T9 3.0, T5 3.0) |
| P1 | 16.5 (V4 2.0, T6+V10 3.5, T7 3.0, V6+V7 2.5, V8 0.5, V9 1.0, V11 2.0, T10 1.0, T11 1.0) |
| P2 | 1.75 + 2–4 stretch |
| **P0 + P1** | **40.5 h** (was ~29 h); **with P2 core (T8, V1): 42.25 h** |

**Fitting Nov 14–15.** This is two people working about 12 h each per day, or one engineer plus agents in parallel. Cut order if behind:
1. V11 charts down to the scatter only (−1 h).
2. T7 geometry parsing (−1.5 h).
3. V6 images (−0.5 h).
4. T8 export (−1.5 h).
5. V9 explainer shortened to 5 cited bullets (−0.5 h).

**Never cut** T1–T5, V2, V3+T9, V5 and T10. They are what makes the app correct and on-message for the lunar demo.

**Order.**
- **Day 1 AM:** T0, T1, T2, T3, V2.
- **Day 1 PM:** T4, T5 (harness first, then the engine to green), V5.
- **Day 2 AM:** V3+T9, V4, T6+V10, T10, T11.
- **Day 2 PM:** V6+V7, V8, V9, V11, T7. Then deploy, run golden against live, freeze.

---

## 9. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| PSI API or S3 slow or unavailable during the demo | Missing links or ingest failure | Everything needed at boot is committed; PSI is only used for link-outs |
| Render cold start (30–60 s) during judging | Looks broken | Warm-up ping before demo; UI "waking the API" state (exists) |
| Structured QA misses phrasing | Wrong or empty answer | Synonym map + golden tests + RAG fallback that says "no direct table answer" |
| Misreading domain-specific columns ("CO" = CO2?, burning-rate unit, BASS-II final O2, oxidizer-stream XO2) | Incorrect science | Show verbatim headers; mark interpretations "Curator"; domain-lead review list (D6) |
| Source anomalies presented as facts (auto-fill fuels, 2103 date) | Credibility | Verbatim + flag; never silently "fix" |
| Golden answers drift from data | False confidence | `verify_golden.py` recomputes from CSV in CI |
| Scope creep into ~13 TB of raw data | Time and cost | Hard rule: link-out only; small PDFs only in P2 |
| Repo size and brand constraints | Hosting limits | Ingest text; keep PDFs out of git if >5 MB total; no NASA or Space Apps logos (existing rule) |
| The 133-hit `?q=combustion` link misread as "133 combustion investigations" | Wrong claims | Catalog states 24 Combustion Science investigations, with the search URL cited |
| Quoting the video's "12 TB" or "AI-Powered" | Inconsistent with data and the official title | Volume computed at ingest with as-of date (V2); title test (V1) |
| Representative images or video stills carrying logos | Brand-guide violation | Skip logo images (ACME logo) and video stills; credit "NASA PSI (CC0)" |
| Incomplete PSI file trees (7 investigations have no listing in their JSON) | Misleading "no files" | Show `totalFileSize` + "browse on PSI"; never show an empty tree as "no data" |
| Inferred Earth links read as NASA claims | Credibility | Every Earth / spinoff link labelled Documented or Inferred, with the source |
| Scope growth (40.5 h of P0+P1 in a two-day event) | Unfinished features | Strict cut order in §8; P0 is complete before any P1 |

---

## 10. Decisions for the team

- **D1.** Include the 5 ground investigations (labelled ground / modeling)? Recommended: yes.
- **D2.** Include PSI-179 ASE (aerosols, not Combustion Science)? Recommended: link-only "related" card.
- **D3.** Enable an LLM on the live demo for "interprets" (the deterministic interpretation templates in V5 ship regardless) (admin key with spend cap, or bring-your-own-key, which was deferred earlier)? Structured QA works without it.
- **D4.** Normalize auto-fill artifacts (CLD "CH5…" → "CH4", s-Flame "N3…" → "N2") in display, always with a flag? Recommended: show verbatim, plus a "likely CH4 (spreadsheet auto-fill)" flag after domain-lead OK.
- **D5.** Does an oxidizer-stream O2 ≥ 30% (CFI-G and Flame Design inverse flames) count toward the lunar-habitat atmosphere match? This affects ranking vs coverage consistency.
- **D7.** Lead demo flow = lunar raised-O2 (recommended per the video). Confirm.
- **D8.** Representative images: hotlink the PSI download URL (no repo weight) or cache small copies? Recommended: hotlink with a fallback placeholder.
- **D9.** Insight-lens tagging rules need a quick domain-lead pass (which investigations count as "protocols").
- **D6.** Domain lead (Sayket) to confirm:
  - FLEX "CO" column = CO2
  - FLEX burning-rate unit
  - BASS-II a/b final O2 rows
  - SAFFIRE-I L/W swap
  - "clear/black rod" = PMMA alias
  - ranking weights
