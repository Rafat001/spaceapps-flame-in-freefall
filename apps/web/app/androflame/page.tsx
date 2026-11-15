"use client";
import Link from "next/link";
import Mark from "@/components/Mark";
import { PageHead } from "@/components/ui";

const INSTRUMENTS = [
  {
    href: "/explorer",
    title: "Catalog Explorer",
    badge: "01 · Database",
    tagline: "Search 24 NASA PSI investigations & experimental tables",
    desc: "Filter by material, oxygen concentration, absolute pressure, airflow velocity, and platform. Inspect verbatim table cells, measurement types, and source citations.",
  },
  {
    href: "/coverage",
    title: "Coverage Matrix",
    badge: "02 · Analysis",
    tagline: "Test planned study conditions against real flight rows",
    desc: "Enter target O₂ %, pressure, and airflow to see exactly which investigations report data at those parameters, and identify uncharted microgravity gaps.",
  },
  {
    href: "/compare",
    title: "Multi-Study Compare",
    badge: "03 · Synthesis",
    tagline: "Side-by-side multi-investigation data matrix",
    desc: "Compare up to 3 investigations across 20+ experimental dimensions, hardware chambers, diagnostic sensors, and flame suppression protocols.",
  },
  {
    href: "/insights",
    title: "Scenario Ranking",
    badge: "04 · Scenarios",
    tagline: "Research relevance scoring across spaceflight habitats",
    desc: "Deterministic 0–100 relevance models for Lunar Surface Habitats, Mars Transit Vehicles, and Space Stations based on environmental targets.",
  },
  {
    href: "/assistant",
    title: "Grounded AI Assistant",
    badge: "05 · Intelligence",
    tagline: "Ask evidence-backed questions with numbered citations",
    desc: "Query the entire corpus with strict evidence grounding. Answers cite specific test rows [S#] and NASA publications with zero hallucinations.",
  },
  {
    href: "/spacefire",
    title: "SpaceFire Evolution",
    badge: "06 · History",
    tagline: "Timeline from early Spacelab to Artemis exploration",
    desc: "The 50-year flight experiment roadmap tracing how NASA evolved microgravity combustion research toward deep-space human exploration.",
  },
  {
    href: "/beyond-psi",
    title: "Beyond PSI",
    badge: "07 · Programs",
    tagline: "External flight tests & complementary flight programs",
    desc: "Index of international and commercial microgravity combustion projects (Saffire, Sounding Rockets, Drop Towers, and ESA/JAXA collaborations).",
  },
  {
    href: "/fire-dynamics",
    title: "Fire Dynamics Explorer",
    badge: "08 · Science",
    tagline: "Interactive 3D Fire Tetrahedron linked to NASA test records",
    desc: "Select fuel, heat, oxidizer or chain-reaction faces, set gravity, O₂ and airflow, and follow guided pathways into BASS-II, SoFIE and Saffire experiment data.",
  },
];

const TEAM_MEMBERS = [
  {
    name: "Sayket Dey",
    role: "Doctoral Student · Member of Research group of Fire Safety Science and Engineering",
    affiliation: "Ghent University",
    location: "Belgium",
    tag: "Fire Science Research",
  },
  {
    name: "Kapilkumar Patil",
    role: "Doctoral Student · Member of Research group of Fire Safety Science and Engineering",
    affiliation: "Ghent University",
    location: "Belgium",
    tag: "Fire Science Research",
  },
  {
    name: "Mohammed Majharul Islam",
    role: "Senior Software Engineer",
    affiliation: "Genesys",
    location: "USA",
    tag: "Software Engineering",
  },
  {
    name: "Md Emrul Chowdhury",
    role: "Software Development Engineer L5",
    affiliation: "Amazon",
    location: "UK",
    tag: "Software Engineering",
  },
];

export default function AndroFlamePage() {
  return (
    <div className="intro-container">
      {/* Brand Header */}
      <header className="intro-brand-header">
        <p className="intro-app-kicker">NASA Space Apps Challenge 2026 · Flame in Freefall</p>
        <h1 className="intro-app-name">AndroFlame</h1>
        <p className="intro-tagline">Decoding Fire Beyond Gravity</p>
      </header>

      {/* Row 1: Objective */}
      <section className="intro-panel" aria-labelledby="obj-title">
        <h2 id="obj-title" className="intro-panel-title">Objective</h2>
        <p>
          <strong>AndroFlame</strong> is an open-science intelligence and data-synthesis engine engineered to decode the complex, non-intuitive physics of fire in microgravity. Without buoyant convection, flames do not rise—they burn as spherical, slow-diffusing balls governed by molecular transport, radiative heat loss, and delicate ventilation currents.
        </p>
        <p>
          Our core mission is to bridge 50 years of NASA microgravity combustion research with future human spaceflight safety. By ingesting, harmonizing, and structuring published datasets from NASA&apos;s Physical Sciences Informatics (PSI) repository, AndroFlame turns isolated test runs into actionable intelligence for deep-space habitat architects, fire-safety researchers, and mission planning engineers.
        </p>
        <ul style={{ margin: "14px 0 0 18px" }}>
          <li><strong>Synthesize:</strong> 24 flight &amp; ground investigations with 1,980+ experimental table rows.</li>
          <li><strong>Benchmark:</strong> Test habitat atmospheres (Lunar, Mars, ISS) against documented flight data.</li>
          <li><strong>Ground AI:</strong> Strictly evidence-backed assistant with zero hallucination and verbatim citations.</li>
        </ul>
      </section>

      {/* Row 2: Scope and Target Audience */}
      <section className="intro-panel" aria-labelledby="scope-title">
        <h2 id="scope-title" className="intro-panel-title">Scope and Target Audience</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
          <div>
            <h3 style={{ fontSize: "0.95rem", color: "var(--ink)", margin: "0 0 8px" }}>Empirical &amp; Literature Scope</h3>
            <p>
              The platform encompasses all combustion science investigations cataloged in NASA&apos;s Physical Sciences Informatics (PSI) repository, including:
            </p>
            <ul>
              <li><strong>24 Microgravity Investigations:</strong> Across droplet combustion (FLEX, FLEX-2), solid flame spread (BASS, BASS-II), gaseous flames (ACME), smoke detection (SAME, DAFT), and soot dynamics (SPICE).</li>
              <li><strong>1,980+ Verified Test Runs:</strong> Verbatim reporting of oxygen (0% to 40% O₂), chamber pressures (vacuum to 300+ kPa), airflow velocities, and fuel dimensions.</li>
              <li><strong>Flight Hardware:</strong> Combustion Integrated Rack (CIR), Microgravity Science Glovebox (MSG), and space shuttle middeck rigs.</li>
              <li><strong>Extended Roadmap:</strong> Historical and complementary programs including Saffire on Northrop Grumman Cygnus vehicles and ground drop towers.</li>
            </ul>
          </div>
          <div>
            <h3 style={{ fontSize: "0.95rem", color: "var(--ink)", margin: "0 0 8px" }}>Target Audience</h3>
            <p>
              AndroFlame serves multiple multidisciplinary stakeholders across space science and mission design:
            </p>
            <ul>
              <li><strong>Spacecraft Fire Safety Engineers:</strong> Designing habitat materials, fire detection thresholds, and active suppression systems for Artemis and Mars missions.</li>
              <li><strong>Combustion Researchers:</strong> Investigating fundamental transport phenomena, chemical kinetics, cool flames, and extinction limits in buoyancy-free environments.</li>
              <li><strong>Habitat Architects &amp; Mission Planners:</strong> Benchmarking environmental conditions (e.g. 34% O₂ at 56 kPa for lunar EVA prep) against empirical flammability boundaries.</li>
              <li><strong>Students &amp; Academics:</strong> Exploring open-access NASA flight data with interactive visualization tools and traceable citations.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Row 3: Limitation */}
      <section className="intro-panel" aria-labelledby="limit-title" style={{ borderLeft: "4px solid var(--accent)" }}>
        <h2 id="limit-title" className="intro-panel-title">Limitation</h2>
        <p>
          <strong>Scientific &amp; Methodological Boundaries:</strong> AndroFlame is an independent research discovery and data-synthesis instrument created for the 2026 NASA Space Apps Challenge. Users must keep the following constraints in mind:
        </p>
        <ul>
          <li><strong>Not a Certified Safety Calculator:</strong> AndroFlame is <em>not</em> an operational fire-risk calculator, certified material qualification system, or life-safety flight software. It does not replace NASA-STD-6001 materials testing or official flight qualification protocols.</li>
          <li><strong>Data Absence is Not Non-Flammability:</strong> An absence of documented experimental rows at a specific pressure or oxygen level in the PSI archive indicates a data gap—it is <em>not proof</em> that a material will not ignite or that no hazard exists.</li>
          <li><strong>Scale &amp; Geometry Effects:</strong> Small-scale glovebox/chamber samples (droplets, narrow fuel cards) do not capture full-scale turbulent vehicle fire dynamics or complex ventilation duct geometries without coupled computational fluid dynamics (CFD).</li>
          <li><strong>Zero Hallucination Policy:</strong> The AI synthesis answers cite only verbatim PSI records and official publications [S#]. When a topic is not addressed in NASA records, the system explicitly abstains rather than inventing speculative extrapolations.</li>
          <li><strong>Verify AI Results Before Use:</strong> Answers from the AI chatbot and the Ask feature are generated from model confidence, not certainty, so no AI output should be trusted 100%. Check every result precisely against the cited sources [S#] before using it in research, design, or safety decisions.</li>
        </ul>
      </section>

      {/* Row 4: Tips and Tricks (Module usage by researcher level) */}
      <section className="intro-panel" aria-labelledby="tips-title">
        <h2 id="tips-title" className="intro-panel-title">Tips and Tricks (Top Module Guide by Researcher Level)</h2>
        <p>
          The navigation bar and the <strong>Apps</strong> menu at the top of the interface provide 7 specialized research modules. Here is how different levels of researchers can get the most value from each module:
        </p>

        <div className="tips-levels-grid">
          {/* Level 1: Beginner */}
          <div className="tips-level-card">
            <h3 className="tips-level-title">Beginner &amp; Students</h3>
            <p style={{ fontSize: "0.82rem", color: "var(--ash)", margin: "0 0 12px" }}>
              Focus on fundamental physical differences and historical context:
            </p>
            <ul className="tips-modules-list">
              <li>
                <Link href="/fire-dynamics" className="tips-module-link">
                  <span className="tips-module-name">Fire Dynamics Explorer ↗</span>
                  <span className="tips-module-desc">Learn the Fire Tetrahedron in 3D, then see how each face shows up in real NASA microgravity experiments.</span>
                </Link>
              </li>
              <li>
                <Link href="/spacefire" className="tips-module-link">
                  <span className="tips-module-name">SpaceFire Evolution ↗</span>
                  <span className="tips-module-desc">50-year timeline of flight experiments from Skylab and Spacelab to Artemis.</span>
                </Link>
              </li>
              <li>
                <Link href="/androflame" className="tips-module-link">
                  <span className="tips-module-name">AndroFlame Overview ↗</span>
                  <span className="tips-module-desc">Full mission orientation, physics primer, and team background.</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Level 2: Intermediate */}
          <div className="tips-level-card level-mid">
            <h3 className="tips-level-title">Intermediate Researchers</h3>
            <p style={{ fontSize: "0.82rem", color: "var(--ash)", margin: "0 0 12px" }}>
              Explore specific materials, fuels, and cross-study comparisons:
            </p>
            <ul className="tips-modules-list">
              <li>
                <Link href="/explorer" className="tips-module-link">
                  <span className="tips-module-name">Catalog Explorer ↗</span>
                  <span className="tips-module-desc">Search PMMA, smoke detection, Nomex, or heptane with direct AI synthesis and table inspection.</span>
                </Link>
              </li>
              <li>
                <Link href="/compare" className="tips-module-link">
                  <span className="tips-module-name">Multi-Study Compare ↗</span>
                  <span className="tips-module-desc">Compare up to 3 investigations side-by-side across 20+ experimental dimensions.</span>
                </Link>
              </li>
              <li>
                <Link href="/beyond-psi" className="tips-module-link">
                  <span className="tips-module-name">Beyond PSI ↗</span>
                  <span className="tips-module-desc">Explore large-scale vehicle tests like Saffire on Cygnus and international collaborative campaigns.</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Level 3: Advanced */}
          <div className="tips-level-card level-adv">
            <h3 className="tips-level-title">Advanced Scientists &amp; Safety Officers</h3>
            <p style={{ fontSize: "0.82rem", color: "var(--ash)", margin: "0 0 12px" }}>
              Rigorous parameter gap analysis, habitat rankings, and cited inquiry:
            </p>
            <ul className="tips-modules-list">
              <li>
                <Link href="/coverage" className="tips-module-link">
                  <span className="tips-module-name">Coverage Matrix ↗</span>
                  <span className="tips-module-desc">Test exact planned study targets (O₂ %, pressure, flow) to pinpoint real data and empirical gaps.</span>
                </Link>
              </li>
              <li>
                <Link href="/insights" className="tips-module-link">
                  <span className="tips-module-name">Scenario Ranking ↗</span>
                  <span className="tips-module-desc">Deterministic 0–100 relevance scoring for Lunar Habitats, Mars Transit, and Space Stations.</span>
                </Link>
              </li>
              <li>
                <Link href="/assistant" className="tips-module-link">
                  <span className="tips-module-name">Grounded AI Assistant ↗</span>
                  <span className="tips-module-desc">Ask complex questions with row-level tabular citations [S#] and zero hallucination.</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Row 5: All 8 Research Instruments */}
      <section style={{ margin: "40px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "10px", marginBottom: "18px" }}>
          <div>
            <p style={{ fontFamily: "var(--f-mono)", fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--signal)", margin: 0 }}>Research Suite</p>
            <h2 style={{ fontSize: "1.6rem", color: "var(--ink)", margin: "4px 0 0" }}>Interactive Analysis Tools</h2>
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--ash)", margin: 0 }}>All accessible from the top <strong>Apps</strong> waffle menu</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "14px" }}>
          {INSTRUMENTS.map((inst) => (
            <Link
              key={inst.href}
              href={inst.href}
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "16px 18px",
                background: "var(--panel)",
                border: "1px solid var(--rule-strong)",
                borderRadius: "3px",
                textDecoration: "none",
                transition: "all 0.15s ease",
              }}
            >
              <span style={{ fontFamily: "var(--f-mono)", fontSize: "0.68rem", color: "var(--signal)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{inst.badge}</span>
              <h3 style={{ fontSize: "1.02rem", color: "var(--ink)", margin: "6px 0 4px" }}>{inst.title}</h3>
              <p style={{ fontSize: "0.78rem", color: "var(--ash)", margin: 0, lineHeight: 1.4, flex: 1 }}>{inst.tagline}</p>
              <span style={{ fontSize: "0.78rem", color: "var(--accent)", marginTop: "12px", fontWeight: 600 }}>Launch tool →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Row 6: Team Members */}
      <section className="intro-panel" aria-labelledby="team-title" style={{ marginTop: "40px" }}>
        <h2 id="team-title" className="intro-panel-title">Project Team</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginTop: "16px" }}>
          {TEAM_MEMBERS.map((m) => (
            <div
              key={m.name}
              style={{
                padding: "14px 16px",
                background: "#07173F",
                border: "1px solid var(--rule)",
                borderRadius: "3px",
              }}
            >
              <h3 style={{ fontSize: "1rem", color: "var(--ink)", margin: "0 0 4px" }}>{m.name}</h3>
              <p style={{ fontSize: "0.82rem", color: "var(--ink-2)", margin: "0 0 6px", lineHeight: 1.35 }}>{m.role}</p>
              <p style={{ fontFamily: "var(--f-mono)", fontSize: "0.72rem", color: "var(--signal)", margin: 0 }}>
                {m.affiliation}, {m.location}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
