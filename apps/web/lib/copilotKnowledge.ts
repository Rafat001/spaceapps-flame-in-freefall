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

  // Help / What can you do
  if (/^(help|what can you do|how to use|features|commands|options)$/.test(q)) {
    return {
      text: "Here is what I can do for you:\n\n• **Direct Facts & Data**: Ask about fuel samples, test points, or conditions (e.g. *\"Where are PMMA tests?\"* or *\"How many samples in Saffire-II?\"*)\n• **Microgravity Combustion Physics**: Ask about flame spread, spherical flames, or extinction limits.\n• **In-App Pathways**: Ask where to find specific tools (3D Fire Tetrahedron, Comparison, Coverage, Lunar partial gravity).",
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
