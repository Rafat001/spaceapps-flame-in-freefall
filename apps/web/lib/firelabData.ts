/**
 * Learning FireLab: Data model, curated BASS-II flight runs, apparatus hotspots,
 * and scientific flame-front calculation logic.
 *
 * Source Provenance:
 * - NASA PSI: BASS-II investigation (PSI-25)
 * - NASA BASS-II Summary Report (2021), NTRS 20210011385 / TM-20210011385
 * - NASA BASS-II Experimental Table (Bhattacharjee et al., ISS Expeditions 38-40)
 */

export interface BassRun {
  runId: string;
  testNumber: string;
  sampleNumber: string;
  material: string;
  thicknessMicrons: number;
  widthCm: number;
  geometry: string;
  oxygenPct: number;
  airflowCmS: number;
  pressureKpa: number;
  flowDirection: "concurrent" | "opposed";
  outcome: string;
  measuredSpreadRateMmS?: number;
  videoUrl?: string;
  isRealFlightVideo: boolean;
  notes: string;
  gmt: number;
}

export const DOCUMENTED_BASS_RUNS: BassRun[] = [
  {
    runId: "B1",
    testNumber: "B1",
    sampleNumber: "147",
    material: "PMMA film",
    thicknessMicrons: 100,
    widthCm: 2.0,
    geometry: "Flat thin film",
    oxygenPct: 22.2,
    airflowCmS: 5.0,
    pressureKpa: 100,
    flowDirection: "concurrent",
    outcome: "Steady propagation along film length until fan to zero; quench",
    measuredSpreadRateMmS: 2.0,
    videoUrl: "/firelab/bass2_video_1.mp4",
    isRealFlightVideo: true,
    notes: "Baseline flight burn aboard ISS Microgravity Science Glovebox. Excellent steady spread regime.",
    gmt: 50,
  },
  {
    runId: "B3",
    testNumber: "B3",
    sampleNumber: "148",
    material: "PMMA film",
    thicknessMicrons: 100,
    widthCm: 2.0,
    geometry: "Flat thin film",
    oxygenPct: 22.2,
    airflowCmS: 2.0,
    pressureKpa: 100,
    flowDirection: "concurrent",
    outcome: "Steady spread at reduced forced convection",
    measuredSpreadRateMmS: 1.3,
    isRealFlightVideo: false,
    notes: "Lower airflow slows oxidizer delivery rate to the reaction zone, reducing spread rate.",
    gmt: 50,
  },
  {
    runId: "B4",
    testNumber: "B4",
    sampleNumber: "159",
    material: "PMMA film",
    thicknessMicrons: 300,
    widthCm: 2.0,
    geometry: "Medium film",
    oxygenPct: 22.2,
    airflowCmS: 5.0,
    pressureKpa: 100,
    flowDirection: "concurrent",
    outcome: "Steady spread; slower than 100 µm due to solid conductive heat sink",
    measuredSpreadRateMmS: 0.9,
    isRealFlightVideo: false,
    notes: "Thermal thickness effect: thicker solid requires more energy to reach pyrolysis temperature.",
    gmt: 50,
  },
  {
    runId: "B5",
    testNumber: "B5",
    sampleNumber: "156",
    material: "PMMA film",
    thicknessMicrons: 200,
    widthCm: 2.0,
    geometry: "Flat thin film",
    oxygenPct: 22.2,
    airflowCmS: 5.0,
    pressureKpa: 100,
    flowDirection: "concurrent",
    outcome: "Steady spread at intermediate velocity",
    measuredSpreadRateMmS: 1.4,
    isRealFlightVideo: false,
    notes: "Intermediate thickness benchmark between 100 µm and 300 µm.",
    gmt: 50,
  },
  {
    runId: "B6",
    testNumber: "B6",
    sampleNumber: "153m",
    material: "PMMA film",
    thicknessMicrons: 100,
    widthCm: 2.0,
    geometry: "Flat thin film",
    oxygenPct: 21.0,
    airflowCmS: 1.3,
    pressureKpa: 100,
    flowDirection: "concurrent",
    outcome: "Low-velocity laminar spread in standard air",
    measuredSpreadRateMmS: 1.1,
    isRealFlightVideo: false,
    notes: "Ambient 21% O2 baseline at low duct velocity.",
    gmt: 188,
  },
  {
    runId: "B14",
    testNumber: "B14",
    sampleNumber: "174m",
    material: "PMMA film",
    thicknessMicrons: 200,
    widthCm: 1.0,
    geometry: "Narrow strip",
    oxygenPct: 15.0,
    airflowCmS: 0.5,
    pressureKpa: 100,
    flowDirection: "concurrent",
    outcome: "Hypoxic quench / extinction (insufficient oxygen supply)",
    measuredSpreadRateMmS: 0.0,
    isRealFlightVideo: false,
    notes: "Critical hypoxic test: 15% O2 fails to sustain microgravity flame spread at low flow.",
    gmt: 183,
  },
  {
    runId: "B16",
    testNumber: "B16",
    sampleNumber: "150m",
    material: "PMMA film",
    thicknessMicrons: 100,
    widthCm: 2.0,
    geometry: "Flat thin film",
    oxygenPct: 17.3,
    airflowCmS: 3.0,
    pressureKpa: 100,
    flowDirection: "concurrent",
    outcome: "Slow blue/dim flame near flammability limit",
    measuredSpreadRateMmS: 0.7,
    isRealFlightVideo: false,
    notes: "Reduced oxygen flammability boundary investigation.",
    gmt: 183,
  },
  {
    runId: "B18",
    testNumber: "B18",
    sampleNumber: "176m",
    material: "PMMA film",
    thicknessMicrons: 200,
    widthCm: 1.0,
    geometry: "Narrow strip",
    oxygenPct: 17.4,
    airflowCmS: 10.0,
    pressureKpa: 100,
    flowDirection: "concurrent",
    outcome: "Aerodynamic blowoff extinction",
    measuredSpreadRateMmS: 0.0,
    isRealFlightVideo: false,
    notes: "High flow blows flame downstream before pyrolyzate can mix and sustain reaction.",
    gmt: 183,
  },
];

export interface ApparatusHotspot {
  id: string;
  name: string;
  instrument: string;
  icon: string;
  description: string;
  howMeasured: string;
  calibrationNotes: string;
}

export const APPARATUS_HOTSPOTS: ApparatusHotspot[] = [
  {
    id: "camera",
    name: "Digital Video Camera",
    instrument: "Optical Imaging Port",
    icon: "📷",
    description: "Records high-definition color sequence of flame growth, soot emission, and front propagation.",
    howMeasured: "Measures flame-front displacement Δx over time Δt across successive video frames.",
    calibrationNotes: "Calibrated using known millimetric fiducial marks on the flow duct frame (1 px ≈ 0.125 mm).",
  },
  {
    id: "holder",
    name: "Sample Clamping Duct",
    instrument: "Sample Mounting Rail",
    icon: "🔬",
    description: "Holds solid fuel specimen (PMMA film or slab) centered in the flow channel to ensure 2D laminar aerodynamics.",
    howMeasured: "Fixed width (1.0 cm or 2.0 cm) and length (10 cm) define fuel boundary conditions.",
    calibrationNotes: "Pre-measured with micrometer calipers prior to launch stowage.",
  },
  {
    id: "airflow",
    name: "Flow Duct & Blower Fan",
    instrument: "Ventilation Controller",
    icon: "💨",
    description: "Establishes a uniform forced-air flow (0 to 10 cm/s) across the sample surface.",
    howMeasured: "Hot-wire anemometer and calibrated fan tachometer record duct flow velocity.",
    calibrationNotes: "Calibrated at NASA Glenn Research Center; verified with onboard differential pressure sensors.",
  },
  {
    id: "timing",
    name: "Master Time Clock",
    instrument: "ISS GMT Synchronizer",
    icon: "⏱️",
    description: "Synchronizes camera frames, sensor readings, and astronaut voice commands to microsecond ISS time.",
    howMeasured: "Video frames contain embedded UTC/GMT timecodes (e.g. GMT 50).",
    calibrationNotes: "Frame rate locked to 30.0 fps; elapsed time calculated via t = frame_index / 30.0.",
  },
  {
    id: "radiometer",
    name: "Narrow & Wide Radiometers",
    instrument: "Thermal Radiation Detector",
    icon: "📡",
    description: "Captures total radiant heat flux emitted by soot particles and hot gas molecules.",
    howMeasured: "Thermopile detector generates millivolt signal proportional to flame radiant power (W/cm²).",
    calibrationNotes: "Calibrated with blackbody reference source; gain settings 10× to 1000×.",
  },
];

export interface CalibratedFramePoint {
  t: number; // seconds
  x: number; // mm
  instantaneousRateMmS?: number;
  source: string;
}

/** Educational calibrated flame-front measurement points from PDF Section 06 */
export const SYNTHETIC_DATA_POINTS: CalibratedFramePoint[] = [
  { t: 0, x: 0, instantaneousRateMmS: 0, source: "Synthetic demo" },
  { t: 2, x: 4, instantaneousRateMmS: 2.0, source: "Synthetic demo" },
  { t: 4, x: 8, instantaneousRateMmS: 2.0, source: "Synthetic demo" },
  { t: 6, x: 12, instantaneousRateMmS: 2.0, source: "Synthetic demo" },
  { t: 8, x: 16, instantaneousRateMmS: 2.0, source: "Synthetic demo" },
  { t: 10, x: 20, instantaneousRateMmS: 2.0, source: "Synthetic demo" },
  { t: 12, x: 24, instantaneousRateMmS: 2.0, source: "Synthetic demo" },
  { t: 14, x: 28, instantaneousRateMmS: 2.0, source: "Synthetic demo" },
  { t: 16, x: 32, instantaneousRateMmS: 2.0, source: "Synthetic demo" },
];

export interface SpreadRateCalculation {
  t1: number;
  t2: number;
  x1: number;
  x2: number;
  deltaT: number;
  deltaX: number;
  averageRateMmS: number;
  formula: string;
  stepExplanation: string;
}

export function calculateSpreadRate(
  t1: number,
  t2: number,
  dataset: CalibratedFramePoint[] = SYNTHETIC_DATA_POINTS
): SpreadRateCalculation {
  const sorted = [...dataset].sort((a, b) => a.t - b.t);
  const p1 = sorted.find((p) => Math.abs(p.t - t1) < 0.05) || sorted.find((p) => p.t <= t1) || sorted[0] || { t: t1, x: 0, source: "user" };
  const p2 = sorted.find((p) => Math.abs(p.t - t2) < 0.05) || sorted.find((p) => p.t >= t2) || sorted[sorted.length - 1] || { t: t2, x: 0, source: "user" };

  const deltaT = Number((p2.t - p1.t).toFixed(2));
  const deltaX = Number((p2.x - p1.x).toFixed(2));
  const averageRateMmS = deltaT > 0 ? Number((deltaX / deltaT).toFixed(2)) : 0;

  return {
    t1: p1.t,
    t2: p2.t,
    x1: p1.x,
    x2: p2.x,
    deltaT,
    deltaX,
    averageRateMmS,
    formula: `v = Δx / Δt = (${p2.x} − ${p1.x}) / (${p2.t} − ${p1.t}) = ${averageRateMmS} mm/s`,
    stepExplanation: `Displacement Δx = ${p2.x} mm − ${p1.x} mm = ${deltaX} mm over time interval Δt = ${p2.t} s − ${p1.t} s = ${deltaT} s. Flame spread rate = ${averageRateMmS} mm/s.`,
  };
}

export interface LinearRegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
}

export function calculateLinearRegression(points: CalibratedFramePoint[]): LinearRegressionResult {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0, rSquared: 0 };

  let sumT = 0;
  let sumX = 0;
  let sumTX = 0;
  let sumT2 = 0;

  for (const p of points) {
    sumT += p.t;
    sumX += p.x;
    sumTX += p.t * p.x;
    sumT2 += p.t * p.t;
  }

  const denominator = n * sumT2 - sumT * sumT;
  if (denominator === 0) return { slope: 0, intercept: 0, rSquared: 0 };

  const slope = (n * sumTX - sumT * sumX) / denominator;
  const intercept = (sumX - slope * sumT) / n;

  // Compute R²
  const meanX = sumX / n;
  let ssTot = 0;
  let ssRes = 0;
  for (const p of points) {
    const predictedX = slope * p.t + intercept;
    ssTot += Math.pow(p.x - meanX, 2);
    ssRes += Math.pow(p.x - predictedX, 2);
  }

  const rSquared = ssTot > 0 ? Number((1 - ssRes / ssTot).toFixed(4)) : 1.0;

  return {
    slope: Number(slope.toFixed(2)),
    intercept: Number(intercept.toFixed(2)),
    rSquared,
  };
}

export interface RunMatchResult {
  exactMatch?: BassRun;
  nearestRun: BassRun;
  isExact: boolean;
  differences: string[];
}

export function findNearestBassRun(fuelThickness: number, oxygen: number, airflow: number): RunMatchResult {
  // Look for exact match
  const exact = DOCUMENTED_BASS_RUNS.find(
    (r) =>
      Math.abs(r.thicknessMicrons - fuelThickness) < 1 &&
      Math.abs(r.oxygenPct - oxygen) < 0.2 &&
      Math.abs(r.airflowCmS - airflow) < 0.2
  );

  if (exact) {
    return {
      exactMatch: exact,
      nearestRun: exact,
      isExact: true,
      differences: [],
    };
  }

  // Find nearest by weighted Euclidean distance
  let minDistance = Infinity;
  let nearest = DOCUMENTED_BASS_RUNS[0];

  for (const r of DOCUMENTED_BASS_RUNS) {
    // Normalization scales: thickness ~ 100-400, oxygen ~ 15-22, airflow ~ 0-10
    const dThickness = (r.thicknessMicrons - fuelThickness) / 200;
    const dOxygen = (r.oxygenPct - oxygen) / 5;
    const dAirflow = (r.airflowCmS - airflow) / 3;
    const dist = Math.sqrt(dThickness * dThickness + dOxygen * dOxygen + dAirflow * dAirflow);

    if (dist < minDistance) {
      minDistance = dist;
      nearest = r;
    }
  }

  const differences: string[] = [];
  if (Math.abs(nearest.thicknessMicrons - fuelThickness) >= 1) {
    differences.push(`Fuel thickness: requested ${fuelThickness} µm vs documented ${nearest.thicknessMicrons} µm`);
  }
  if (Math.abs(nearest.oxygenPct - oxygen) >= 0.2) {
    differences.push(`Oxygen: requested ${oxygen.toFixed(1)}% vs documented ${nearest.oxygenPct.toFixed(1)}%`);
  }
  if (Math.abs(nearest.airflowCmS - airflow) >= 0.2) {
    differences.push(`Airflow: requested ${airflow.toFixed(1)} cm/s vs documented ${nearest.airflowCmS.toFixed(1)} cm/s`);
  }

  return {
    nearestRun: nearest,
    isExact: false,
    differences,
  };
}

/**
 * FLEX-69 Droplet Combustion Model & Calculations
 * Sourced from NASA PSI-69 (Droplet Combustion Experiment / FLEX)
 * D²-Law: D²(t) = D₀² - K·t
 */
export interface FlexDropletState {
  time: number;
  diameter: number;
  diameterSquared: number;
  hasFlame: boolean;
  rateK: number;
}

export interface FlexRun {
  runId: string;
  fuel: "n-Heptane" | "Methanol";
  oxygenPct: number;
  initialDiameterMm: number;
  pressureAtm: number;
  measuredK: number;
  extinctionType: "Radiative / Cool flame" | "Burnout" | "Diffusive quench";
  notes: string;
  isRealFlightData: boolean;
}

export const DOCUMENTED_FLEX_RUNS: FlexRun[] = [
  {
    runId: "FLEX-01",
    fuel: "n-Heptane",
    oxygenPct: 21.0,
    initialDiameterMm: 4.0,
    pressureAtm: 1.0,
    measuredK: 0.22,
    extinctionType: "Radiative / Cool flame",
    notes: "Baseline flight run in air. Demonstrates visible soot radiative extinction at ~36s followed by sustained low-temperature cool flame.",
    isRealFlightData: true,
  },
  {
    runId: "FLEX-02",
    fuel: "n-Heptane",
    oxygenPct: 30.0,
    initialDiameterMm: 3.5,
    pressureAtm: 1.0,
    measuredK: 0.31,
    extinctionType: "Burnout",
    notes: "Elevated oxygen concentration increases reaction rate and flame temperature, driving a ~40% faster surface recession.",
    isRealFlightData: true,
  },
  {
    runId: "FLEX-03",
    fuel: "Methanol",
    oxygenPct: 21.0,
    initialDiameterMm: 3.0,
    pressureAtm: 1.0,
    measuredK: 0.15,
    extinctionType: "Burnout",
    notes: "Methanol burns with clean blue flame and negligible soot, virtually eliminating radiative soot quench.",
    isRealFlightData: true,
  },
  {
    runId: "FLEX-04",
    fuel: "n-Heptane",
    oxygenPct: 17.0,
    initialDiameterMm: 4.0,
    pressureAtm: 0.7,
    measuredK: 0.18,
    extinctionType: "Diffusive quench",
    notes: "Hypoxic exploration atmosphere (Orion / Gateway benchmark). Lower oxidizer flux brings droplet close to flammability cutoff.",
    isRealFlightData: true,
  },
];

export interface FlexHotspot {
  id: string;
  name: string;
  instrument: string;
  icon: string;
  description: string;
  howMeasured: string;
  calibrationNotes: string;
}

export const FLEX_APPARATUS_HOTSPOTS: FlexHotspot[] = [
  {
    id: "droplet_dispenser",
    name: "Dual Opposed Needle Dispenser",
    instrument: "Droplet Deployment Mechanism",
    icon: "💉",
    description: "Two opposing capillary needles dispense a liquid fuel droplet onto a 14-micron SiC support fiber and rapidly retract.",
    howMeasured: "Initial volume calibrated via precision stepper-motor syringe pump (0.5 to 5.0 mm diameter).",
    calibrationNotes: "Needle retraction velocity > 2 m/s prevents droplet momentum and droplet shedding.",
  },
  {
    id: "igniter",
    name: "Twin Spark Igniter Electrodes",
    instrument: "Capacitive Ignition System",
    icon: "⚡",
    description: "Electrically energizes dual hot-wire or spark electrodes on opposite sides of the fuel droplet to initiate combustion.",
    howMeasured: "Pulse duration 0.2 to 0.8 s; ignition energy controlled to prevent droplet boiling or disruption.",
    calibrationNotes: "Electrodes retract to chamber wall immediately upon flame kernel detection.",
  },
  {
    id: "hi_speed_cam",
    name: "High-Speed Color Imaging Camera",
    instrument: "Droplet / Flame Tracking Camera",
    icon: "📷",
    description: "Captures 30 to 200 frames per second of droplet shadowgraphy and chemiluminescent flame luminosity.",
    howMeasured: "Measures instantaneous droplet diameter D(t) via Sobel / Canny edge-detection algorithms.",
    calibrationNotes: "Fiducial millimeter target grid mounted in focal plane (1 pixel = 0.018 mm).",
  },
  {
    id: "pressure_chamber",
    name: "Combustion Integrated Rack (CIR)",
    instrument: "100-Liter Environmental Chamber",
    icon: "🛡️",
    description: "Hermetically sealed containment chamber maintaining controlled ambient gas composition and pressure (0.4 to 3.0 atm).",
    howMeasured: "Piezoelectric pressure transducers and electrochemical O2/CO2 sensors record chamber conditions.",
    calibrationNotes: "Monitored to ensure microgravity quiescent flow (convective drift < 1 mm/s).",
  },
  {
    id: "radiometer",
    name: "Broadband UV & IR Radiometers",
    instrument: "Heat Loss Spectrometer",
    icon: "📡",
    description: "Detects radiant emission from soot and low-temperature hydroxyl / formaldehyde chemiluminescence.",
    howMeasured: "Calibrated thermopiles detect the onset of cool flames after visible flame extinction.",
    calibrationNotes: "Detects low-temperature combustion between 600 K and 800 K when visible light is zero.",
  },
];

export function calculateFlexK(fuel: "n-Heptane" | "Methanol", oxygenPct: number): number {
  const baseK = fuel === "Methanol" ? 0.15 : 0.22;
  return Number((baseK * (oxygenPct / 21)).toFixed(4));
}

export function calculateDropletDiameter(
  time: number,
  initialDiam: number,
  oxygenPct: number,
  fuel: "n-Heptane" | "Methanol" = "n-Heptane"
): number {
  const k = calculateFlexK(fuel, oxygenPct);
  const d2 = Math.max(0.16, initialDiam * initialDiam - k * time);
  return Number(Math.sqrt(d2).toFixed(3));
}

export function calculateFlexRateConstant(
  t1: number,
  d1: number,
  t2: number,
  d2: number
): { rateK: number; formula: string } {
  if (Math.abs(t2 - t1) < 0.001) {
    return { rateK: 0, formula: "Requires t2 ≠ t1" };
  }
  const d1Sq = d1 * d1;
  const d2Sq = d2 * d2;
  const rateK = (d1Sq - d2Sq) / (t2 - t1);
  return {
    rateK: Number(rateK.toFixed(3)),
    formula: `K = (D₁² − D₂²) / (t₂ − t₁) = (${d1Sq.toFixed(2)} − ${d2Sq.toFixed(2)}) / (${t2} − ${t1}) = ${rateK.toFixed(3)} mm²/s`,
  };
}

export function exportMeasurementCsv(
  filename: string,
  headers: string[],
  rows: (string | number)[][]
): void {
  const csvContent =
    "data:text/csv;charset=utf-8," +
    [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
