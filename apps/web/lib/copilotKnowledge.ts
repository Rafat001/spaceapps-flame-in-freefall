export interface GeneralConcept {
  match: RegExp;
  summary: string;
  pathways: Array<{ label: string; href: string; badge: string; description?: string }>;
}

export const GENERAL_CONCEPTS: GeneralConcept[] = [
  {
    // Zero-g / microgravity flame spread and flame behavior
    match: /\b(zero[- ]?g|zero gravity|microgravity|freefall|space)\b.*\b(affect|spread|flame|fire|shape|behave|burn)\b|\b(flame|fire)\b.*\b(spread|shape|behavior)\b.*\b(zero[- ]?g|microgravity|space)\b/i,
    summary: `In zero gravity (microgravity), the absence of buoyancy fundamentally changes fire behavior:

• **Spherical & Diffusion-Dominated**: Without buoyant convection rising hot air, flames form rounded or spherical shapes where oxygen reaches the reaction zone purely through molecular diffusion.
• **Airflow Dependency**: In still air, flames burn cooler, slower, and often self-extinguish due to soot and combustion products accumulating around the fuel. With forced ventilation, flames spread along or against the airflow.
• **Insidious Hazard**: Spacecraft fires do not flicker or create a rising smoke plume; they drift with HVAC currents, making early detection and ventilation control critical.`,
    pathways: [
      { label: "3D Fire Dynamics Explorer", href: "/fire-dynamics", badge: "3D TOOL", description: "Interactive Fire Tetrahedron in microgravity" },
      { label: "BASS Flame Spread (PSI-26)", href: "/investigations/psi-26", badge: "DATASET", description: "122 solid fuel runs under forced airflow" },
      { label: "Fire Safety Insights", href: "/insights", badge: "INSIGHTS", description: "Core lessons learned from microgravity tests" },
    ],
  },
  {
    // PMMA / Acrylic / Plexiglas
    match: /\b(pmma|acrylic|plexiglas|plexiglass|polymethyl)\b/i,
    summary: `**PMMA (Poly(methyl methacrylate))**, commonly known as **acrylic** or **Plexiglas**, is a transparent, rigid thermoplastic polymer.

In NASA microgravity combustion research, PMMA serves as the **primary benchmark solid fuel**:
• **Why NASA tests PMMA**: Unlike many plastics that melt, boil, and drip uncontrollably, PMMA vaporizes steadily (pyrolyzes) at ~300–400 °C into methyl methacrylate gas, producing predictable, clean-burning diffusion flames.
• **Physics Insights**: Its well-characterized chemistry allows scientists to isolate how zero gravity, oxygen concentration (13.6%–22.2%), and ventilation airflow affect flame spread rates and extinction limits.
• **Tested Across NASA Missions**:
  - **BASS (PSI-26)**: 122 tests on 1–2 cm PMMA spheres and slabs in the ISS Microgravity Glovebox.
  - **BASS-II (PSI-25)**: Evaluated narrow-channel flame spread over PMMA rods and thin films (100–300 µm).
  - **Saffire-II (PSI-99)**: Large-scale burns inside Cygnus cargo spacecraft to assess real vehicle-scale hazards.`,
    pathways: [
      { label: "BASS PMMA Data (PSI-26)", href: "/investigations/psi-26?q=PMMA", badge: "DATASET", description: "122 experimental test rows" },
      { label: "BASS-II (PSI-25)", href: "/investigations/psi-25", badge: "DATASET", description: "Narrow channel PMMA runs" },
      { label: "Explorer: Search PMMA", href: "/explorer?q=PMMA", badge: "EXPLORE", description: "Filter PMMA test records" },
    ],
  },
  {
    // Nomex / Flame-resistant fabrics
    match: /\b(nomex|aramid|textile|fabric)\b/i,
    summary: `**Nomex** is a flame-resistant meta-aramid polymer fabric developed by DuPont, widely used in spacecraft cabin outfitting, flight suits, and astronaut protective gear.

• **Microgravity Behavior**: Tested in **Saffire-II (PSI-99)** alongside PMMA. In low-velocity forced airflow, adjacent PMMA was completely consumed while Nomex resisted ignition and self-extinguished once the ignition source was removed.
• **Safety Standard**: Verifying the flammability limits of Nomex in spacecraft atmospheric compositions (elevated oxygen, reduced pressure) is crucial for Artemis and ISS habitats.`,
    pathways: [
      { label: "Saffire-II (PSI-99)", href: "/investigations/psi-99", badge: "DATASET", description: "Vehicle-scale fire safety experiment" },
      { label: "Fire Safety Insights", href: "/insights", badge: "INSIGHTS", description: "Spacecraft fire prevention lessons" },
    ],
  },
  {
    // SIBAL
    match: /\bsibal\b/i,
    summary: `**SIBAL (Solid Inflammable Boundary Airflow Limit)** is a standardized NASA test fuel composed of a cotton fabric sheet with an inert fiberglass backing.

• **Purpose**: It provides a thin, reproducible cellulosic fuel that enables scientists to measure the exact low-velocity airflow limit where solid-fuel flames blow out or quench due to radiative heat loss.
• **Experiments**: Tested in BASS, BASS-II, and drop-tower facilities.`,
    pathways: [
      { label: "BASS Flame Spread (PSI-26)", href: "/investigations/psi-26", badge: "DATASET", description: "SIBAL and solid fuel tests" },
      { label: "3D Fire Dynamics Explorer", href: "/fire-dynamics", badge: "3D TOOL", description: "Airflow and boundary limits" },
    ],
  },
  {
    // BASS & BASS-II
    match: /\b(bass|bass-ii)\b/i,
    summary: `**BASS (Burning and Suppression of Solids)** was a pivotal NASA experiment conducted on the International Space Station within the Microgravity Science Glovebox (MSG):

• **Objective**: Characterized the flammability, flame spread, and extinction limits of solid fuels (PMMA spheres, slabs, rods, and fabrics) in low-velocity forced airflow.
• **Key Findings**: Proved that without gravity's buoyant draft, flames spread slower in low airspeeds but can persist in narrower flow regimes than on Earth.
• **Dataset**: Contains over 120 detailed test records in the NASA Physical Sciences Informatics (PSI) repository.`,
    pathways: [
      { label: "BASS Investigation (PSI-26)", href: "/investigations/psi-26", badge: "DATASET", description: "122 test runs" },
      { label: "BASS-II (PSI-25)", href: "/investigations/psi-25", badge: "DATASET", description: "Narrow channel flammability boundary" },
      { label: "Compare BASS vs Saffire", href: "/compare", badge: "COMPARE", description: "Side-by-side experiment comparison" },
    ],
  },
  {
    // FLEX / FLEX-2
    match: /\b(flex|flex-2|droplet)\b/i,
    summary: `**FLEX (Flame Extinction Experiment)** studied the combustion and extinction of isolated liquid fuel droplets (heptane, decane, methanol) aboard the ISS:

• **Key Discovery**: Discovered **"cool flame" combustion** in microgravity—where fuel continues to burn chemically at much lower temperatures (~500–800 K) with virtually no visible light after the hot flame extinguishes.
• **Relevance**: Crucial for clean combustion and understanding fire suppression in spacecraft.`,
    pathways: [
      { label: "FLEX Investigation (PSI-39)", href: "/investigations/psi-39", badge: "DATASET", description: "Droplet combustion records" },
      { label: "Fire Safety Insights", href: "/insights", badge: "INSIGHTS", description: "Cool flame and extinction dynamics" },
    ],
  },
  {
    // Fire Tetrahedron / Dynamics
    match: /\b(tetrahedron|tetra|triangle|fire dynamic|suppression|extinguish|chain reaction)\b/i,
    summary: `Spacecraft fire safety builds upon the **Fire Tetrahedron** (Fuel, Heat, Oxidizer, Uninhibited Chemical Reaction):

• **Oxidizer Transport**: Molecular diffusion replaces buoyancy in microgravity, meaning forced ventilation controls oxygen supply.
• **Extinction Mechanics**: Inert gaseous agents (e.g. nitrogen, CO₂) extinguish flames by cooling the flame zone and diluting oxygen below the limiting flammability boundary.
• **Interactive Simulation**: You can rotate and explore each face of the tetrahedron and test variables inside this app.`,
    pathways: [
      { label: "3D Fire Dynamics Explorer", href: "/fire-dynamics", badge: "3D TOOL", description: "Interactive 3D Fire Tetrahedron" },
      { label: "FLEX Droplet Extinction (PSI-39)", href: "/investigations/psi-39", badge: "DATASET", description: "Droplet combustion & extinction limits" },
    ],
  },
  {
    // Heat Release Rate (HRR)
    match: /\b(heat release rate|hrr|rate of heat release)\b/i,
    summary: `**Heat Release Rate (HRR)** is the rate at which heat energy is generated by a burning fuel (typically measured in kW or W/m²). It is considered the **single most critical parameter in fire safety engineering**:

• **Why HRR matters**: A fire's size, growth rate, and potential to cause flashover are directly driven by HRR. Higher HRR feeds more thermal radiation back onto unburnt fuel, accelerating flame spread.
• **In Microgravity**: Without buoyancy to carry away hot combustion products, heat dissipation relies on radiation and forced cabin airflow. In low airspeeds, HRR drops, but fires can persist longer without self-extinguishing.
• **NASA Measurement Context**: Direct cone-calorimeter HRR curves are typically standard ground tests; NASA flight experiments (like BASS and Saffire) instead measure related metrics: flame length, pyrolyzed mass loss rate, and flammability boundary limits under forced airflow.`,
    pathways: [
      { label: "3D Fire Dynamics Explorer", href: "/fire-dynamics", badge: "3D TOOL", description: "Interactive Fire Tetrahedron & heat factors" },
      { label: "Fire Safety Insights", href: "/insights", badge: "INSIGHTS", description: "Thermal and suppression dynamics" },
      { label: "BASS Flame Spread (PSI-26)", href: "/investigations/psi-26", badge: "DATASET", description: "Solid fuel burning rates" },
    ],
  },
  {
    // Flame Spread Rate
    match: /\b(flame spread rate|spread rate|how fast.*flame.*spread)\b/i,
    summary: `**Flame Spread Rate** is the velocity at which the leading edge of a flame front moves across a combustible solid or liquid surface (typically measured in mm/s or cm/s):

• **Concurrent vs Opposed Flow**: In spacecraft, flame spread depends heavily on HVAC airflow direction:
  - **Concurrent (wind-aided)**: Flame moves in the direction of the airflow, spreading significantly faster.
  - **Opposed flow**: Flame spreads into oncoming air, moving slower but pre-heating the upstream surface.
• **Microgravity Effect**: Without gravity's rising plume, flame spread is slower in still air, but sustained ventilation currents can produce steady, insidious propagation.
• **NASA Data**: Measured across hundreds of runs in **BASS (PSI-26)** and **BASS-II (PSI-25)** for PMMA slabs, spheres, and fabrics.`,
    pathways: [
      { label: "BASS Flame Spread (PSI-26)", href: "/investigations/psi-26", badge: "DATASET", description: "122 flame spread test runs" },
      { label: "3D Fire Dynamics Explorer", href: "/fire-dynamics", badge: "3D TOOL", description: "Simulate concurrent vs opposed airflow" },
    ],
  },
  {
    // Limiting Oxygen Index (LOI) / Flammability Limit
    match: /\b(limiting oxygen index|loi|flammability limit|extinction limit|oxygen limit)\b/i,
    summary: `**Limiting Oxygen Index (LOI)** (or **Limiting Flammability Index**) is the minimum volumetric concentration of oxygen in an atmosphere that can support sustained flaming combustion:

• **Spacecraft Atmospheres**: Spacecraft cabins often operate under non-standard atmospheres (e.g. 30%–34% O₂ at 8.2 psi for spacewalk pre-breathe), which dramatically lowers ignition resistance and raises burning intensity.
• **Microgravity Shift**: The microgravity flammability boundary differs from Earth: at very low airflows, materials extinguish at higher oxygen levels because radiative heat loss outpaces heat generation.
• **Experiments**: Measured in **BASS-II (PSI-25)** (oxygen levels 13.6%–22.2%) and **Saffire-II (PSI-99)**.`,
    pathways: [
      { label: "BASS-II (PSI-25)", href: "/investigations/psi-25", badge: "DATASET", description: "Narrow-channel flammability limits" },
      { label: "Saffire-II (PSI-99)", href: "/investigations/psi-99", badge: "DATASET", description: "Vehicle-scale extinction thresholds" },
    ],
  },
  {
    // Pyrolysis
    match: /\b(pyrolysis|pyrolyze|thermal decomposition)\b/i,
    summary: `**Pyrolysis** is the irreversible thermal decomposition of solid materials into combustible gases and char caused by heat, occurring before flaming begins:

• **How it works**: Solid polymers (like PMMA acrylic) don't burn directly; heat breaks polymer bonds, converting the solid into flammable monomer gas that mixes with atmospheric oxygen to burn.
• **In Microgravity**: The absence of buoyant plume draft causes a thicker vapor boundary layer over the fuel, altering the pyrolysis gas transfer rate and flame detachment distance.`,
    pathways: [
      { label: "BASS PMMA Data (PSI-26)", href: "/investigations/psi-26?q=PMMA", badge: "DATASET", description: "Solid fuel thermal breakdown" },
      { label: "3D Fire Dynamics Explorer", href: "/fire-dynamics", badge: "3D TOOL", description: "Fuel and heat reaction zone" },
    ],
  },
  {
    // Moon / Mars / Partial Gravity
    match: /\b(moon|lunar|mars|martian|partial[- ]gravity|regolith|0\.16|0\.38)\b/i,
    summary: `Partial gravity environments (Lunar 0.16g, Martian 0.38g) introduce unique fire hazards:

• **The Low-Buoyancy Zone**: Weak buoyancy is just strong enough to feed oxygen continuously, but not strong enough to blow out the flame or carry heat away rapidly.
• **Insidious Combustion**: Smoldering and slow flame spread can occur under partial gravity without the dramatic flames observed in terrestrial 1g.
• **Evidence Status**: Current PSI records are microgravity (0g) and Earth (1g); NASA plans dedicated partial gravity tests (LUCI/FM2) for upcoming missions.`,
    pathways: [
      { label: "Lunar & Martian Partial Gravity", href: "/lunar", badge: "EVIDENCE", description: "Partial gravity analysis & projections" },
      { label: "Evidence Coverage Analysis", href: "/coverage", badge: "COVERAGE", description: "Check parameter coverage across datasets" },
    ],
  },
  {
    // Saffire / Large Scale Tests
    match: /\bsaffire\b/i,
    summary: `The **Saffire (Spacecraft Fire Safety)** series conducted real-scale material burns inside Cygnus cargo vehicles after uncoupling from the International Space Station:

• **Saffire-II (PSI-99)**: Evaluated flammability limits and flame spread over PMMA, Nomex, and composite fabrics in low-speed forced airflow.
• **Relevance**: Bridges the gap between small laboratory glovebox tests and full vehicle-scale fires.`,
    pathways: [
      { label: "Saffire-II (PSI-99)", href: "/investigations/psi-99", badge: "DATASET", description: "Vehicle-scale fire safety experiment" },
      { label: "Compare with BASS", href: "/compare", badge: "COMPARE", description: "Compare Saffire vs BASS parameters" },
    ],
  },
  {
    // CFD / Computational Fluid Dynamics
    match: /\b(cfd|computational fluid dynamics|fluid simulation|flow simulation)\b/i,
    summary: `**CFD (Computational Fluid Dynamics)** is the use of high-performance computers, fluid physics equations (Navier-Stokes), and numerical computer simulation modeling to simulate how air, gases, and flames move and react.

• **What it is in plain English**: Instead of having to start real, hazardous fires in space to test every emergency scenario, NASA engineers create a digital 3D "virtual wind tunnel" on computers.
• **Why it matters in microgravity**: On Earth, gravity causes hot air to rise automatically. In space, fire and smoke depend completely on ventilation fans. CFD simulation predicts exactly how flames spread through spacecraft ventilation ducts and where toxic smoke gathers.
• **NASA Investigations**: CFD models are calibrated against real ISS flight data from **BASS**, **ACME**, and **Saffire** to verify fire safety designs for the Artemis Moon missions and Lunar Gateway.`,
    pathways: [
      { label: "3D Fire Dynamics Explorer", href: "/fire-dynamics", badge: "3D TOOL", description: "Interactive 3D airflow and dynamics" },
      { label: "ACME Investigations", href: "/explorer?q=ACME", badge: "DATASET", description: "Gas-fueled microgravity experiments" },
      { label: "Fire Safety Insights", href: "/insights", badge: "INSIGHTS", description: "Simulation and prevention insights" },
    ],
  },
  {
    // Cool Flames
    match: /\b(cool flame|cool flames|low temperature combustion)\b/i,
    summary: `**Cool Flames** are low-temperature chemical flames (~500–800 K) that burn with virtually no visible soot or glow, discovered by NASA during droplet combustion experiments aboard the International Space Station:

• **How they work**: While a normal candle burns hot (~1500–2000 K) via rapid radical chain reactions, cool flames sustain themselves through slow, low-temperature oxidation of intermediate hydrocarbons.
• **Why microgravity matters**: On Earth, buoyant convection cools and blows out low-temperature flames before they can stabilize. In zero-g, the absence of buoyancy allows cool flames to sustain themselves in a stable spherical shell.
• **Experiments**: Discovered in **FLEX (PSI-39)** with liquid fuel droplets and studied in **ACME CFI (PSI-159)** with gaseous fuels.`,
    pathways: [
      { label: "FLEX Investigation (PSI-39)", href: "/investigations/psi-39", badge: "DATASET", description: "Droplet cool flame tests" },
      { label: "ACME CFI-G (PSI-159)", href: "/investigations/psi-159", badge: "DATASET", description: "Gaseous cool flame research" },
    ],
  },
  {
    // Overall App / Flame in Freefall Overview
    match: /\b(this app|the app|about the app|about this app|flame in freefall|what can (i|you) do (here|in this app)|how does this app work|overview of the app|purpose of this app)\b/i,
    summary: `**Flame in Freefall** is an interactive NASA Space Apps research explorer that transforms complex microgravity combustion data into accessible, evidence-grounded fire safety insights:

• **3D Fire Dynamics**: Rotate and interact with the **Fire Tetrahedron** in 0g vs 1g.
• **Evidence Explorer**: Search and filter over **1,980 test records across 24 NASA flight experiments** (BASS, Saffire, FLEX, etc.).
• **Cross-Investigation Comparison**: Compare experimental parameters across different flight investigations side-by-side.
• **Lunar & Martian Scenarios**: Explore how partial gravity (0.16g Moon, 0.38g Mars) impacts flammability risks.
• **Dr. Spark (Your Co-Pilot)**: Ask conceptual physics questions, look up test measurements, or get guided pathways to the right tools.`,
    pathways: [
      { label: "3D Fire Dynamics Explorer", href: "/fire-dynamics", badge: "3D TOOL", description: "Simulate zero-g fire physics" },
      { label: "Evidence Explorer", href: "/explorer", badge: "EXPLORE", description: "Search 1,980+ PSI test runs" },
      { label: "Compare Investigations", href: "/compare", badge: "COMPARE", description: "Side-by-side comparison" },
      { label: "Lunar & Partial Gravity", href: "/lunar", badge: "LUNAR", description: "Moon & Mars fire projections" },
    ],
  },
  {
    // Smoke detection & spacefire history
    match: /\b(smoke|detector|detection|alarm|apollo|mir)\b/i,
    summary: `Smoke detection in microgravity differs from Earth due to lack of thermal plume rise:

• **Airflow-Driven Transport**: Particles do not rise to the ceiling; they follow HVAC return vents and cabin circulation loops.
• **SpaceFire History**: Historical spacecraft fires (Apollo 1, Apollo 13, Mir 1997) drove rapid advances in non-offgassing materials, high-pressure breathing equipment, and low-velocity particulate sensors.`,
    pathways: [
      { label: "SpaceFire Evolution", href: "/#spacefire", badge: "HISTORY", description: "Lessons from Apollo 1, Mir & technology evolution" },
      { label: "Fire Safety Insights", href: "/insights", badge: "INSIGHTS", description: "Spacecraft fire detection insights" },
    ],
  },
];

/**
 * Project FAQ: answers about combustion science basics and about how THIS app works (rankings, data sources,
 * coverage, the assistant itself). Checked before the general concepts and before any API call, so these questions
 * get an immediate, accurate answer even when the API or LLM is unavailable.
 * Facts here mirror apps/api (ranking.py WEIGHTS, scenarios.py, README scope rule); keep them in sync.
 */
export const PROJECT_FAQ: GeneralConcept[] = [
  {
    // Rankings / scenario fit
    match: /\b(rank\w*|scenario fit|fit score|scor(e|es|ing|ed)|weight(s|ing)|criteria)\b/i,
    summary: `**How the rankings are made** — each NASA investigation gets one **scenario-fit score out of 100** for the scenario you pick (Lunar habitat, Pressurized lunar rover, Spacecraft / ISS cabin, or Mars habitat). The list always runs highest to lowest.

The score is the sum of six criteria, **the same six for every scenario**:

• **Tests at target atmosphere — up to 30 pts**: PSI test rows that hit the scenario's oxygen **and** pressure target on the same row.
• **Oxygen match — up to 15 pts**: rows whose O₂ matches the target (any pressure).
• **Pressure match — up to 10 pts**: rows whose pressure matches the target (any O₂).
• **Tested materials — up to 25 pts**: full points for spacecraft materials NASA names (cotton-fiberglass, Nomex, PMMA, Teflon, Kapton, silicone rubber); fewer for other solids; fewer still for liquid or gas fuels.
• **Flame behaviour evidence — up to 10 pts**: flame spread, flammability, ignition or extinction in the PSI record.
• **Detection / suppression — up to 10 pts**: suppression or smoke-detection evidence in the PSI record.

How the details work:
• **Diminishing returns**: the three atmosphere criteria are log-scaled by row count — 1 matching row ≈ 18 % of the points, 8 rows ≈ 56 %, 50+ rows = 100 %. The first rows count most, but more rows always earn more.
• **Where targets come from**: only official sources — e.g. the challenge brief's Moon Base expectation of **≥ 30 % O₂ at ≤ 10.2 psi**, and ISS cabin air of nominally 21 % O₂ at one atmosphere.
• **Ties** are broken by more rows at the target, then a more complete PSI record, then name.
• **Unknown values never match**, and every non-zero criterion carries a citation you can click.

⚠️ This is **research fit, not a hazard or safety rating** — a high score means "lots of relevant test evidence exists", not "this material is dangerous/safe". The weights are product hypotheses pending domain-expert review.`,
    pathways: [
      { label: "Scenario Ranking", href: "/insights", badge: "RANKING", description: "Ranked investigations with per-criterion points" },
      { label: "Ranking on the home page", href: "/", badge: "HOME", description: "Best scenario fit with the explainer" },
      { label: "Explorer: sort by scenario fit", href: "/explorer", badge: "EXPLORE", description: "Every result shows its scenario rank" },
    ],
  },
  {
    // Scenarios & target atmospheres
    match: /\b(scenarios?|target atmospheres?|which atmosphere|atmosphere targets?)\b/i,
    summary: `The app ranks evidence against four **application scenarios**, each with a target atmosphere taken only from official sources:

• **Lunar habitat (Moon Base)** — O₂ **≥ 30 %**, pressure **≤ 10.2 psi** (official challenge brief).
• **Pressurized lunar rover** — same expectation as the Moon Base (the brief groups them).
• **Spacecraft / space station cabin** — ISS "air": nominally **21 % O₂ at one atmosphere** (NASA ISS combustion guide); the app counts 20–22 % O₂ and 14.2–15.2 psi as a match (a stated team tolerance, not a NASA value).
• **Mars surface habitat** — the resources name Martian bases as a target environment but give no numeric atmosphere, so no numeric target is claimed.

Remember: PSI has **no partial-gravity combustion data yet**, so microgravity results don't directly establish Moon or Mars behaviour.`,
    pathways: [
      { label: "Scenario Ranking", href: "/insights", badge: "RANKING" },
      { label: "Lunar & Martian Partial Gravity", href: "/lunar", badge: "LUNAR" },
      { label: "Coverage Matrix", href: "/coverage", badge: "COVERAGE" },
    ],
  },
  {
    // What is combustion science
    match: /\bcombustion science\b|\bwhat (is|are) combustion\b|\bdefin\w* (of )?combustion\b|\bcombustion\b.{0,20}\b(mean|meaning|definition)\b|\bexplain combustion\b/i,
    summary: `**Combustion science** is the study of how things burn — the chemistry and physics of fuel reacting with an oxidizer (usually oxygen) to release heat and light.

It looks at questions like:
• **Ignition** — what it takes for a material to catch fire (temperature, oxygen level, heat source).
• **Flame spread** — how fast and in which direction a flame moves over a surface.
• **Extinction** — when and why flames go out (too little oxygen, too much heat loss, airflow too weak or too strong).
• **Products** — soot, smoke and toxic gases a fire produces.

**Why NASA studies it in microgravity**: on Earth, hot gases rise (buoyancy), which feeds flames fresh oxygen and gives them their teardrop shape. In space there's no "up", so flames become round, slower and dominated by diffusion and ventilation airflow. Removing gravity lets scientists see the underlying physics clearly — and it's essential for **fire safety on spacecraft, the ISS, and future Moon and Mars habitats**.

NASA's Physical Sciences Informatics (PSI) system archives these experiments (e.g. **BASS**, **Saffire**, **FLEX**, **ACME**), and this app lets you explore that evidence.`,
    pathways: [
      { label: "3D Fire Dynamics Explorer", href: "/fire-dynamics", badge: "3D TOOL", description: "Fire Tetrahedron in 0g vs 1g" },
      { label: "Learning FireLab", href: "/firelab", badge: "LEARN", description: "Hands-on BASS-II experiment" },
      { label: "Evidence Explorer", href: "/explorer", badge: "EXPLORE", description: "24 NASA combustion investigations" },
    ],
  },
  {
    // Why study fire in space
    match: /\bwhy (does|do|did|would) nasa (study|research|test|burn|care)\b|\bwhy (study|research|test) (fire|flames?|combustion) in (space|microgravity|orbit)\b|\bwhy (is|are) (fire|spacecraft fire) (so )?dangerous\b/i,
    summary: `NASA studies fire in microgravity for two reasons:

• **Crew safety**: a fire on a spacecraft is one of the most dangerous emergencies — there's nowhere to evacuate, the air supply is limited, and smoke doesn't rise to a ceiling. Apollo 1 (1967) and the Mir fire (1997) showed how serious it can be.
• **Better science**: removing buoyancy reveals combustion physics that gravity normally hides, like spherical flames and "cool flames" discovered in the FLEX droplet experiments.

The results shape material selection, ventilation design, smoke detection and suppression for the ISS, Artemis and future lunar and Martian habitats.`,
    pathways: [
      { label: "SpaceFire Evolution", href: "/spacefire", badge: "HISTORY", description: "50 years of spacecraft fire safety" },
      { label: "Fire Safety Insights", href: "/insights", badge: "INSIGHTS" },
    ],
  },
  {
    // Data sources / PSI
    match: /\bwhat is (the )?psi\b|\bphysical sciences informatics\b|\b(data ?sources?|sources? of (the )?data|corpus)\b|\bwhere (does|do|did) (the|this|your|all the) (data|information|evidence|answers?) come from\b|\bwhat (data|sources?) (do|does) (you|dr\.? spark|the app|this app) use\b/i,
    summary: `All data comes from **official NASA Space Apps challenge resources** — nothing from the open web:

• **NASA PSI (Physical Sciences Informatics)** — NASA's public archive of space-station physical-science experiments. The app indexes **24 PSI Combustion Science records** (19 microgravity + 5 ground/modeling studies) and all of their experimental test tables.
• **NASA fact sheets** (8) and the **Researcher's Guide** to combustion in reduced gravity on the ISS.
• **The challenge brief** (scenario targets such as the Moon Base atmosphere).
• **Historical incident pages** (Apollo 1, Apollo 13, Mir), NASA spinoff pages, the NASA Combustion Science page and the challenge guidance video transcript.

Every answer cites the exact record, field, table row or page it came from, and if the sources can't answer a question, I say so instead of guessing.`,
    pathways: [
      { label: "Evidence Explorer", href: "/explorer", badge: "EXPLORE", description: "Browse all indexed investigations" },
      { label: "Beyond PSI", href: "/beyond-psi", badge: "PROGRAMS", description: "Programs named by NASA but not in PSI" },
    ],
  },
  {
    // How Dr. Spark / the assistant works, reliability
    match: /\bhow do (you|dr\.? spark) (work|answer|know|find)\b|\bwhere do you get\b|\b(are you|is dr\.? spark|is (this|the) (ai|assistant)) (accurate|reliable|correct|trustworthy)\b|\bcan i trust\b|\bhallucinat\w*\b|\bhow (are|is) (the )?(answers?|citations?) (made|generated|produced)\b|\bwhat (are|is) (the )?(\[?s\d\]?|citations?)\b/i,
    summary: `Here's how I answer:

1. **Scope check** — I only handle questions about microgravity combustion, NASA's PSI evidence, and this app.
2. **Built-in knowledge** — core concepts (PMMA, cool flames, flame spread, how rankings work…) are answered instantly from curated explanations.
3. **Computed answers** — data questions ("how many tests used PMMA?") are computed directly from the PSI tables.
4. **Retrieval** — otherwise I search the indexed NASA sources and, if an AI model is enabled, summarise **only those sources**, with a citation like **[S1]** on every fact.
5. **Abstain** — if the evidence is weak or missing, I say so rather than invent an answer. Numbers not found in any source are flagged.

So: trust the citations, click through to the primary record for anything important, and remember this is **decision support, not a safety certification**.`,
    pathways: [
      { label: "Deep Research (Ask page)", href: "/assistant", badge: "RESEARCH", description: "Full answers with sources" },
      { label: "AndroFlame architecture", href: "/androflame", badge: "ABOUT" },
    ],
  },
  {
    // AI model / bring your own key
    match: /\b(byok|bring your own key|own (groq |api )?key|which (ai|model|llm)|what (ai|model|llm)|(ai|llm) (model|provider)|groq|gpt[- ]?oss|ai settings)\b/i,
    summary: `**AI model**: optional AI summaries use **GPT OSS 120B on Groq**. Without any AI model the app still works — it gives **computed direct answers** from the PSI tables plus the retrieved sources.

**Bring your own key (optional)**: on the **AI Settings** page you can paste your own Groq key. It is:
• kept only in **your browser tab** (sessionStorage, cleared when you close the tab);
• sent over HTTPS **only** with AI requests (questions and investigation overviews);
• used for that one request — never stored, logged or returned by the server.

(I can't share the project's own keys or any internal configuration.)`,
    pathways: [
      { label: "AI Settings", href: "/settings", badge: "SETTINGS" },
      { label: "Deep Research (Ask page)", href: "/assistant", badge: "RESEARCH" },
    ],
  },
  {
    // Limitations / certification / safety rating
    match: /\b(limitations?|certif\w*|safety rating|hazard (score|rating)|is (it|this) a (safety|hazard)|caveats?|disclaimer)\b/i,
    summary: `Important limits of **Flame in Freefall**:

• **Decision support / discovery only** — not a certified fire-risk calculator, materials qualification system, or spacecraft safety authority. No result certifies a material as safe.
• **Scenario fit ≠ hazard**: a high ranking means "lots of relevant test evidence", not "dangerous" or "safe".
• **No partial-gravity data**: PSI has no Moon/Mars-gravity combustion data yet; microgravity results don't directly establish lunar or Martian behaviour (future experiments like LUCI and FM2 aim to fill this gap).
• **Indexed sources only**: answers come from the official challenge resources; if they don't cover something, the app says so.`,
    pathways: [
      { label: "Lunar & Martian Partial Gravity", href: "/lunar", badge: "LUNAR" },
      { label: "Coverage Matrix", href: "/coverage", badge: "COVERAGE" },
    ],
  },
  {
    // Coverage matrix
    match: /\bcoverage( matrix)?\b|\bhas (work|research|testing) (already )?been done\b|\b(gap|gaps) in (the )?(data|evidence|research)\b/i,
    summary: `The **Coverage Matrix** answers *"has work already been done for these parameters?"*

You pick conditions — material, oxygen %, pressure, airflow, gravity regime, hardware, measurement type — and each investigation is marked **matched / mismatched / unknown** per parameter. Run-level conditions (material, O₂, pressure, airflow) must all hold on the **same test run**, and unknown never counts as a match. The overlap score is matched ÷ requested for the best run.

It only says what the indexed catalog documents — it never claims work doesn't exist anywhere.`,
    pathways: [
      { label: "Coverage Matrix", href: "/coverage", badge: "COVERAGE" },
      { label: "Evidence Explorer", href: "/explorer", badge: "EXPLORE" },
    ],
  },
  {
    // App pages / features tour
    match: /\b(what (pages|features|tools|sections) (are there|does (this|the) app have|can i use)|list (of )?(the )?(pages|features|tools)|tour of (the|this) (app|site)|what can i do (here|on this site|in this app))\b/i,
    summary: `Here's a quick tour of **Flame in Freefall**:

• **Learning FireLab** — hands-on BASS-II ISS experiment and flame-front extraction.
• **Fire Dynamics Explorer** — interactive 3D Fire Tetrahedron, 0g vs 1g, linked to NASA evidence.
• **Catalog Explorer** — search and filter the 24 NASA combustion investigations and their test tables.
• **Coverage Matrix** — check which O₂ / pressure / airflow / material combinations have been tested.
• **Compare Studies** — side-by-side multi-study comparison.
• **Scenario Ranking** — research-fit scores for Lunar, Mars and ISS scenarios.
• **SpaceFire Evolution** — 50-year timeline of spacecraft fire safety.
• **Beyond PSI** — NASA programs named in the resources but not in PSI.
• **Ask (Deep Research)** — full cited answers from the NASA sources.`,
    pathways: [
      { label: "Learning FireLab", href: "/firelab", badge: "LEARN" },
      { label: "Catalog Explorer", href: "/explorer", badge: "EXPLORE" },
      { label: "Scenario Ranking", href: "/insights", badge: "RANKING" },
    ],
  },
  {
    // Space Apps challenge / project origin
    match: /\b(space apps|hackathon|which challenge|what challenge|who (built|made|created|developed) (this|the) (app|site|project|website)|about (this|the) project|what is this project)\b/i,
    summary: `**Flame in Freefall** was built for the **2026 NASA Space Apps Challenge** (the *Flame in Freefall* fire-safety challenge)

It's a research-discovery dashboard over NASA's PSI combustion investigations that helps researchers answer *"has work already been done for these parameters?"* — inspecting, comparing and ranking experiments by research relevance, and asking evidence-grounded questions with citations.`,
    pathways: [
      { label: "AndroFlame introduction", href: "/androflame", badge: "ABOUT" },
      { label: "Catalog Explorer", href: "/explorer", badge: "EXPLORE" },
    ],
  },
];

/** Answer questions about the project itself (rankings, data sources, limits, pages) and combustion-science basics. */
export function getProjectAnswer(query: string): GeneralConcept | null {
  const q = query.trim();
  for (const c of PROJECT_FAQ) {
    if (c.match.test(q)) return c;
  }
  return null;
}

/** Check if the query matches a known generalized fire science concept */
export function getGeneralConcept(query: string): GeneralConcept | null {
  const q = query.trim();
  for (const c of GENERAL_CONCEPTS) {
    if (c.match.test(q)) {
      return c;
    }
  }
  return null;
}

export interface ConversationalReply {
  text: string;
  pathways: Array<{ label: string; href: string; badge: string; description?: string }>;
}

/** Handles pure conversational pleasantries, greetings, identity, and help gracefully */
export function getConversationalReply(query: string): ConversationalReply | null {
  const q = query.trim().toLowerCase().replace(/[.,!?;:]/g, "");

  // Thanks / appreciation
  if (/\b(thanks?|thank you|thx|ty|appreciate it)\b/.test(q)) {
    return {
      text: "You're welcome! Let me know if you need to look up more NASA fire experiments, check specific fuels like PMMA, or explore 3D fire dynamics.",
      pathways: [
        { label: "3D Fire Dynamics Explorer", href: "/fire-dynamics", badge: "3D TOOL" },
        { label: "Evidence Explorer", href: "/explorer", badge: "EXPLORE" },
      ],
    };
  }

  // Acknowledgments & positive confirmations ("good", "understood", "got it", "cool", "great", "makes sense", "ok", "awesome", "perfect", "clear now")
  if (
    /^(good|great|awesome|perfect|nice|understood|got it|makes sense|clear now|ok|okay|cool|yep|yes|sure|roger|i understand|noted|sounds good)\b/.test(q)
  ) {
    return {
      text: "Glad that makes sense! What would you like to explore next? You can ask about other NASA experiments (like **BASS** or **Saffire**), specific fuels like **PMMA**, or test out our **3D Fire Dynamics** tool.",
      pathways: [
        { label: "3D Fire Dynamics Explorer", href: "/fire-dynamics", badge: "3D TOOL" },
        { label: "Evidence Explorer", href: "/explorer", badge: "EXPLORE" },
        { label: "Compare BASS vs Saffire", href: "/compare", badge: "COMPARE" },
      ],
    };
  }

  // Greetings
  if (/^(hi|hello|hey|greetings|good morning|good afternoon|good evening|howdy)\b/.test(q)) {
    return {
      text: "Hello! I'm **Dr. Spark**, your NASA microgravity combustion research co-pilot. How can I assist you with fire safety evidence, flame dynamics, or finding datasets inside this explorer today?",
      pathways: [
        { label: "Evidence Explorer", href: "/explorer", badge: "EXPLORE" },
        { label: "3D Fire Dynamics Explorer", href: "/fire-dynamics", badge: "3D TOOL" },
        { label: "Deep Research in Ask Page", href: "/assistant", badge: "RESEARCH" },
      ],
    };
  }

  // AI Identity & Persona ("do you an ai", "are you an ai", "are you a bot", "who are you")
  if (
    /\b(do you an ai|are you an ai|are you ai|you an ai|are you a bot|are you a robot|are you human|who made you|who created you|are you real)\b/.test(q) ||
    /^(who are you|what are you|what is dr spark|tell me about yourself|introduce yourself)$/.test(q)
  ) {
    return {
      text: "Yes, I am **Dr. Spark**—an AI co-pilot built specifically for the **Flame in Freefall** microgravity combustion explorer! I combine NASA Physical Sciences Informatics (PSI) flight records with combustion physics and in-app navigation to help you understand how fire behaves in space.",
      pathways: [
        { label: "3D Fire Dynamics Explorer", href: "/fire-dynamics", badge: "3D TOOL" },
        { label: "Evidence Explorer", href: "/explorer", badge: "EXPLORE" },
      ],
    };
  }

  // How are you
  if (/\bhow are you\b|\bhow'?s it going\b/.test(q)) {
    return {
      text: "I'm running hot — like a well-ventilated flame! 🔥 What would you like to explore: combustion science, NASA's PSI experiments, or how this app works?",
      pathways: [
        { label: "Evidence Explorer", href: "/explorer", badge: "EXPLORE" },
        { label: "Scenario Ranking", href: "/insights", badge: "RANKING" },
      ],
    };
  }

  // Help / What can you do
  if (/^(help|what can you do|what do you do|how (do i|to) use (you|this)|how to use|features|commands|options)$/.test(q)) {
    return {
      text: "Here is what I can do for you:\n\n• **Combustion Science**: Ask about flame spread, spherical flames, cool flames, extinction limits (e.g. *\"What is combustion science?\"*)\n• **NASA Evidence & Data**: Ask about fuels, test points or conditions (e.g. *\"Where are PMMA tests?\"* or *\"How many samples in Saffire-II?\"*)\n• **How the App Works**: Ask how the rankings are made, where the data comes from, or what the Coverage Matrix does.\n• **In-App Pathways**: Ask where to find specific tools (3D Fire Tetrahedron, Comparison, Coverage, Lunar partial gravity).\n\nI stick to this project — I won't answer unrelated questions or share any keys or internal configuration.",
      pathways: [
        { label: "3D Fire Dynamics Explorer", href: "/fire-dynamics", badge: "3D TOOL" },
        { label: "Compare Investigations", href: "/compare", badge: "COMPARE" },
        { label: "Evidence Explorer", href: "/explorer", badge: "EXPLORE" },
      ],
    };
  }

  // Goodbye
  if (/^(bye|goodbye|see you|cya|farewell)$/.test(q)) {
    return {
      text: "Safe travels! I'll be right here in the corner whenever you need to explore more spacecraft fire safety evidence.",
      pathways: [],
    };
  }

  return null;
}

/** Provides simplified, analogy-driven explanations when users ask for clarification */
export function getSimplifiedConcept(topic: string): ConversationalReply | null {
  const t = topic.trim().toLowerCase();

  if (/\b(cfd|computational fluid|flow simulation)\b/.test(t)) {
    return {
      text: `Let's make **CFD** super simple:

Think of **CFD (Computational Fluid Dynamics)** like a weather forecast or video game physics engine, but for fire and air.
• **The Problem**: Building a spacecraft and intentionally setting fires on the space station is dangerous and costs hundreds of millions of dollars.
• **The Solution**: Engineers draw the spacecraft on a supercomputer. The computer calculates the airflow from the ventilation fans and predicts exactly where the fire will spread and where smoke will pool.
• **Bottom line**: CFD is **virtual fire testing on computers** using fluid physics math.`,
      pathways: [
        { label: "3D Fire Dynamics Explorer", href: "/fire-dynamics", badge: "3D TOOL" },
        { label: "ACME Investigations", href: "/explorer?q=ACME", badge: "DATASET" },
      ],
    };
  }

  if (/\b(pmma|acrylic|plexiglas)\b/.test(t)) {
    return {
      text: `In simple terms:

**PMMA** is just the chemical name for **acrylic glass** (Plexiglas).
• **Why NASA burns it**: Most plastics melt into bubbling, dripping liquids when heated, making tests messy. PMMA turns directly into clean gas vapor at ~350 °C.
• **The result**: It is NASA's standard "benchmark plastic" for cleanly comparing how flames spread in zero-g vs Earth.`,
      pathways: [
        { label: "BASS PMMA Data (PSI-26)", href: "/investigations/psi-26?q=PMMA", badge: "DATASET" },
        { label: "Explorer: Search PMMA", href: "/explorer?q=PMMA", badge: "EXPLORE" },
      ],
    };
  }

  return null;
}
