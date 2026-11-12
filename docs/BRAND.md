# Brand compliance — NASA Space Apps

Source of truth: **NASA Space Apps Brand Guidelines, updated June 25, 2026** (20-page PDF,
<https://assets.spaceappschallenge.org/media/documents/Space_Apps_Brand_Guide_VUGpVJm.pdf>, linked from
<https://www.spaceappschallenge.org/brand/>). Page numbers below are the printed page numbers in that PDF
(the cover is "Page 0"). Naming and NASA-identifier rules come from the official terms pages cited inline.

The guide says it covers "all NASA Space Apps related media and communications" (p.1), so we apply it to this
project's site, docs and API text.

## Rules and how we apply them

| Rule | Source | Where applied |
|---|---|---|
| Event name: "NASA Space Apps Challenge" (the 2026 guide no longer says "International"); short form "NASA Space Apps". We write "2026 NASA Space Apps Challenge". | Guide p.1; [2026 Participant Terms](https://www.spaceappschallenge.org/legal/) | README, PRD, QA plan, web footer + hero kicker, API description |
| **Don't use NASA official branding** (insignia/"meatball", logotype/"worm"). | Guide p.6 (Logo Don'ts); NASA logo-use clauses in the [Local Lead](https://www.spaceappschallenge.org/local-lead-terms-and-conditions/) and [Collaborator](https://www.spaceappschallenge.org/collaborator-terms-and-conditions/) terms | No NASA marks anywhere. Our monogram is original artwork. |
| Don't use "NASA" in a way that implies NASA authorization, sponsorship or endorsement; factual use about participation is fine. | Local Lead + Collaborator terms (same pages) | Footer "Independence" note, page metadata, API description, README |
| Space Apps logo: use provided files and colorways only; never tilt, stretch, recolor, rearrange, outline, or place on busy imagery; respect the clear-space grid (p.3–5). | Guide p.2–6 | **Not used.** The guide and the participant terms don't explicitly license the logo to participant projects, so we leave it out (see "Open question"). |
| Palette: Blue Yonder #2E96F5, Neon Blue #0960E1, Electric Blue #0042A6, Deep Blue #07173F, Rocket Red #E43700, Martian Red #8E1100, Neon Yellow #EAFE07, White. | Guide p.7 | CSS tokens in `apps/web/app/globals.css` |
| Neon Yellow is an accent for text, buttons and symbols, never a background field; use it sparingly (60-30-10) for interactive or attention elements; not for headlines. | Guide p.7, p.13 | Primary buttons, active nav, focus rings, link hover, form controls only |
| Don't use color alone to carry meaning. | Guide p.7 | Every status (match / partial / Not reported / error) is also a text label |
| Optional background gradient: linear, Electric Blue (top-left) → Deep Blue (bottom-right), ~45°, smooth. | Guide p.8 | Hero "catalog index" plate |
| Text/background contrast ≥ 4.5:1 (WCAG 2.0 AA). | Guide p.9 | All text tokens checked: White 17.5:1, Neon Yellow 15.5:1, #C9D4EC 11.7:1, #A9B8DB 8.8:1, Blue Yonder 5.7:1, #FC3D21 4.8:1 on Deep Blue. Rocket Red (4.0:1) is used only in artwork, never for text. |
| Body text only on Deep Blue, Electric Blue or White; never Rocket Red backgrounds. | Guide p.12 | Site ground is Deep Blue; the plate uses the Electric→Deep gradient |
| Typefaces: Fira Sans Black/Bold (titles), Overpass Regular/Bold/Italic (body), Fira Code (code). | Guide p.11 | `next/font/google` in `apps/web/app/layout.tsx` |
| Hierarchy: H1 Fira Sans Black, all caps, 5% letter spacing, 120% leading; H2 Overpass Regular 120%; H3 Overpass SemiBold all caps 150%; buttons Overpass Bold; button text Neon Yellow + near-black. | Guide p.13–16 | `h1`/`h2`/`h3`/`button` rules in `globals.css` |
| Icons: only when meaning is unambiguous, otherwise text labels; lightweight line style. | Guide p.17 | UI keeps text labels; no icon set added |
| Photos must sit in holding shapes with no text over them. | Guide p.10 | No photography is used |
| Patterns screened to ~25% over a blue. | Guide p.19 | No patterns used |
| Hashtag **#SpaceApps**. | Footer of spaceappschallenge.org | Web footer, README |
| Cite every source used; identify licenses for non-NASA materials. | [2026 Participant Terms](https://www.spaceappschallenge.org/legal/) | Per-value provenance labels in the app; README sources |

## What we kept on purpose

- Our layout, numbered navigation, typographic "technical memo" structure and flame monogram are the project's own.
  The guide governs Space Apps' marks, palette and type, not page layout.
- Scores and meters are white / Blue Yonder rather than red, so the research-relevance ranking never reads as a hazard score.

## Open question

- **Space Apps logo on our site.** The guide explains how to use the logo but doesn't say participants may put it on
  their projects (the Collaborator terms grant that to collaborators only). We don't use it. If the team wants it,
  confirm with the organizers (community@spaceappschallenge.org) and use only the official files with the p.3–6 rules.
