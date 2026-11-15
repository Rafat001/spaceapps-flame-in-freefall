/** Fire Dynamics Explorer — content model.
 *
 *  Plain-language explanations of the four Fire Tetrahedron faces, and the worked NASA examples that each face
 *  combination leads to. Every quoted sentence (`quote`) is verbatim from a source already in the corpus
 *  (a PSI record or an official NASA page listed in data/sources/official/MANIFEST.md); tests/fireDynamics.test.ts
 *  checks each one word for word. The mapping of an investigation onto the faces is the team's own framing and is
 *  labelled as such in the UI. */

export type Face = "fuel" | "heat" | "oxidizer" | "reaction";
export const FACES: Face[] = ["fuel", "heat", "oxidizer", "reaction"];

export interface ExplorerLink { label: string; params: Record<string, string> }

export interface FaceInfo {
  face: Face;
  name: string;
  short: string;
  meaning: string;
  explain: string;
  microgravity: string;
  variables: string[];
  links: ExplorerLink[];
}

export const FACE_INFO: Record<Face, FaceInfo> = {
  fuel: {
    face: "fuel", name: "Fuel", short: "Fuel",
    meaning: "Material that can burn.",
    explain: "Anything that can be oxidised: fabrics, plastics such as PMMA (acrylic), insulation, liquid droplets or gases. "
      + "How a solid burns depends not only on what it is made of but on its thickness and shape: a thin film heats through "
      + "quickly, a thick block or sphere keeps heating up from the inside while it burns.",
    microgravity: "Fuel choice is the lever spacecraft designers control most directly, which is why material flammability screening matters.",
    variables: ["Material", "Thickness", "Sample geometry (film, slab, rod, sphere, fabric)", "Sample size"],
    links: [
      { label: "Solid-fuel investigations", params: { fuel_class: "solid" } },
      { label: "Material screening", params: { topic: "materials_selection" } },
      { label: "PMMA tests", params: { material: "PMMA" } },
    ],
  },
  heat: {
    face: "heat", name: "Heat", short: "Heat",
    meaning: "Energy that starts and sustains burning.",
    explain: "A fire needs an ignition source (a hot wire, a spark, a radiant heater) and then must keep heating fresh fuel "
      + "ahead of the flame. If the flame loses heat faster than it releases it — to the surroundings, by radiation, or into "
      + "a thick fuel — it shrinks and goes out. That boundary is the extinction limit.",
    microgravity: "Without buoyant flow carrying hot gas away, heat transfer by radiation and by slow forced flow becomes relatively more important.",
    variables: ["Ignition method", "External radiant heating", "Internal heating of thick fuels", "Temperature", "Heat loss / extinction"],
    links: [
      { label: "Ignition", params: { topic: "ignition" } },
      { label: "Radiation", params: { topic: "radiation" } },
      { label: "Temperature measured", params: { measurement_type: "temperature (thermocouple/pyrometry)" } },
    ],
  },
  oxidizer: {
    face: "oxidizer", name: "Oxidizer", short: "Oxygen",
    meaning: "The gas that the fuel reacts with — usually oxygen.",
    explain: "How much oxygen is present (its concentration and the total pressure), what else is in the gas (nitrogen, "
      + "helium, carbon dioxide), and how fast it is delivered to the flame all decide whether a material will keep burning.",
    microgravity: "On Earth hot gas rises and pulls fresh air in. In freefall that draw largely disappears, so ventilation fans and diffusion set the oxygen supply.",
    variables: ["O₂ concentration (% by volume)", "Total pressure", "Diluent gas", "Airflow / ventilation velocity"],
    links: [
      { label: "Oxygen varied", params: { topic: "oxygen_variation" } },
      { label: "Airflow", params: { topic: "airflow" } },
      { label: "Above 21 % O₂", params: { oxygen_min: "21" } },
    ],
  },
  reaction: {
    face: "reaction", name: "Chain reaction", short: "Reaction",
    meaning: "The chemical reactions that keep releasing heat.",
    explain: "Burning is a chain of fast chemical reactions that turn fuel and oxygen into products — CO₂, water, CO, soot — "
      + "and release the heat that keeps the fire going. Interrupting the chain (for example with a suppressant) or starving it "
      + "puts the fire out. What a fire produces is also what smoke detectors and crew air monitors look for.",
    microgravity: "Flames that linger near extinction in microgravity can make different products, which matters for detection and crew exposure.",
    variables: ["Combustion products (CO, CO₂)", "Soot / smoke", "Flame spread and growth", "Extinction"],
    links: [
      { label: "Gas composition measured", params: { measurement_type: "gas composition" } },
      { label: "Soot", params: { topic: "soot" } },
      { label: "Extinction", params: { topic: "extinction" } },
    ],
  },
};

/** The general description the guide suggests for the interface. */
export const COMBUSTION_SUMMARY = "A sustained fire involves combustible material, enough energy to ignite and heat it, an oxidizer such as "
  + "oxygen, and chemical reactions that continue releasing heat. The four are coupled: heat released by the reactions warms "
  + "nearby fuel, while oxygen transport and airflow shape how the flame develops.";

export interface SourceQuote { quote: string; source: string; url: string; file: string }

export const BUOYANCY_QUOTE: SourceQuote = {
  quote: "In these bench-scale experiments, however, buoyant forces, created by gravity and the large temperature differential between the flame and the ambient gas, dominate and frequently obscure the physical and chemical phenomena of interest, and hence, complicate analyses. In the absence of gravity, buoyancy can be suppressed, and the analyses can be reduced to much simpler one-dimensional systems.",
  source: "NASA Glenn — Combustion Science",
  url: "https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/",
  file: "data/sources/official/text/nasa_combustion_science.txt",
};

const GLENN_SOFIE_URL = "https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/solid-fuel-ignition-and-extinction-sofie/";
const SOFIE_FILE = "data/sources/official/text/glenn_sofie.txt";

export type ExampleId = "bass2" | "gel" | "mist" | "saffire";

export interface WorkedExample {
  id: ExampleId;
  acronym: string;
  title: string;
  /** PSI investigation ids with experimental tables; empty when the investigation is not in PSI. */
  psi: string[];
  question: string;
  studied: SourceQuote[];
  /** Team framing: how the investigation maps onto each face. */
  faces: Partial<Record<Face, string>>;
  inPsiNote?: string;
}

export const EXAMPLES: Record<ExampleId, WorkedExample> = {
  bass2: {
    id: "bass2", acronym: "BASS-II", title: "Burning and Suppression of Solids – II", psi: ["psi-25"],
    question: "How do oxygen concentration and forced airflow relate to flame spread and extinction for solid fuels in microgravity?",
    studied: [{
      quote: "Study the ignition, flame growth, flame spread, and extinction limits for solid fuels burning in low-velocity forced flows in microgravity.",
      source: "PSI-25 record, objective 1", url: "https://psi.nasa.gov/physci/repo/data/investigations/PSI-25", file: "data/sources/psi/PSI-25.json",
    }, {
      quote: "Ambient oxygen concentration (via working volume nitrogen vitiation)",
      source: "PSI-25 record, primary variables", url: "https://psi.nasa.gov/physci/repo/data/investigations/PSI-25", file: "data/sources/psi/PSI-25.json",
    }],
    faces: {
      fuel: "PMMA films and other solids of different thicknesses; the PSI table lists the sample for every test.",
      oxidizer: "Ambient O₂ lowered by nitrogen vitiation (PSI table: calibrated initial and final O₂ % by volume per test); flow set by fan and flow restrictor settings.",
      heat: "Ignition and extinction limits are a stated objective.",
      reaction: "The PSI table records initial and final CO₂ (% by volume) and CO (ppm) per test.",
    },
  },
  gel: {
    id: "gel", acronym: "SoFIE-GEL", title: "Growth and Extinction Limit", psi: [],
    question: "How does the interior heating of a thick, curved solid relate to flame growth, decay and extinction?",
    studied: [{
      quote: "This proposed experiment will concentrate on the flame growth, decay and extinction over the surface of a non-flat thick solid in microgravity. In particular, a solid sphere of substantial size (i.e. 4 to 5 cm diameter) is chosen as a representative of non-flat samples.",
      source: "NASA Glenn — SoFIE page, GEL", url: GLENN_SOFIE_URL, file: SOFIE_FILE,
    }, {
      quote: "In addition to the parameters influencing the flammability in thin solids, the degree of interior heat-up is an important parameter on the solid burning characteristics of thick specimen.",
      source: "NASA Glenn — SoFIE page, GEL", url: GLENN_SOFIE_URL, file: SOFIE_FILE,
    }],
    faces: {
      fuel: "A thick solid sphere, 4 to 5 cm in diameter.",
      heat: "The degree of interior heat-up, which keeps changing as the sphere burns.",
      oxidizer: "Flow around a sphere (stagnation point, shoulder and wake) differs from flow over a flat surface.",
      reaction: "Flame growth, decay and extinction.",
    },
    inPsiNote: "SoFIE-GEL has no PSI record or experimental table yet, so there are no test conditions or measurements to filter. Only NASA's description of the experiment is shown.",
  },
  mist: {
    id: "mist", acronym: "SoFIE-MIST", title: "Material Ignition and Suppression Test", psi: [],
    question: "How do airflow and external radiant heating define when a solid cylinder ignites?",
    studied: [{
      quote: "The MIST experimental apparatus would consist of a small-scale combustion wind tunnel, a cylindrical fuel sample, radiant heaters, an igniter, and supporting instrumentation.",
      source: "NASA Glenn — SoFIE page, MIST", url: GLENN_SOFIE_URL, file: SOFIE_FILE,
    }, {
      quote: "All tests will be conducted in an opposed-flow configuration.",
      source: "NASA Glenn — SoFIE page, MIST", url: GLENN_SOFIE_URL, file: SOFIE_FILE,
    }],
    faces: {
      fuel: "A cylindrical fuel sample on the axis of the flow duct.",
      heat: "Radiant heaters plus a coiled Kanthal wire igniter.",
      oxidizer: "A uniform oxidizer flow through a small wind tunnel, opposed to the flame.",
    },
    inPsiNote: "SoFIE-MIST has no PSI record or experimental table yet, so there are no test conditions or measurements to filter. Only NASA's description of the experiment is shown.",
  },
  saffire: {
    id: "saffire", acronym: "Saffire", title: "Spacecraft Fire Safety Experiments I–III", psi: ["psi-98", "psi-99", "psi-100"],
    question: "How does flame spread on large samples in a spacecraft compare with small-scale microgravity tests?",
    studied: [{
      quote: "determine how rapidly a large scale fire grows in low-gravity",
      source: "PSI-98 record, objective 1", url: "https://psi.nasa.gov/physci/repo/data/investigations/PSI-98", file: "data/sources/psi/PSI-98.json",
    }, {
      quote: "However, the experiments were conducted at a flow velocity of 30 cm/s compared to 20 cm/s during Saffire I.",
      source: "PSI-100 record, approach", url: "https://psi.nasa.gov/physci/repo/data/investigations/PSI-100", file: "data/sources/psi/PSI-100.json",
    }],
    faces: {
      fuel: "Large samples: SIBAL cotton-fiberglass fabric about 41 × 94 cm (Saffire I, III), and 29 × 5 cm silicone, SIBAL, PMMA and Nomex samples (Saffire II).",
      heat: "Each sample is ignited, then the flame is filmed by two cameras.",
      oxidizer: "Cabin air (~21.5–22.1 % O₂ where reported) driven through a large flow duct at 20 or 30 cm/s.",
      reaction: "Flame growth and burn time over a spacecraft-scale sample.",
    },
  },
};

/** Guided pathways from the developer guide: which face combination leads to which worked example. */
const JOURNEYS: { faces: Face[]; example: ExampleId }[] = [
  { faces: ["fuel", "oxidizer"], example: "bass2" },
  { faces: ["fuel", "heat"], example: "gel" },
  { faces: ["heat", "oxidizer"], example: "mist" },
  { faces: ["fuel", "heat", "oxidizer", "reaction"], example: "saffire" },
];

export const EXAMPLE_ORDER: ExampleId[] = ["bass2", "gel", "mist", "saffire"];

/** The worked example for exactly this selection of faces, if a guided pathway exists for it. */
export function journeyFor(selected: Face[]): ExampleId | null {
  const key = [...new Set(selected)].sort().join("+");
  return JOURNEYS.find((j) => [...j.faces].sort().join("+") === key)?.example ?? null;
}

/** Every pathway as a ready-made selection, for the "try a pathway" buttons. */
export function pathways(): { faces: Face[]; example: ExampleId; label: string }[] {
  return JOURNEYS.map((j) => ({
    ...j,
    label: j.faces.length === 4 ? "All four faces" : j.faces.map((f) => FACE_INFO[f].name).join(" + "),
  }));
}

export function toggleFace(selected: Face[], f: Face): Face[] {
  return selected.includes(f) ? selected.filter((x) => x !== f) : FACES.filter((x) => x === f || selected.includes(x));
}

/** Environment controls → Explorer query parameters (only the ones the user actually set). */
export interface EnvFilters { gravity: "" | "microgravity" | "1g_lab_or_model"; material: string; oxygen_min: string; oxygen_max: string; airflow_min: string; airflow_max: string }
export const EMPTY_ENV: EnvFilters = { gravity: "microgravity", material: "", oxygen_min: "", oxygen_max: "", airflow_min: "", airflow_max: "" };

export function envToParams(e: EnvFilters): Record<string, string> {
  const p: Record<string, string> = {};
  if (e.gravity) p.gravity_regime = e.gravity;
  if (e.material.trim()) p.material = e.material.trim();
  for (const k of ["oxygen_min", "oxygen_max", "airflow_min", "airflow_max"] as const) if (e[k].trim() !== "") p[k] = e[k].trim();
  if (p.airflow_min || p.airflow_max) p.airflow_unit = "m/s";
  return p;
}

/** Minimal shape of a test run from GET /api/investigations/{id}. */
export interface RunLike { material?: string | null; oxygen?: { known?: boolean; min?: number; max?: number } | null; airflow?: { known?: boolean; min?: number; max?: number } | null }

/** Client-side filter of an investigation's test rows by the environment controls. A numeric bound excludes rows whose
 *  value is Not reported, matching the catalog rule that Not reported values never pass a numeric filter. */
export function filterRuns<T extends RunLike>(runs: T[], e: EnvFilters): T[] {
  const num = (s: string) => (s.trim() === "" ? null : Number(s));
  const within = (c: RunLike["oxygen"], lo: number | null, hi: number | null) => {
    if (lo === null && hi === null) return true;
    if (!c?.known || c.min === undefined || c.max === undefined) return false;
    return (lo === null || c.max >= lo) && (hi === null || c.min <= hi);
  };
  const mat = e.material.trim().toLowerCase();
  return runs.filter((r) => (!mat || (r.material || "").toLowerCase().includes(mat))
    && within(r.oxygen, num(e.oxygen_min), num(e.oxygen_max))
    && within(r.airflow, num(e.airflow_min), num(e.airflow_max)));
}
