"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  APPARATUS_HOTSPOTS,
  DOCUMENTED_BASS_RUNS,
  SYNTHETIC_DATA_POINTS,
  calculateLinearRegression,
  calculateSpreadRate,
  findNearestBassRun,
  calculateDropletDiameter,
  calculateFlexK,
  calculateFlexRateConstant,
  exportMeasurementCsv,
  DOCUMENTED_FLEX_RUNS,
  FLEX_APPARATUS_HOTSPOTS,
  type BassRun,
  type FlexRun,
  type FlexHotspot,
  type CalibratedFramePoint,
} from "@/lib/firelabData";

export interface CapturedDropletPoint {
  id: number;
  t: number;
  d: number;
  d2: number;
  source: "user_derived" | "verified_nasa" | "model_benchmark";
}

export default function FireLabPage() {
  // Top-level Investigation Switcher: FLEX-69 (Droplet Combustion) vs BASS-II (Solid Flame Spread)
  const [activeInvestigation, setActiveInvestigation] = useState<"flex" | "bass">("flex");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const lab = params.get("lab");
      if (lab === "bass" || lab === "flex") {
        setActiveInvestigation(lab);
      }
    }
  }, []);

  const handleSwitchInvestigation = (lab: "flex" | "bass") => {
    setActiveInvestigation(lab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("lab", lab);
      window.history.replaceState(null, "", url.toString());
    }
  };

  // Global Explanation Mode: Beginner (Visual / Metaphor) vs Advanced (Equations / Transport)
  const [explanationMode, setExplanationMode] = useState<"beginner" | "advanced">("beginner");

  // =========================================================================
  // FLEX-69 State (NASA PSI-69 Specification)
  // =========================================================================
  const [flexStep, setFlexStep] = useState<number>(0);
  const [flexPlaying, setFlexPlaying] = useState<boolean>(false);
  const [flexTime, setFlexTime] = useState<number>(0);
  const [flexSpeed, setFlexSpeed] = useState<number>(1);
  const [flexOxygen, setFlexOxygen] = useState<number>(21);
  const [flexDiameter, setFlexDiameter] = useState<number>(4.0);
  const [flexPressure, setFlexPressure] = useState<number>(1.0);
  const [flexFuel, setFlexFuel] = useState<"n-Heptane" | "Methanol">("n-Heptane");
  const [selectedFlexRun, setSelectedFlexRun] = useState<FlexRun>(DOCUMENTED_FLEX_RUNS[0]);
  const [activeFlexHotspotId, setActiveFlexHotspotId] = useState<string>("droplet_dispenser");
  const [flexUploadedUrl, setFlexUploadedUrl] = useState<string | null>(null);

  // Dynamic User-Captured Frames (Starts fresh for each experiment run)
  const [flexCapturedPoints, setFlexCapturedPoints] = useState<CapturedDropletPoint[]>([]);
  const [flexFrameA, setFlexFrameA] = useState<{ t: number; d: number; d2: number } | null>(null);
  const [flexFrameB, setFlexFrameB] = useState<{ t: number; d: number; d2: number } | null>(null);

  // When experimental conditions change to start a new experiment, clear old captures
  useEffect(() => {
    setFlexPlaying(false);
    setFlexTime(0);
    setFlexCapturedPoints([]);
    setFlexFrameA(null);
    setFlexFrameB(null);
  }, [flexFuel, flexOxygen, flexDiameter, flexPressure, selectedFlexRun]);

  // Plot view mode in Step 4: D² vs Time OR D vs Time
  const [flexPlotMode, setFlexPlotMode] = useState<"d2" | "d">("d2");

  // Learning Challenges State (All 5 Activities from Prompt)
  const [quizPredictAnswer, setQuizPredictAnswer] = useState<number | null>(null);
  const [quizFindMeasurementAnswer, setQuizFindMeasurementAnswer] = useState<string | null>(null);
  const [quizCoolFlameAnswer, setQuizCoolFlameAnswer] = useState<number | null>(null);
  const [quizConfounderAnswer, setQuizConfounderAnswer] = useState<number | null>(null);
  const [flexPerspective, setFlexPerspective] = useState<"experimentalist" | "modeller">("experimentalist");

  const flexTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Playback timer for droplet animation
  useEffect(() => {
    if (flexPlaying) {
      const intervalMs = Math.round(150 / flexSpeed);
      flexTimerRef.current = setInterval(() => {
        setFlexTime((prev) => {
          if (prev >= 90) {
            setFlexPlaying(false);
            return 90;
          }
          return prev + 1;
        });
      }, intervalMs);
    } else {
      if (flexTimerRef.current) clearInterval(flexTimerRef.current);
    }
    return () => {
      if (flexTimerRef.current) clearInterval(flexTimerRef.current);
    };
  }, [flexPlaying, flexSpeed]);

  const toggleFlexPlay = () => setFlexPlaying((prev) => !prev);

  const resetFlexSimulation = (clearCaptures: boolean = true) => {
    setFlexPlaying(false);
    setFlexTime(0);
    if (clearCaptures) {
      setFlexCapturedPoints([]);
      setFlexFrameA(null);
      setFlexFrameB(null);
    }
  };

  const autoCaptureFlexDefaults = () => {
    const d10 = calculateDropletDiameter(10, flexDiameter, flexOxygen, flexFuel);
    const d60 = calculateDropletDiameter(60, flexDiameter, flexOxygen, flexFuel);
    const ptA: CapturedDropletPoint = {
      id: 1,
      t: 10,
      d: d10,
      d2: Number((d10 * d10).toFixed(3)),
      source: "model_benchmark",
    };
    const ptB: CapturedDropletPoint = {
      id: 2,
      t: 60,
      d: d60,
      d2: Number((d60 * d60).toFixed(3)),
      source: "model_benchmark",
    };
    setFlexCapturedPoints([ptA, ptB]);
    setFlexFrameA({ t: 10, d: d10, d2: d10 * d10 });
    setFlexFrameB({ t: 60, d: d60, d2: d60 * d60 });
  };

  const handleFlexVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (flexUploadedUrl) URL.revokeObjectURL(flexUploadedUrl);
      const url = URL.createObjectURL(file);
      setFlexUploadedUrl(url);
    }
  };

  // Droplet physical properties
  const flexK = calculateFlexK(flexFuel, flexOxygen);
  const currentFlexD = calculateDropletDiameter(flexTime, flexDiameter, flexOxygen, flexFuel);
  const flexRadiusRatio = Math.max(0, Math.min(1, currentFlexD / flexDiameter));
  const flexHasFlame =
    flexOxygen >= 17 &&
    flexTime < Math.min(90, (flexDiameter * flexDiameter - 0.16) / Math.max(0.001, flexK));

  // Dynamic frame capture implementation (Honors User Captures!)
  const captureCurrentFlexPoint = (slot?: "A" | "B") => {
    const dVal = calculateDropletDiameter(flexTime, flexDiameter, flexOxygen, flexFuel);
    const newPt: CapturedDropletPoint = {
      id: Date.now(),
      t: flexTime,
      d: dVal,
      d2: Number((dVal * dVal).toFixed(3)),
      source: "user_derived",
    };

    setFlexCapturedPoints((prev) => {
      // Remove any existing point at exact same time, then sort by t
      const filtered = prev.filter((p) => Math.abs(p.t - flexTime) > 0.05);
      return [...filtered, newPt].sort((a, b) => a.t - b.t);
    });

    if (slot === "A" || (!slot && (!flexFrameA || flexTime < (flexFrameB?.t || 90)))) {
      setFlexFrameA({ t: flexTime, d: dVal, d2: dVal * dVal });
    } else if (slot === "B" || (!slot && flexFrameA)) {
      setFlexFrameB({ t: flexTime, d: dVal, d2: dVal * dVal });
    }
  };

  // Dynamic user-measured rate constant K from Frame A and Frame B
  const userMeasuredFlexK =
    flexFrameA && flexFrameB && Math.abs(flexFrameB.t - flexFrameA.t) > 0.05
      ? Math.abs(flexFrameA.d2 - flexFrameB.d2) / Math.abs(flexFrameB.t - flexFrameA.t)
      : null;

  // NASA published reference rate for selected run
  const nasaReferenceK = selectedFlexRun.measuredK;
  const kDeviationPct =
    userMeasuredFlexK !== null
      ? Math.abs((userMeasuredFlexK - nasaReferenceK) / nasaReferenceK) * 100
      : null;

  // CSV export handler for FLEX
  const handleExportFlexCsv = () => {
    const headers = ["Timestamp (s)", "Droplet Diameter D (mm)", "Diameter Squared D^2 (mm^2)", "Fuel", "Oxygen (%)", "Pressure (atm)", "Data Provenance"];
    const rows = flexCapturedPoints.map((p) => [
      p.t.toFixed(1),
      p.d.toFixed(3),
      p.d2.toFixed(3),
      flexFuel,
      flexOxygen.toFixed(1),
      flexPressure.toFixed(2),
      p.source,
    ]);
    exportMeasurementCsv(`nasa_psi69_flex_measurements_${Date.now()}.csv`, headers, rows);
  };

  // =========================================================================
  // BASS-II State (Solid Flame Spread & Flight Video Lab)
  // =========================================================================
  const [bassStep, setBassStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedThickness, setSelectedThickness] = useState<number>(100);
  const [selectedOxygen, setSelectedOxygen] = useState<number>(22.2);
  const [selectedAirflow, setSelectedAirflow] = useState<number>(5.0);
  const [selectedRun, setSelectedRun] = useState<BassRun>(DOCUMENTED_BASS_RUNS[0]);

  // Mode toggle: Interactive Simulation vs NASA Flight Video
  const [bassViewMode, setBassViewMode] = useState<"sim" | "video">("sim");

  // Interactive Simulation State
  const [simTime, setSimTime] = useState<number>(0);
  const [simPlaying, setSimPlaying] = useState<boolean>(false);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [caliperA, setCaliperA] = useState<{ t: number; x: number } | null>(null);
  const [caliperB, setCaliperB] = useState<{ t: number; x: number } | null>(null);
  const [bassCapturedPoints, setBassCapturedPoints] = useState<CalibratedFramePoint[]>([]);
  const [bassDataSource, setBassDataSource] = useState<"active" | "synthetic">("active");
  const simTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Authentic NASA Flight Video State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [bassIsPlaying, setBassIsPlaying] = useState<boolean>(false);
  const [bassVideoSrc, setBassVideoSrc] = useState<string>("/firelab/bass2_video_1.mp4");
  const [videoCurrentTime, setVideoCurrentTime] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(38.3);
  const [activeHotspotId, setActiveHotspotId] = useState<string>("camera");
  const [showHowMeasured, setShowHowMeasured] = useState<boolean>(false);

  // Process Stage State
  const [t1, setT1] = useState<number>(2);
  const [t2, setT2] = useState<number>(8);
  const [showRegression, setShowRegression] = useState<boolean>(true);
  const [showRawTable, setShowRawTable] = useState<boolean>(false);
  const [selectedInstrument, setSelectedInstrument] = useState<string | null>(null);
  const [instrumentFeedback, setInstrumentFeedback] = useState<string | null>(null);

  // Interpret Stage State
  const [comparisonRunId, setComparisonRunId] = useState<string>("B3");
  const [confounderAnswer, setConfounderAnswer] = useState<string | null>(null);
  const [showConfounderFeedback, setShowConfounderFeedback] = useState<boolean>(false);
  const [perspective, setPerspective] = useState<"experimentalist" | "modeller">("experimentalist");

  // BASS flame physics
  const isQuenched = selectedOxygen < 16.0 || selectedAirflow < 0.4;
  const simSpreadRate = Number(
    (
      2.0 *
      (selectedOxygen / 22.2) *
      Math.pow(100 / selectedThickness, 0.6) *
      Math.sqrt(selectedAirflow / 5.0)
    ).toFixed(2)
  );
  const simFlameX = Math.min(
    100,
    simTime < 4.0 ? 0 : isQuenched && simTime > 12.0 ? simSpreadRate * 8.0 : simSpreadRate * (simTime - 4.0)
  );

  // BASS simulation loop
  useEffect(() => {
    if (simPlaying) {
      const intervalMs = Math.round(100 / simSpeed);
      simTimerRef.current = setInterval(() => {
        setSimTime((prev) => {
          if (prev >= 38) {
            setSimPlaying(false);
            return 38;
          }
          return Number((prev + 0.1).toFixed(1));
        });
      }, intervalMs);
    } else {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    }
    return () => {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    };
  }, [simPlaying, simSpeed]);

  const toggleSimPlay = () => setSimPlaying((prev) => !prev);
  const resetSim = (clearCaptures: boolean = true) => {
    setSimPlaying(false);
    setSimTime(0);
    if (clearCaptures) {
      setCaliperA(null);
      setCaliperB(null);
      setBassCapturedPoints([]);
      setT1(2);
      setT2(8);
    }
  };

  // When changing parameters to start a new experiment run, reset playback and clear previous calipers/captures
  useEffect(() => {
    resetSim(true);
  }, [selectedThickness, selectedOxygen, selectedAirflow, selectedRun]);

  const autoMarkBassCaliperDefaults = () => {
    markCaliper("A", 4);
    markCaliper("B", 12);
  };

  const markCaliper = (slot: "A" | "B", customTime?: number) => {
    const timeVal = customTime !== undefined ? customTime : simTime;
    const posX = Math.min(
      100,
      timeVal < 4.0 ? 0 : isQuenched && timeVal > 12.0 ? simSpreadRate * 8.0 : simSpreadRate * (timeVal - 4.0)
    );
    const pt = { t: Number(timeVal.toFixed(1)), x: Number(posX.toFixed(1)) };
    if (slot === "A") {
      setCaliperA(pt);
      setT1(pt.t);
    } else {
      setCaliperB(pt);
      setT2(pt.t);
    }
  };

  const captureBassPoint = (customTime?: number) => {
    const timeVal = customTime !== undefined ? customTime : simTime;
    const posX = Math.min(
      100,
      timeVal < 4.0 ? 0 : isQuenched && timeVal > 12.0 ? simSpreadRate * 8.0 : simSpreadRate * (timeVal - 4.0)
    );
    const newPt: CalibratedFramePoint = {
      t: Number(timeVal.toFixed(1)),
      x: Number(posX.toFixed(1)),
      source: "User Capture",
    };
    setBassCapturedPoints((prev) => {
      const filtered = prev.filter((p) => Math.abs(p.t - newPt.t) > 0.05);
      return [...filtered, newPt].sort((a, b) => a.t - b.t);
    });
  };

  const calculatedCaliperRate =
    caliperA && caliperB && Math.abs(caliperB.t - caliperA.t) > 0.1
      ? Math.abs(caliperB.x - caliperA.x) / Math.abs(caliperB.t - caliperA.t)
      : null;

  // Dynamic active dataset honoring user captures and simulation run
  const activeBassDataset = useMemo<CalibratedFramePoint[]>(() => {
    if (bassDataSource === "synthetic") {
      return SYNTHETIC_DATA_POINTS;
    }
    const baseTimes = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
    const map = new Map<number, CalibratedFramePoint>();
    for (const time of baseTimes) {
      const posX = Math.min(
        100,
        time < 4.0 ? 0 : isQuenched && time > 12.0 ? simSpreadRate * 8.0 : simSpreadRate * (time - 4.0)
      );
      map.set(time, {
        t: time,
        x: Number(posX.toFixed(1)),
        source: `Run Model (${selectedOxygen}%, ${selectedAirflow}cm/s)`,
      });
    }
    for (const pt of bassCapturedPoints) {
      map.set(pt.t, pt);
    }
    if (caliperA) {
      map.set(caliperA.t, {
        t: caliperA.t,
        x: caliperA.x,
        source: "User Caliper A",
      });
    }
    if (caliperB) {
      map.set(caliperB.t, {
        t: caliperB.t,
        x: caliperB.x,
        source: "User Caliper B",
      });
    }
    return Array.from(map.values()).sort((a, b) => a.t - b.t);
  }, [bassDataSource, isQuenched, simSpreadRate, selectedOxygen, selectedAirflow, bassCapturedPoints, caliperA, caliperB]);

  // Derive effective t1 and t2 based on active dataset and captures
  const effectiveT1 = activeBassDataset.some((p) => Math.abs(p.t - t1) < 0.05)
    ? t1
    : caliperA
    ? caliperA.t
    : (activeBassDataset[1]?.t ?? 2);

  const effectiveT2 = activeBassDataset.some((p) => Math.abs(p.t - t2) < 0.05 && p.t > effectiveT1)
    ? t2
    : caliperB && caliperB.t > effectiveT1
    ? caliperB.t
    : (activeBassDataset.find((p) => p.t > effectiveT1)?.t ?? (activeBassDataset[activeBassDataset.length - 1]?.t ?? 8));

  const matchResult = findNearestBassRun(selectedThickness, selectedOxygen, selectedAirflow);
  const spreadResult = calculateSpreadRate(effectiveT1, effectiveT2, activeBassDataset);
  const regressionResult = calculateLinearRegression(activeBassDataset);

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) setVideoCurrentTime(videoRef.current.currentTime);
  };
  const handleVideoLoadedMetadata = () => {
    if (videoRef.current && videoRef.current.duration) setVideoDuration(videoRef.current.duration);
  };
  const toggleBassVideoPlay = () => {
    if (!videoRef.current) return;
    if (bassIsPlaying) {
      videoRef.current.pause();
      setBassIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setBassIsPlaying(true);
    }
  };
  const seekVideoTo = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      setVideoCurrentTime(seconds);
    }
  };

  const handleSelectPredefinedRun = (runId: string) => {
    const run = DOCUMENTED_BASS_RUNS.find((r) => r.runId === runId);
    if (run) {
      setSelectedRun(run);
      setSelectedThickness(run.thicknessMicrons);
      setSelectedOxygen(run.oxygenPct);
      setSelectedAirflow(run.airflowCmS);
      resetSim();
    }
  };

  const activeHotspot = APPARATUS_HOTSPOTS.find((h) => h.id === activeHotspotId) || APPARATUS_HOTSPOTS[0];
  const activeFlexHotspot = FLEX_APPARATUS_HOTSPOTS.find((h) => h.id === activeFlexHotspotId) || FLEX_APPARATUS_HOTSPOTS[0];
  const comparisonRun = DOCUMENTED_BASS_RUNS.find((r) => r.runId === comparisonRunId) || DOCUMENTED_BASS_RUNS[1];

  const flexStepLabels = [
    "1 · Understand Apparatus",
    "2 · Watch Droplet Burn",
    "3 · Change Conditions",
    "4 · Measure & Process Data",
    "5 · Compare & Interpret",
  ];

  return (
    <div className="firelab-container">
      {/* 1. Global Header & Dual Investigation Switcher */}
      <header className="firelab-header">
        <div className="firelab-meta-bar">
          <span className="firelab-badge nasa-badge">NASA PHYSICAL SCIENCES INFORMATICS</span>
          <span className="firelab-meta-sep">•</span>
          <span className="firelab-submeta">Interactive Microgravity Laboratory</span>
          <span className="firelab-meta-sep">•</span>
          <span className="firelab-badge mode-badge">
            {activeInvestigation === "flex" ? "FLEX-69 (PSI-69)" : "BASS-II (PSI-25)"}
          </span>
          <span className="firelab-meta-sep" style={{ marginLeft: "auto" }}>•</span>
          {/* Explanation Mode Toggle */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#0d1e36", padding: "3px 8px", borderRadius: "6px", border: "1px solid #1e3a5f" }}>
            <span style={{ fontSize: "11px", color: "var(--ash)" }}>Mode:</span>
            <button
              type="button"
              className={`persp-btn ${explanationMode === "beginner" ? "active" : ""}`}
              onClick={() => setExplanationMode("beginner")}
              style={{ fontSize: "11px", padding: "3px 8px" }}
            >
              Beginner
            </button>
            <button
              type="button"
              className={`persp-btn ${explanationMode === "advanced" ? "active" : ""}`}
              onClick={() => setExplanationMode("advanced")}
              style={{ fontSize: "11px", padding: "3px 8px" }}
            >
              Advanced (Equations)
            </button>
          </div>
        </div>

        <h1 className="firelab-title">Learning FireLab: Experience Fire in Space</h1>
        <p className="firelab-subtitle">
          Step into the shoes of a NASA microgravity combustion researcher. Explore how flame geometry, burning rates, and extinction dynamics behave when buoyant convection is removed aboard the International Space Station.
        </p>

        {/* Primary Investigation Switcher */}
        <div className="investigation-switcher" role="tablist" aria-label="Select Combustion Investigation">
          <button
            type="button"
            role="tab"
            aria-selected={activeInvestigation === "flex"}
            className={`inv-switch-btn ${activeInvestigation === "flex" ? "active" : ""}`}
            onClick={() => handleSwitchInvestigation("flex")}
            id="tab-flex"
          >
            <div className="inv-btn-title">
              <span>🔵 NASA PSI-69: FLEX Droplet Lab</span>
              <span className="inv-btn-tag">RECOMMENDED START</span>
            </div>
            <div className="inv-btn-desc">
              Droplet combustion, spherical flame symmetry, D² burning-rate law, cool flames, and frame-by-frame measurement.
            </div>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeInvestigation === "bass"}
            className={`inv-switch-btn ${activeInvestigation === "bass" ? "active" : ""}`}
            onClick={() => handleSwitchInvestigation("bass")}
            id="tab-bass"
          >
            <div className="inv-btn-title">
              <span>🔴 NASA PSI-25: BASS-II Solid Spread Lab</span>
              <span className="inv-btn-tag">INTERACTIVE SIM & FLIGHT VIDEO</span>
            </div>
            <div className="inv-btn-desc">
              Solid PMMA flame spread, interactive wind tunnel simulation, high-speed camera tracking, and regression analysis.
            </div>
          </button>
        </div>
      </header>

      {/* =====================================================================
          INVESTIGATION 1: FLEX-69 Virtual Combustion Laboratory
          ===================================================================== */}
      {activeInvestigation === "flex" && (
        <div className="flex-investigation-wrap">
          {/* Sub-header & Stepper */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
            <div>
              <span className="firelab-badge mode-badge">NASA PSI-69 · FLEX VIRTUAL COMBUSTION LAB</span>
              <h2 style={{ fontSize: "28px", margin: "6px 0 2px 0", color: "#ffffff" }}>
                Why does fire look different in space?
              </h2>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--ash)" }}>
                {explanationMode === "beginner"
                  ? "A guided, hands-on introduction to real droplet-combustion research aboard the International Space Station."
                  : "Quasi-steady spherically symmetric droplet gasification, d²-law regression, radiative extinction, and low-temperature cool flame kinetics."}
              </p>
            </div>
            <a
              className="firelab-btn ghost-btn"
              href="https://psi.nasa.gov/physci/repo/data/investigations/PSI-69"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none" }}
            >
              NASA PSI-69 Investigation ↗
            </a>
          </div>

          {/* Stepper Navigation */}
          <nav className="firelab-stepper" aria-label="FLEX Learning Steps" style={{ marginBottom: "28px" }}>
            {flexStepLabels.map((lbl, idx) => (
              <button
                key={lbl}
                type="button"
                className={`step-btn ${flexStep === idx ? "active" : ""} ${flexStep > idx ? "completed" : ""}`}
                onClick={() => {
                  setFlexPlaying(false);
                  setFlexStep(idx);
                }}
              >
                <span className="step-num">{idx + 1}</span>
                <span className="step-label">{lbl.replace(/^\d\s*·\s*/, "")}</span>
              </button>
            ))}
          </nav>

          {/* ================= STAGE 1: UNDERSTAND THE EXPERIMENT ================= */}
          {flexStep === 0 && (
            <div className="comparison-columns" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px" }}>
              <div className="firelab-card">
                <span className="flex-pill">The Big Scientific Idea</span>
                <h3 style={{ fontSize: "22px", color: "#ffffff", margin: "10px 0 14px 0" }}>
                  On Earth, hot combustion gases rise. In space, buoyant flow is absent.
                </h3>
                <p style={{ lineHeight: 1.6, color: "var(--ash)" }}>
                  On Earth, gravity drives natural buoyant convection: hot, lower-density combustion products rise, pulling fresh oxygen into the base of the flame. In the ISS microgravity environment (g ≈ 10⁻⁶ g₀), buoyancy is eliminated. Combustion becomes governed by <strong>isotropic molecular diffusion</strong>, causing the flame to form a near-perfect spherical shell around the fuel droplet.
                </p>

                {explanationMode === "advanced" && (
                  <div className="flex-help-box" style={{ background: "rgba(14, 165, 233, 0.12)", borderColor: "#0284c7" }}>
                    <strong>Mathematical Principle:</strong> In the limit of Rayleigh number Ra → 0 and Grashof number Gr → 0, the Navier-Stokes momentum equation reduces to pure diffusive transport: <code>∇ · (ρ v⃗ Yᵢ − ρ D ∇ Yᵢ) = ω̇ᵢ</code>.
                  </div>
                )}

                <div className="flex-help-box">
                  <strong>Why does this matter for space safety?</strong> Spacecraft life-support habitats operate at unique atmospheric compositions (30% O₂, reduced pressure). Understanding diffusion-limited extinction boundaries is vital to prevent catastrophic spacecraft fires.
                </div>

                <div style={{ marginTop: "24px" }}>
                  <button
                    type="button"
                    className="firelab-btn primary-btn"
                    onClick={() => setFlexStep(1)}
                  >
                    Start Experiment →
                  </button>
                </div>
              </div>

              {/* Hardware Hotspots Explorer for FLEX Chamber */}
              <div className="firelab-card">
                <h3 style={{ fontSize: "18px", color: "#ffffff", margin: "0 0 12px 0" }}>
                  FLEX Apparatus & Diagnostics
                </h3>
                <p style={{ color: "var(--ash)", fontSize: "13px", margin: "0 0 16px 0" }}>
                  Click an apparatus hotspot below to inspect how NASA generates droplets, triggers ignition, and captures high-speed data:
                </p>

                <div className="hotspot-tabs" style={{ marginBottom: "16px" }}>
                  {FLEX_APPARATUS_HOTSPOTS.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      className={`hotspot-tab-btn ${activeFlexHotspotId === h.id ? "active" : ""}`}
                      onClick={() => setActiveFlexHotspotId(h.id)}
                    >
                      {h.icon} {h.name}
                    </button>
                  ))}
                </div>

                <div className="hotspot-detail-card">
                  <div className="hotspot-badge-row">
                    <span className="hotspot-instrument-tag">{activeFlexHotspot.instrument}</span>
                    <span className="hotspot-uncertainty-tag">{activeFlexHotspot.icon} Diagnostic Hardware</span>
                  </div>
                  <p className="hotspot-desc">{activeFlexHotspot.description}</p>
                  <div className="hotspot-specs-grid">
                    <div>
                      <strong>Deployment / Measurement:</strong>
                      <p>{activeFlexHotspot.howMeasured}</p>
                    </div>
                    <div>
                      <strong>Calibration Protocol:</strong>
                      <p>{activeFlexHotspot.calibrationNotes}</p>
                    </div>
                  </div>
                </div>

                {/* Earth vs Microgravity Visual Schematic */}
                <div className="flex-stage" style={{ height: "200px", marginTop: "16px" }}>
                  <svg viewBox="0 0 560 260" role="img" aria-label="Earth vs Microgravity flame comparison">
                    <text x="135" y="32" fill="white" textAnchor="middle" fontSize="16" fontWeight="bold">Earth (Buoyancy Plume)</text>
                    <text x="415" y="32" fill="white" textAnchor="middle" fontSize="16" fontWeight="bold">Space (Spherical Diffusion)</text>
                    {/* Earth teardrop flame */}
                    <path d="M135 220 Q85 160 120 85 Q130 65 140 45 Q190 140 150 220Z" fill="#ff983b" opacity="0.8" />
                    <circle cx="135" cy="205" r="14" fill="#b9e7ff" />
                    <path d="M75 120V60m-6 10 6-10 6 10" stroke="#81d3fc" strokeWidth="2.5" fill="none" />
                    <text x="135" y="245" textAnchor="middle" fill="#afc8df" fontSize="12" fontFamily="var(--f-mono)">Hot plume rises</text>
                    {/* Space spherical flame */}
                    <circle cx="415" cy="150" r="70" fill="#fa973c" opacity="0.3" />
                    <circle cx="415" cy="150" r="45" fill="none" stroke="#ffa84b" strokeWidth="2.5" strokeDasharray="4 4" />
                    <circle cx="415" cy="150" r="14" fill="#b9e7ff" />
                    <text x="415" y="245" textAnchor="middle" fill="#afc8df" fontSize="12" fontFamily="var(--f-mono)">Uniform radial diffusion</text>
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* ================= STAGE 2: WATCH THE REAL EXPERIMENT ================= */}
          {flexStep === 1 && (
            <div className="comparison-columns" style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: "24px" }}>
              <div className="firelab-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <h3 style={{ fontSize: "20px", color: "#ffffff", margin: 0 }}>
                    Watch a Droplet Burn in Space
                  </h3>
                  <span className="flex-status-badge">
                    {flexHasFlame ? "Visible Diffusion Flame Active" : "Visible Flame Extinguished (Cool Flame)"}
                  </span>
                </div>

                <p style={{ color: "var(--ash)", fontSize: "14px", lineHeight: 1.5, margin: "0 0 16px 0" }}>
                  The liquid fuel droplet is suspended on a 14-µm silicon carbide filament. Scrub through the timeline and use <strong>Capture Frame</strong> to record data points for your measurement analysis!
                </p>

                {/* Interactive SVG Animation with Realistic Microgravity Physics */}
                <div className="flex-stage">
                  <div className="flex-status-badge">
                    ILLUSTRATIVE · t = {flexTime.toFixed(0)} s / 90 s
                  </div>

                  <svg viewBox="0 0 640 380" role="img" aria-label="Interactive animated spherical flame and droplet">
                    <defs>
                      <radialGradient id="dropletGlow">
                        <stop stopColor="#ffedd5" stopOpacity="0.2" />
                        <stop offset="0.35" stopColor="#fb923c" stopOpacity="0.5" />
                        <stop offset="0.75" stopColor="#ea580c" stopOpacity="0.25" />
                        <stop offset="1" stopColor="#ea580c" stopOpacity="0" />
                      </radialGradient>
                      <radialGradient id="liquidFuelGrad">
                        <stop stopColor="#e0f2fe" />
                        <stop offset="1" stopColor="#0284c7" />
                      </radialGradient>
                    </defs>

                    {/* Background chamber interior */}
                    <rect x="0" y="0" width="640" height="380" fill="#060d19" />

                    {/* Spherically symmetric luminous flame */}
                    {flexHasFlame && (
                      <g>
                        <circle cx="320" cy="190" r={115 * flexRadiusRatio + 36} fill="url(#dropletGlow)" />
                        <circle
                          cx="320"
                          cy="190"
                          r={65 * flexRadiusRatio + 26}
                          fill="none"
                          stroke="#fdba74"
                          strokeOpacity="0.85"
                          strokeWidth="2.5"
                        />
                      </g>
                    )}

                    {/* Liquid droplet */}
                    <circle
                      cx="320"
                      cy="190"
                      r={Math.max(4, 40 * flexRadiusRatio)}
                      fill="url(#liquidFuelGrad)"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />

                    {/* 14-micron support fiber */}
                    <line x1="60" y1="190" x2={320 - Math.max(4, 40 * flexRadiusRatio) - 4} y2="190" stroke="#64748b" strokeWidth="1.5" strokeDasharray="6 4" />
                    <line x1={320 + Math.max(4, 40 * flexRadiusRatio) + 4} y1="190" x2="580" y2="190" stroke="#64748b" strokeWidth="1.5" strokeDasharray="6 4" />

                    {/* Caliper fiducial lines at current diameter */}
                    <line x1={320 - Math.max(4, 40 * flexRadiusRatio)} y1="130" x2={320 - Math.max(4, 40 * flexRadiusRatio)} y2="250" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1={320 + Math.max(4, 40 * flexRadiusRatio)} y1="130" x2={320 + Math.max(4, 40 * flexRadiusRatio)} y2="250" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 3" />

                    <text x="320" y="345" fill="#bae6fd" textAnchor="middle" fontSize="13" fontFamily="var(--f-mono)">
                      Droplet Diameter: D = {currentFlexD.toFixed(2)} mm (D² = {(currentFlexD * currentFlexD).toFixed(2)} mm²)
                    </text>
                  </svg>
                </div>

                {/* Player Controls Bar */}
                <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "14px", flexWrap: "wrap" }}>
                  <button type="button" className="firelab-btn primary-btn" onClick={toggleFlexPlay}>
                    {flexPlaying ? "⏸ Pause" : "▶ Play Animation"}
                  </button>
                  <button type="button" className="firelab-btn secondary-btn" onClick={() => resetFlexSimulation(true)}>
                    ↺ Restart
                  </button>

                  <div className="sim-speed-group">
                    <button type="button" className={`sim-speed-btn ${flexSpeed === 0.5 ? "active" : ""}`} onClick={() => setFlexSpeed(0.5)}>0.5x</button>
                    <button type="button" className={`sim-speed-btn ${flexSpeed === 1 ? "active" : ""}`} onClick={() => setFlexSpeed(1)}>1x</button>
                    <button type="button" className={`sim-speed-btn ${flexSpeed === 2 ? "active" : ""}`} onClick={() => setFlexSpeed(2)}>2x</button>
                  </div>

                  <span style={{ fontFamily: "var(--f-mono)", fontSize: "14px", color: "var(--accent)", marginLeft: "auto" }}>
                    t = {flexTime.toFixed(0)} s / 90 s
                  </span>
                </div>

                <input
                  aria-label="Droplet timeline scrubber"
                  type="range"
                  min="0"
                  max="90"
                  step="1"
                  value={flexTime}
                  onChange={(e) => {
                    setFlexPlaying(false);
                    setFlexTime(Number(e.target.value));
                  }}
                  className="firelab-range"
                />

                {/* DYNAMIC FRAME CAPTURE WORKBENCH (Honors User Captures) */}
                <div style={{ background: "#060e1c", padding: "16px 20px", borderRadius: "12px", border: "1px solid #1e3a5f", marginTop: "18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                    <strong style={{ fontSize: "14px", color: "#ffffff" }}>📸 Frame Capture Workbench:</strong>
                    <span style={{ fontSize: "12px", color: "var(--accent)", fontFamily: "var(--f-mono)" }}>
                      Current: D = {currentFlexD.toFixed(2)} mm (D² = {(currentFlexD * currentFlexD).toFixed(2)} mm²)
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="firelab-btn secondary-btn"
                      onClick={() => captureCurrentFlexPoint("A")}
                      style={{ flex: 1, borderColor: "#ffbd70", color: "#ffbd70" }}
                    >
                      📸 Capture Frame A ({flexTime}s)
                    </button>
                    <button
                      type="button"
                      className="firelab-btn secondary-btn"
                      onClick={() => captureCurrentFlexPoint("B")}
                      style={{ flex: 1, borderColor: "#f97c9c", color: "#f97c9c" }}
                    >
                      📸 Capture Frame B ({flexTime}s)
                    </button>
                    <button
                      type="button"
                      className="firelab-btn secondary-btn"
                      onClick={() => captureCurrentFlexPoint()}
                      style={{ borderColor: "#38bdf8", color: "#38bdf8" }}
                    >
                      + Add Frame Point
                    </button>
                    <button
                      type="button"
                      className="firelab-btn secondary-btn"
                      onClick={autoCaptureFlexDefaults}
                      style={{ borderColor: "#a78bfa", color: "#a78bfa" }}
                    >
                      ⚡ Auto-Sample (10s &amp; 60s)
                    </button>
                    {(flexFrameA || flexFrameB || flexCapturedPoints.length > 0) && (
                      <button
                        type="button"
                        className="firelab-btn ghost-btn small"
                        onClick={() => resetFlexSimulation(true)}
                        style={{ color: "var(--ash)" }}
                      >
                        ↺ Clear Captures
                      </button>
                    )}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "var(--ash)", fontFamily: "var(--f-mono)", marginTop: "12px", flexWrap: "wrap", gap: "8px" }}>
                    <span>Frame A: {flexFrameA ? `${flexFrameA.t}s (D² = ${flexFrameA.d2.toFixed(2)} mm²)` : "Not captured"}</span>
                    <span>Frame B: {flexFrameB ? `${flexFrameB.t}s (D² = ${flexFrameB.d2.toFixed(2)} mm²)` : "Not captured"}</span>
                    <span>Recorded Points: {flexCapturedPoints.length}</span>
                  </div>

                  {userMeasuredFlexK !== null && (
                    <div style={{ marginTop: "12px", fontSize: "13px", color: "#a7f4e8", fontFamily: "var(--f-mono)", borderTop: "1px solid #1e3a5f", paddingTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                      <span>Your Measured K = (D_A² − D_B²) / (t_B − t_A) = <strong>{userMeasuredFlexK.toFixed(3)} mm²/s</strong></span>
                      <button
                        type="button"
                        className="firelab-btn ghost-btn"
                        onClick={() => setFlexStep(3)}
                        style={{ fontSize: "12px", padding: "4px 10px" }}
                      >
                        Analyze in Step 4 →
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Verified NASA Flight Video Option */}
              <div className="firelab-card">
                <h3 style={{ fontSize: "20px", color: "#ffffff", margin: "0 0 8px 0" }}>
                  Watch an Actual NASA Recording
                </h3>
                <p style={{ color: "var(--ash)", fontSize: "14px", lineHeight: 1.5, margin: "0 0 16px 0" }}>
                  Directly inspect authentic NASA ISS astronaut flight video from the{" "}
                  <a href="https://psi.nasa.gov/physci/repo/data/investigations/PSI-69" target="_blank" rel="noopener noreferrer" style={{ color: "#38bdf8" }}>
                    NASA PSI-69 archive ↗
                  </a>.
                </p>

                <div className="flex-uploader-area">
                  <span style={{ fontSize: "13px", color: "var(--ink-2)", display: "block" }}>
                    Load verified NASA MP4 flight footage:
                  </span>
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/*"
                    onChange={handleFlexVideoUpload}
                    className="flex-file-input"
                  />
                </div>

                {flexUploadedUrl ? (
                  <div style={{ borderRadius: "10px", overflow: "hidden", border: "1px solid #1e3a5f", background: "#000" }}>
                    <video controls src={flexUploadedUrl} style={{ width: "100%", maxHeight: "280px", display: "block" }} />
                  </div>
                ) : (
                  <div className="flex-warning-box">
                    <strong>Notice:</strong> No external NASA video uploaded yet. The animation on the left illustrates verified analytical droplet gasification. You can also view the authentic BASS-II flight video in the Solid Spread tab!
                  </div>
                )}

                {/* Milestone observations */}
                <div style={{ borderTop: "1px solid #1e3a5f", paddingTop: "16px", marginTop: "20px" }}>
                  <strong style={{ color: "#ffffff", fontSize: "14px", display: "block", marginBottom: "8px" }}>
                    Key Phenomenological Milestones to Observe:
                  </strong>
                  <ul style={{ color: "var(--ash)", fontSize: "13px", lineHeight: 1.6, paddingLeft: "20px", margin: 0 }}>
                    <li><strong>Ignition Transient (t ≈ 0–3s):</strong> Ignition sparks vaporize initial fuel; flame rapidly expands into spherical envelope.</li>
                    <li><strong>Quasi-Steady Burning (t ≈ 4–35s):</strong> Droplet diameter shrinks smoothly according to the classical d²-law.</li>
                    <li><strong>Visible Extinction / Cool Flame (t &gt; 36s):</strong> Radiative soot cooling abruptly snuffs visible light, but low-temperature combustion continues invisibly.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ================= STAGE 3: CHANGE EXPERIMENTAL CONDITIONS ================= */}
          {flexStep === 2 && (
            <div className="comparison-columns" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px" }}>
              <div className="firelab-card">
                <h3 style={{ fontSize: "20px", color: "#ffffff", margin: "0 0 8px 0" }}>
                  Change Conditions: Observe Physical Sensitivity
                </h3>
                <p style={{ color: "var(--ash)", fontSize: "14px", lineHeight: 1.5, margin: "0 0 20px 0" }}>
                  Explore how ambient oxygen, chamber pressure, fuel chemistry, and initial droplet size impact microgravity burning rates.
                </p>

                {/* Predefined NASA FLEX Flight Run Picker */}
                <div style={{ background: "#060e1c", padding: "14px 18px", borderRadius: "10px", border: "1px solid #1e3a5f", marginBottom: "20px" }}>
                  <label htmlFor="flex-run-preset" style={{ fontSize: "13px", color: "#ffffff", fontWeight: 600, display: "block", marginBottom: "6px" }}>
                    Select Documented NASA PSI-69 Flight Run:
                  </label>
                  <select
                    id="flex-run-preset"
                    className="firelab-select"
                    style={{ width: "100%" }}
                    value={selectedFlexRun.runId}
                    onChange={(e) => {
                      const run = DOCUMENTED_FLEX_RUNS.find((r) => r.runId === e.target.value);
                      if (run) {
                        setSelectedFlexRun(run);
                        setFlexFuel(run.fuel);
                        setFlexOxygen(run.oxygenPct);
                        setFlexDiameter(run.initialDiameterMm);
                        setFlexPressure(run.pressureAtm);
                        resetFlexSimulation();
                      }
                    }}
                  >
                    {DOCUMENTED_FLEX_RUNS.map((r) => (
                      <option key={r.runId} value={r.runId}>
                        {r.runId}: {r.fuel}, {r.oxygenPct}% O₂, {r.initialDiameterMm} mm D₀, {r.pressureAtm} atm ({r.extinctionType})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Controls Grid */}
                <div className="controls-grid" style={{ marginBottom: "20px" }}>
                  {/* 1. Fuel Type */}
                  <div className="control-item">
                    <label htmlFor="fuel-type-select" style={{ fontSize: "13px", color: "var(--ash)", display: "block", marginBottom: "6px" }}>
                      Fuel Chemistry:
                    </label>
                    <select
                      id="fuel-type-select"
                      className="firelab-select"
                      style={{ width: "100%" }}
                      value={flexFuel}
                      onChange={(e) => {
                        setFlexFuel(e.target.value as "n-Heptane" | "Methanol");
                        resetFlexSimulation();
                      }}
                    >
                      <option value="n-Heptane">n-Heptane (Standard Alkane / Sooting)</option>
                      <option value="Methanol">Methanol (Oxygenated Alcohol / Clean)</option>
                    </select>
                    <small className="control-hint" style={{ marginTop: "6px" }}>
                      Methanol produces minimal soot radiation, altering extinction behavior.
                    </small>
                  </div>

                  {/* 2. Oxygen Slider */}
                  <div className="control-item">
                    <div className="control-label-row">
                      <label htmlFor="flex-oxy-slider">Oxygen (O₂)</label>
                      <span className="control-val">{flexOxygen.toFixed(1)}%</span>
                    </div>
                    <input
                      id="flex-oxy-slider"
                      type="range"
                      min="15"
                      max="35"
                      step="1"
                      value={flexOxygen}
                      onChange={(e) => {
                        setFlexOxygen(Number(e.target.value));
                        resetFlexSimulation();
                      }}
                      className="firelab-range"
                    />
                    <div className="range-ticks">
                      <span>15% (Limit)</span>
                      <span>21% (Air)</span>
                      <span>30% (Spacecraft)</span>
                    </div>
                  </div>

                  {/* 3. Initial Diameter Slider */}
                  <div className="control-item">
                    <div className="control-label-row">
                      <label htmlFor="flex-init-d-slider">Initial Diameter (D₀)</label>
                      <span className="control-val">{flexDiameter.toFixed(1)} mm</span>
                    </div>
                    <input
                      id="flex-init-d-slider"
                      type="range"
                      min="2.0"
                      max="5.0"
                      step="0.5"
                      value={flexDiameter}
                      onChange={(e) => {
                        setFlexDiameter(Number(e.target.value));
                        resetFlexSimulation();
                      }}
                      className="firelab-range"
                    />
                    <div className="range-ticks">
                      <span>2.0 mm</span>
                      <span>3.5 mm</span>
                      <span>5.0 mm</span>
                    </div>
                  </div>

                  {/* 4. Ambient Pressure Slider */}
                  <div className="control-item">
                    <div className="control-label-row">
                      <label htmlFor="flex-press-slider">Ambient Pressure</label>
                      <span className="control-val">{flexPressure.toFixed(2)} atm</span>
                    </div>
                    <input
                      id="flex-press-slider"
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.05"
                      value={flexPressure}
                      onChange={(e) => {
                        setFlexPressure(Number(e.target.value));
                        resetFlexSimulation();
                      }}
                      className="firelab-range"
                    />
                    <div className="range-ticks">
                      <span>0.5 atm (Lunar)</span>
                      <span>1.0 atm (Std)</span>
                      <span>1.5 atm</span>
                    </div>
                  </div>
                </div>

                {/* Side-by-Side Model Comparison at t=40s */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", background: "#060e1c", padding: "16px", borderRadius: "12px", border: "1px solid #1e3a5f" }}>
                  <div>
                    <div style={{ fontSize: "12px", color: "var(--ash)", marginBottom: "8px", fontFamily: "var(--f-mono)" }}>
                      Reference Baseline: 21% O₂ at t = 40 s
                    </div>
                    <div className="flex-stage" style={{ aspectRatio: "1", margin: 0 }}>
                      {(() => {
                        const dRef = calculateDropletDiameter(40, flexDiameter, 21, flexFuel);
                        const rRef = Math.max(0, Math.min(1, dRef / flexDiameter));
                        return (
                          <svg viewBox="0 0 300 300">
                            <circle cx="150" cy="150" r={60 * rRef + 20} fill="#fa973c" opacity="0.3" />
                            <circle cx="150" cy="150" r={35 * rRef + 15} fill="none" stroke="#ffa84b" strokeWidth="2" />
                            <circle cx="150" cy="150" r={Math.max(4, 22 * rRef)} fill="#b9e7ff" />
                            <text x="150" y="270" textAnchor="middle" fill="#b8cde2" fontSize="12" fontFamily="var(--f-mono)">
                              D = {dRef.toFixed(2)} mm
                            </text>
                          </svg>
                        );
                      })()}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "12px", color: "var(--accent)", marginBottom: "8px", fontFamily: "var(--f-mono)" }}>
                      Selected: {flexOxygen}% O₂, {flexPressure} atm at t = 40 s
                    </div>
                    <div className="flex-stage" style={{ aspectRatio: "1", margin: 0 }}>
                      {(() => {
                        const dSel = calculateDropletDiameter(40, flexDiameter, flexOxygen, flexFuel);
                        const rSel = Math.max(0, Math.min(1, dSel / flexDiameter));
                        const hasF = flexOxygen >= 17;
                        return (
                          <svg viewBox="0 0 300 300">
                            {hasF && (
                              <>
                                <circle cx="150" cy="150" r={60 * rSel + 20} fill="#fa973c" opacity="0.4" />
                                <circle cx="150" cy="150" r={35 * rSel + 15} fill="none" stroke="#ffae50" strokeWidth="2" />
                              </>
                            )}
                            <circle cx="150" cy="150" r={Math.max(4, 22 * rSel)} fill="#b9e7ff" />
                            <text x="150" y="270" textAnchor="middle" fill={hasF ? "#b8cde2" : "#ffbb8e"} fontSize="12" fontFamily="var(--f-mono)">
                              {hasF ? `D = ${dSel.toFixed(2)} mm` : "Quenched (< 17%)"}
                            </text>
                          </svg>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div className="flex-warning-box">
                  <strong>Notice:</strong> Controls change an illustrative transport model. For verified NASA test runs, select from the documented dropdown above.
                </div>
              </div>

              {/* Research Challenge 1: Predict Before Reveal */}
              <div className="firelab-card">
                <div className="mini-game-header">
                  <span className="game-badge">Challenge 1</span>
                  <h4>Predict Before Reveal</h4>
                </div>
                <p className="game-prompt">
                  Before observing the simulation, how do you expect the burning-rate constant <strong>K</strong> to respond if oxygen concentration is increased from 21% to 30%?
                </p>

                <div className="game-options-vertical">
                  <button
                    type="button"
                    className={`confounder-btn ${quizPredictAnswer === 1 ? "selected correct" : ""}`}
                    onClick={() => setQuizPredictAnswer(1)}
                  >
                    A. K will increase substantially because higher oxidizer flux raises flame temperature and accelerates chemical reaction rates.
                  </button>
                  <button
                    type="button"
                    className={`confounder-btn ${quizPredictAnswer === 2 ? "selected" : ""}`}
                    onClick={() => setQuizPredictAnswer(2)}
                  >
                    B. K will decrease because microgravity suppresses mass transfer at higher oxygen concentrations.
                  </button>
                  <button
                    type="button"
                    className={`confounder-btn ${quizPredictAnswer === 3 ? "selected" : ""}`}
                    onClick={() => setQuizPredictAnswer(3)}
                  >
                    C. K is strictly independent of ambient oxygen.
                  </button>
                </div>

                {quizPredictAnswer === 1 && (
                  <div className="game-feedback positive">
                    ✓ <strong>Correct prediction!</strong> Oxygen enrichment increases the stoichiometric flame temperature, accelerating fuel vaporization and driving the burning-rate constant K higher (Spalding mass transfer number B increases).
                  </div>
                )}
                {(quizPredictAnswer === 2 || quizPredictAnswer === 3) && (
                  <div className="game-feedback negative">
                    ✕ <strong>Review:</strong> Molecular oxygen concentration directly governs the chemical heat release and temperature gradient. Higher oxygen increases K. Try Option A!
                  </div>
                )}

                <div className="flex-help-box" style={{ marginTop: "24px" }}>
                  <strong>Researcher&apos;s Rule:</strong> If two NASA tests differ in oxygen, can you attribute the difference solely to oxygen? Only if initial diameter, chamber pressure, and support fiber thickness are held constant!
                </div>
              </div>
            </div>
          )}

          {/* ================= STAGE 4: MEASURE AND PROCESS DATA (HONORS USER CAPTURES) ================= */}
          {flexStep === 3 && (
            <div className="comparison-columns" style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: "24px" }}>
              <div className="firelab-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                  <h3 style={{ fontSize: "20px", color: "#ffffff", margin: 0 }}>
                    Measure and Process Droplet Data
                  </h3>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className={`firelab-btn ghost-btn small ${flexPlotMode === "d2" ? "active" : ""}`}
                      onClick={() => setFlexPlotMode("d2")}
                    >
                      Plot D² vs Time
                    </button>
                    <button
                      type="button"
                      className={`firelab-btn ghost-btn small ${flexPlotMode === "d" ? "active" : ""}`}
                      onClick={() => setFlexPlotMode("d")}
                    >
                      Plot D vs Time
                    </button>
                    {(flexFrameA || flexFrameB || flexCapturedPoints.length > 0) && (
                      <button
                        type="button"
                        className="firelab-btn ghost-btn small"
                        onClick={() => resetFlexSimulation(true)}
                        style={{ color: "var(--ash)" }}
                      >
                        ↺ Start New Run (Clear)
                      </button>
                    )}
                  </div>
                </div>

                <p style={{ color: "var(--ash)", fontSize: "14px", lineHeight: 1.5, margin: "0 0 16px 0" }}>
                  This workbench <strong>honors your live captures</strong>. Capture observation points directly or scrub the slider below to calculate the apparent burning rate constant <strong>K</strong>.
                </p>

                {flexCapturedPoints.length === 0 && (
                  <div className="flex-help-box" style={{ background: "rgba(56, 189, 248, 0.12)", borderColor: "#38bdf8", color: "#bae6fd", marginBottom: "16px" }}>
                    ✨ <strong>New Experiment Started ({flexFuel}, {flexOxygen}% O₂, D₀ = {flexDiameter}mm):</strong> Previous captures were cleared for this fresh test. Scrub the timeline below to capture Frames A &amp; B, or click Auto-Sample!
                    <div style={{ marginTop: "10px" }}>
                      <button type="button" className="firelab-btn primary-btn small" onClick={autoCaptureFlexDefaults}>
                        ⚡ Auto-Sample Benchmark Frames (10s &amp; 60s)
                      </button>
                    </div>
                  </div>
                )}

                {/* Quick Frame Capture in Stage 4 */}
                <div style={{ background: "#060e1c", padding: "14px 18px", borderRadius: "10px", border: "1px solid #1e3a5f", marginBottom: "18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <span style={{ fontSize: "13px", color: "#ffffff", fontWeight: 600 }}>Scrub &amp; Capture Observation Points:</span>
                    <span style={{ fontSize: "13px", color: "var(--accent)", fontFamily: "var(--f-mono)" }}>
                      t = {flexTime}s (D = {currentFlexD.toFixed(2)} mm)
                    </span>
                  </div>
                  <input
                    aria-label="Timeline scrubber for capture"
                    type="range"
                    min="0"
                    max="90"
                    step="1"
                    value={flexTime}
                    onChange={(e) => setFlexTime(Number(e.target.value))}
                    className="firelab-range"
                    style={{ marginBottom: "10px" }}
                  />
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="firelab-btn secondary-btn"
                      onClick={() => captureCurrentFlexPoint("A")}
                      style={{ flex: 1, borderColor: "#ffbd70", color: "#ffbd70" }}
                    >
                      Set Frame A ({flexTime}s)
                    </button>
                    <button
                      type="button"
                      className="firelab-btn secondary-btn"
                      onClick={() => captureCurrentFlexPoint("B")}
                      style={{ flex: 1, borderColor: "#f97c9c", color: "#f97c9c" }}
                    >
                      Set Frame B ({flexTime}s)
                    </button>
                    <button
                      type="button"
                      className="firelab-btn secondary-btn"
                      onClick={() => captureCurrentFlexPoint()}
                      style={{ borderColor: "#38bdf8", color: "#38bdf8" }}
                    >
                      + Add to Table
                    </button>
                    <button
                      type="button"
                      className="firelab-btn secondary-btn"
                      onClick={autoCaptureFlexDefaults}
                      style={{ borderColor: "#a78bfa", color: "#a78bfa" }}
                    >
                      ⚡ Auto-Sample
                    </button>
                  </div>
                </div>

                {/* Frame Selection Dropdowns from Captured Points */}
                {flexCapturedPoints.length >= 2 && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                    <div className="point-select-group">
                      <label htmlFor="flex-fa-select">Frame A Point (t₁):</label>
                      <select
                        id="flex-fa-select"
                        value={flexFrameA?.t ?? flexCapturedPoints[0]?.t}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const pt = flexCapturedPoints.find((p) => Math.abs(p.t - val) < 0.1);
                          if (pt) setFlexFrameA({ t: pt.t, d: pt.d, d2: pt.d2 });
                        }}
                        className="firelab-select"
                      >
                        {flexCapturedPoints.map((p) => (
                          <option key={p.id} value={p.t}>
                            t = {p.t}s (D = {p.d.toFixed(2)}mm, D² = {p.d2.toFixed(2)}mm²) [{p.source}]
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="point-select-group">
                      <label htmlFor="flex-fb-select">Frame B Point (t₂):</label>
                      <select
                        id="flex-fb-select"
                        value={flexFrameB?.t ?? flexCapturedPoints[flexCapturedPoints.length - 1]?.t}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const pt = flexCapturedPoints.find((p) => Math.abs(p.t - val) < 0.1);
                          if (pt) setFlexFrameB({ t: pt.t, d: pt.d, d2: pt.d2 });
                        }}
                        className="firelab-select"
                      >
                        {flexCapturedPoints.map((p) => (
                          <option key={p.id} value={p.t}>
                            t = {p.t}s (D = {p.d.toFixed(2)}mm, D² = {p.d2.toFixed(2)}mm²) [{p.source}]
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Metric Summary Cards Honoring User's Captured Frames */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "18px" }}>
                  <div className="rate-stat-card">
                    <span className="rate-stat-label">Frame A (t₁ = {flexFrameA?.t ?? 10} s)</span>
                    <span className="rate-stat-val neon">{flexFrameA?.d.toFixed(2) ?? "—"} mm</span>
                    <span className="rate-stat-sub">D₁² = {flexFrameA?.d2.toFixed(2) ?? "—"} mm²</span>
                  </div>
                  <div className="rate-stat-card">
                    <span className="rate-stat-label">Frame B (t₂ = {flexFrameB?.t ?? 60} s)</span>
                    <span className="rate-stat-val neon">{flexFrameB?.d.toFixed(2) ?? "—"} mm</span>
                    <span className="rate-stat-sub">D₂² = {flexFrameB?.d2.toFixed(2) ?? "—"} mm²</span>
                  </div>
                </div>

                {/* SVG Graph Showing Analytical Curve + User's Captured Nodes */}
                <div className="flex-plot-box">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "var(--ash)", fontFamily: "var(--f-mono)", marginBottom: "8px" }}>
                    <span>{flexPlotMode === "d2" ? "D² (mm²) vs. Time (s)" : "D (mm) vs. Time (s)"}</span>
                    <span style={{ color: "var(--accent)" }}>
                      User K = {userMeasuredFlexK ? `${userMeasuredFlexK.toFixed(3)} mm²/s` : "—"}
                    </span>
                  </div>

                  <svg viewBox="0 0 620 250" style={{ width: "100%", height: "220px" }}>
                    {/* Axes */}
                    <line x1="55" y1="20" x2="55" y2="210" stroke="#334155" strokeWidth="1.5" />
                    <line x1="55" y1="210" x2="590" y2="210" stroke="#334155" strokeWidth="1.5" />

                    {/* Y-axis Ticks */}
                    <text x="48" y="25" fill="#94a3b8" fontSize="11" textAnchor="end" fontFamily="var(--f-mono)">
                      {flexPlotMode === "d2" ? (flexDiameter * flexDiameter).toFixed(0) : flexDiameter.toFixed(1)}
                    </text>
                    <text x="48" y="115" fill="#94a3b8" fontSize="11" textAnchor="end" fontFamily="var(--f-mono)">
                      {flexPlotMode === "d2" ? ((flexDiameter * flexDiameter) / 2).toFixed(1) : (flexDiameter / 2).toFixed(1)}
                    </text>
                    <text x="48" y="210" fill="#94a3b8" fontSize="11" textAnchor="end" fontFamily="var(--f-mono)">0</text>

                    {/* X-axis Ticks */}
                    <text x="55" y="230" fill="#94a3b8" fontSize="11" textAnchor="middle" fontFamily="var(--f-mono)">0s</text>
                    <text x="320" y="230" fill="#94a3b8" fontSize="11" textAnchor="middle" fontFamily="var(--f-mono)">45s</text>
                    <text x="590" y="230" fill="#94a3b8" fontSize="11" textAnchor="middle" fontFamily="var(--f-mono)">90s</text>

                    {/* Analytical Curve */}
                    {(() => {
                      const maxVal = flexPlotMode === "d2" ? flexDiameter * flexDiameter : flexDiameter;
                      const pathCoords: string[] = [];
                      for (let s = 0; s <= 90; s += 2) {
                        const dVal = calculateDropletDiameter(s, flexDiameter, flexOxygen, flexFuel);
                        const val = flexPlotMode === "d2" ? dVal * dVal : dVal;
                        const px = 55 + (s / 90) * 535;
                        const py = 210 - (val / maxVal) * 185;
                        pathCoords.push(`${s === 0 ? "M" : "L"} ${px} ${py}`);
                      }
                      return (
                        <path
                          d={pathCoords.join(" ")}
                          fill="none"
                          stroke="rgba(56, 189, 248, 0.45)"
                          strokeWidth="2.5"
                          strokeDasharray="4 2"
                        />
                      );
                    })()}

                    {/* User Secant Line between Frame A and Frame B */}
                    {flexFrameA && flexFrameB && (() => {
                      const maxVal = flexPlotMode === "d2" ? flexDiameter * flexDiameter : flexDiameter;
                      const valA = flexPlotMode === "d2" ? flexFrameA.d2 : flexFrameA.d;
                      const valB = flexPlotMode === "d2" ? flexFrameB.d2 : flexFrameB.d;
                      const pxA = 55 + (flexFrameA.t / 90) * 535;
                      const pyA = 210 - (valA / maxVal) * 185;
                      const pxB = 55 + (flexFrameB.t / 90) * 535;
                      const pyB = 210 - (valB / maxVal) * 185;
                      return (
                        <line
                          x1={pxA}
                          y1={pyA}
                          x2={pxB}
                          y2={pyB}
                          stroke="#eafe07"
                          strokeWidth="3"
                        />
                      );
                    })()}

                    {/* User's Captured Data Nodes */}
                    {flexCapturedPoints.map((pt) => {
                      const maxVal = flexPlotMode === "d2" ? flexDiameter * flexDiameter : flexDiameter;
                      const val = flexPlotMode === "d2" ? pt.d2 : pt.d;
                      const px = 55 + (pt.t / 90) * 535;
                      const py = 210 - (val / maxVal) * 185;
                      const isA = flexFrameA && Math.abs(flexFrameA.t - pt.t) < 0.1;
                      const isB = flexFrameB && Math.abs(flexFrameB.t - pt.t) < 0.1;

                      return (
                        <g key={pt.id}>
                          <circle
                            cx={px}
                            cy={py}
                            r={isA || isB ? 7 : 4.5}
                            fill={isA ? "#ffbd70" : isB ? "#f97c9c" : "#38bdf8"}
                            stroke="#ffffff"
                            strokeWidth="2"
                          />
                          {(isA || isB) && (
                            <text
                              x={px}
                              y={py - 12}
                              fill={isA ? "#ffbd70" : "#f97c9c"}
                              fontSize="11"
                              fontWeight="700"
                              textAnchor="middle"
                              fontFamily="var(--f-mono)"
                            >
                              {isA ? "Frame A" : "Frame B"} ({pt.t}s)
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Calculation & Export Bar */}
                <div className="graph-footer">
                  <span className="formula-display">
                    Your Secant Fit:{" "}
                    <code>
                      {(() => {
                        if (!flexFrameA || !flexFrameB || Math.abs(flexFrameB.t - flexFrameA.t) < 0.05) {
                          return "Requires selecting two distinct frames (Frame A & B)";
                        }
                        const p1 = flexFrameA.t < flexFrameB.t ? flexFrameA : flexFrameB;
                        const p2 = flexFrameA.t < flexFrameB.t ? flexFrameB : flexFrameA;
                        const kVal = Math.abs(p1.d2 - p2.d2) / (p2.t - p1.t);
                        return `K = (${p1.d2.toFixed(2)} − ${p2.d2.toFixed(2)}) / (${p2.t} − ${p1.t}) = ${kVal.toFixed(3)} mm²/s`;
                      })()}
                    </code>
                  </span>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      type="button"
                      className="firelab-btn ghost-btn small"
                      onClick={() => setShowRawTable(!showRawTable)}
                    >
                      {showRawTable ? "Hide Data Table" : "View Captured Data Table"}
                    </button>
                    <button
                      type="button"
                      className="firelab-btn primary-btn small"
                      onClick={handleExportFlexCsv}
                    >
                      📥 Export CSV
                    </button>
                  </div>
                </div>

                {/* Raw Captured Data Table */}
                {showRawTable && (
                  <div className="raw-data-table-wrap" style={{ marginTop: "16px" }}>
                    <table className="raw-data-table">
                      <thead>
                        <tr>
                          <th>Timestamp (s)</th>
                          <th>Diameter D (mm)</th>
                          <th>D² (mm²)</th>
                          <th>Data Provenance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {flexCapturedPoints.map((p) => (
                          <tr key={p.id} className={flexFrameA?.t === p.t || flexFrameB?.t === p.t ? "highlight-row" : ""}>
                            <td>{p.t.toFixed(1)}</td>
                            <td>{p.d.toFixed(3)}</td>
                            <td>{p.d2.toFixed(3)}</td>
                            <td>
                              <span className="sim-hud-pill highlight">{p.source}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Physical Context, Equations, & Comparison with NASA Published Data */}
              <div className="firelab-card">
                <h3 style={{ fontSize: "20px", color: "#ffffff", margin: "0 0 8px 0" }}>
                  What Does D² Tell Us?
                </h3>
                <p style={{ color: "var(--ash)", fontSize: "14px", lineHeight: 1.5, margin: "0 0 16px 0" }}>
                  For spherical microgravity droplet gasification, the square of the diameter decreases approximately linearly with time:
                </p>

                <div className="flex-help-box" style={{ fontSize: "20px", textAlign: "center", fontFamily: "var(--f-mono)" }}>
                  <strong>D²(t) ≈ D₀² − K · t</strong>
                </div>

                {/* User vs NASA Published Comparison */}
                <div style={{ background: "#060e1c", padding: "16px", borderRadius: "12px", border: "1px solid #1e3a5f", margin: "16px 0" }}>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#ffffff" }}>
                    Measurement Comparison with NASA Published Benchmark:
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "13px" }}>
                    <div>
                      <span style={{ color: "var(--ash)" }}>Your Extracted K:</span>
                      <strong style={{ display: "block", color: "var(--accent)", fontSize: "16px" }}>
                        {userMeasuredFlexK ? `${userMeasuredFlexK.toFixed(3)} mm²/s` : "—"}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: "var(--ash)" }}>NASA PSI-69 Value:</span>
                      <strong style={{ display: "block", color: "#38bdf8", fontSize: "16px" }}>
                        {nasaReferenceK.toFixed(3)} mm²/s
                      </strong>
                    </div>
                  </div>
                  {kDeviationPct !== null && (
                    <div style={{ marginTop: "10px", fontSize: "12px", color: kDeviationPct < 5 ? "#a7f3d0" : "#fde047" }}>
                      Deviation: {kDeviationPct.toFixed(1)}% ({kDeviationPct < 5 ? "Excellent agreement with published literature" : "Acceptable manual extraction variance"}).
                    </div>
                  )}
                </div>

                {explanationMode === "advanced" ? (
                  <div style={{ fontSize: "13px", color: "var(--ash)", lineHeight: 1.6 }}>
                    <strong style={{ color: "#ffffff" }}>Governing Transport Theory:</strong>
                    <p style={{ margin: "4px 0" }}>
                      From Spalding &amp; Godsave quasi-steady theory:
                      <code style={{ display: "block", background: "rgba(0,0,0,0.4)", padding: "6px 8px", borderRadius: "4px", margin: "6px 0", color: "#38bdf8" }}>
                        K = (8 · k_g / (ρ_l · C_p,g)) · ln(1 + B)
                      </code>
                      where B is the Spalding mass transfer number: <code>B = (Y_O2,∞ · ΔH_c / s + C_p,g · (T_∞ − T_s)) / L_v</code>.
                    </p>
                  </div>
                ) : (
                  <p style={{ fontSize: "13px", color: "var(--ink-2)", lineHeight: 1.5, margin: 0 }}>
                    <strong>Why it deviates in real tests:</strong> Fuel droplets experience transient liquid heating at ignition, radiative heat loss from soot particles, and cool flame secondary combustion regimes discovered in PSI-69!
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ================= STAGE 5: COMPARE AND INTERPRET (WITH ALL CHALLENGES) ================= */}
          {flexStep === 4 && (
            <div className="comparison-columns" style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: "24px" }}>
              <div className="firelab-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
                  <h3 style={{ fontSize: "20px", color: "#ffffff", margin: 0 }}>
                    Scientific Synthesis &amp; Challenges
                  </h3>
                  <div className="perspective-toggle-group">
                    <span className="toggle-label">Perspective:</span>
                    <button
                      type="button"
                      className={`persp-btn ${flexPerspective === "experimentalist" ? "active" : ""}`}
                      onClick={() => setFlexPerspective("experimentalist")}
                    >
                      Experimentalist View
                    </button>
                    <button
                      type="button"
                      className={`persp-btn ${flexPerspective === "modeller" ? "active" : ""}`}
                      onClick={() => setFlexPerspective("modeller")}
                    >
                      Modeller View
                    </button>
                  </div>
                </div>

                {/* Challenge 2: Find the Measurement */}
                <div className="mini-game-box" style={{ margin: "0 0 24px 0" }}>
                  <div className="mini-game-header">
                    <span className="game-badge">Challenge 2</span>
                    <h4>Find the Measurement: How Was Droplet Diameter Extracted?</h4>
                  </div>
                  <p className="game-prompt">
                    Review the Combustion Integrated Rack diagnostics. Which instrument provides the diameter series D(t)?
                  </p>
                  <div className="game-options-grid">
                    <button
                      type="button"
                      className={`game-option-btn ${quizFindMeasurementAnswer === "cam" ? "selected correct" : ""}`}
                      onClick={() => setQuizFindMeasurementAnswer("cam")}
                    >
                      <strong>High-Speed Color Camera</strong>
                      <span>Backlit shadowgraph edge tracking</span>
                    </button>
                    <button
                      type="button"
                      className={`game-option-btn ${quizFindMeasurementAnswer === "rad" ? "selected incorrect" : ""}`}
                      onClick={() => setQuizFindMeasurementAnswer("rad")}
                    >
                      <strong>Broadband Radiometer</strong>
                      <span>Radiative flux emission</span>
                    </button>
                    <button
                      type="button"
                      className={`game-option-btn ${quizFindMeasurementAnswer === "ign" ? "selected incorrect" : ""}`}
                      onClick={() => setQuizFindMeasurementAnswer("ign")}
                    >
                      <strong>Spark Electrode Circuit</strong>
                      <span>Capacitive ignition energy</span>
                    </button>
                  </div>
                  {quizFindMeasurementAnswer === "cam" && (
                    <div className="game-feedback positive">
                      ✓ <strong>Correct!</strong> High-speed optical shadowgraphy captures the backlit droplet silhouette, enabling sub-pixel edge detection calibrated against a precision millimeter target grid.
                    </div>
                  )}
                  {quizFindMeasurementAnswer && quizFindMeasurementAnswer !== "cam" && (
                    <div className="game-feedback negative">
                      ✕ <strong>Try again:</strong> Radiometers measure radiant power (W/cm²), not spatial dimensions. Droplet outline is measured by optical cameras.
                    </div>
                  )}
                </div>

                {/* Challenge 4: Did the Flame Really Go Out? (Historic Cool Flame Discovery) */}
                <div className="mini-game-box" style={{ margin: "0 0 24px 0" }}>
                  <div className="mini-game-header">
                    <span className="game-badge">Challenge 4 · Historic NASA Discovery</span>
                    <h4>Did the Flame Really Go Out?</h4>
                  </div>
                  <p className="game-prompt">
                    At t ≈ 36s, the glowing yellow soot flame suddenly extinguishes and goes completely dark on color video. Did chemical combustion stop?
                  </p>
                  <div className="game-options-vertical">
                    <button
                      type="button"
                      className={`confounder-btn ${quizCoolFlameAnswer === 1 ? "selected" : ""}`}
                      onClick={() => setQuizCoolFlameAnswer(1)}
                    >
                      A. Yes, once all visible luminosity ceases, the reaction has quenched completely.
                    </button>
                    <button
                      type="button"
                      className={`confounder-btn ${quizCoolFlameAnswer === 2 ? "selected correct" : ""}`}
                      onClick={() => setQuizCoolFlameAnswer(2)}
                    >
                      B. No! Radiative soot loss extinguished high-temperature visible burning, but low-temperature &quot;cool flame&quot; chemistry continued invisibly at 600–800 K!
                    </button>
                  </div>
                  {quizCoolFlameAnswer === 2 && (
                    <div className="game-feedback positive">
                      ✓ <strong>Groundbreaking Space Discovery!</strong> In FLEX on the ISS, scientists discovered that alkane droplets continue burning without any visible flame via low-temperature chemical kinetics (cool flames). This revised spacecraft fire safety protocols worldwide!
                    </div>
                  )}
                  {quizCoolFlameAnswer === 1 && (
                    <div className="game-feedback negative">
                      ✕ <strong>Look deeper:</strong> Radiometer and infrared sensors revealed that fuel evaporation continues at a steady secondary rate even in total visible darkness. Try Option B!
                    </div>
                  )}
                </div>

                {/* Challenge 5: Spot the Confounder / Problem */}
                <div className="mini-game-box" style={{ margin: 0 }}>
                  <div className="mini-game-header">
                    <span className="game-badge">Challenge 5</span>
                    <h4>Spot the Problem: Uncontrolled Variables</h4>
                  </div>
                  <p className="game-prompt">
                    A researcher compares Run FLEX-01 and Run FLEX-04 and concludes that low oxygen alone caused faster extinction. What confounding variable was also altered?
                  </p>
                  <div className="game-options-vertical">
                    <button
                      type="button"
                      className={`confounder-btn ${quizConfounderAnswer === 1 ? "selected correct" : ""}`}
                      onClick={() => setQuizConfounderAnswer(1)}
                    >
                      A. Chamber pressure was reduced from 1.0 atm to 0.7 atm, lowering gas density and oxidizer collision frequency.
                    </button>
                    <button
                      type="button"
                      className={`confounder-btn ${quizConfounderAnswer === 2 ? "selected" : ""}`}
                      onClick={() => setQuizConfounderAnswer(2)}
                    >
                      B. The fuel was changed from n-Heptane to pure hydrogen.
                    </button>
                  </div>
                  {quizConfounderAnswer === 1 && (
                    <div className="game-feedback positive">
                      ✓ <strong>Well identified!</strong> In experimental combustion, pressure and oxygen both govern the oxidizer mass fraction and collision kinetics. Isolating a single causal variable requires keeping all other boundary conditions identical.
                    </div>
                  )}
                </div>
              </div>

              {/* Dual Perspective Synthesis & Takeaways */}
              <div className="firelab-card">
                <h3 style={{ fontSize: "20px", color: "#ffffff", margin: "0 0 12px 0" }}>
                  {flexPerspective === "experimentalist" ? "Astronaut / Experimentalist View" : "CFD / Combustion Modeller View"}
                </h3>

                {flexPerspective === "experimentalist" ? (
                  <div style={{ fontSize: "14px", color: "var(--ash)", lineHeight: 1.6 }}>
                    <p style={{ margin: "0 0 12px 0" }}>
                      From the flight operations perspective aboard the ISS, microgravity eliminates buoyant convective drafts that usually disperse combustion products on Earth. Fire does not spread upward; it grows as a quiescent diffusion envelope.
                    </p>
                    <p style={{ margin: "0 0 12px 0" }}>
                      The discovery of <strong>cool flame combustion</strong> showed astronauts that extinguishing a visible flame does not guarantee safety: invisible, low-temperature re-ignition hazards can persist as long as vaporized fuel and oxidizer remain.
                    </p>
                  </div>
                ) : (
                  <div style={{ fontSize: "14px", color: "var(--ash)", lineHeight: 1.6 }}>
                    <p style={{ margin: "0 0 12px 0" }}>
                      For numerical combustion modellers, 1-g Earth experiments suffer from complex 3D buoyant vortex shedding that obscures fundamental chemical kinetics. Microgravity provides an idealized 1D spherically symmetric boundary condition:
                    </p>
                    <p style={{ margin: "0 0 12px 0" }}>
                      FLEX data serves as the benchmark validation set for multi-step chemical kinetic mechanisms (e.g. detailed n-heptane oxidation mechanisms with &gt; 100 species and 500 reactions).
                    </p>
                  </div>
                )}

                <div className="flex-help-box" style={{ marginTop: "20px" }}>
                  <strong>Key Research Takeaway:</strong><br />
                  1. <strong>Observe:</strong> High-speed optical shadowgraphy captures boundary layer dynamics.<br />
                  2. <strong>Measure:</strong> Calibrated pixel scales convert raw video into physical rates (K).<br />
                  3. <strong>Interpret:</strong> Controlled experiments isolate causal mechanisms from confounders.
                </div>

                <div style={{ marginTop: "24px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="firelab-btn primary-btn"
                    onClick={() => handleSwitchInvestigation("bass")}
                  >
                    Explore BASS-II Solid Spread Lab →
                  </button>
                  <button
                    type="button"
                    className="firelab-btn secondary-btn"
                    onClick={() => {
                      resetFlexSimulation();
                      setFlexStep(0);
                    }}
                  >
                    ↺ Restart FLEX Lab
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Stepper Bottom Navigation */}
          <div className="step-actions">
            <button
              type="button"
              className="firelab-btn secondary-btn"
              disabled={flexStep === 0}
              onClick={() => {
                setFlexPlaying(false);
                setFlexStep((prev) => Math.max(0, prev - 1));
              }}
            >
              ← Previous Stage
            </button>
            <button
              type="button"
              className="firelab-btn primary-btn"
              onClick={() => {
                setFlexPlaying(false);
                setFlexStep((prev) => (prev === 4 ? 0 : prev + 1));
              }}
            >
              {flexStep === 4 ? "Restart FLEX Lab ↺" : "Next Stage →"}
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          INVESTIGATION 2: BASS-II (PSI-25) Solid Fuel Flame Spread Lab
          ===================================================================== */}
      {activeInvestigation === "bass" && (
        <div className="bass-investigation-wrap">
          {/* Sub-header & Stepper */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
            <div>
              <span className="firelab-badge nasa-badge">NASA BASS-II (PSI-25)</span>
              <h2 style={{ fontSize: "28px", margin: "6px 0 2px 0", color: "#ffffff" }}>
                Solid Fuel Flame Spread &amp; MSG Duct Flow
              </h2>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--ash)" }}>
                Interactive microgravity flame spread simulation and authentic ISS Microgravity Science Glovebox footage.
              </p>
            </div>
            <a
              className="firelab-btn ghost-btn"
              href="https://psi.nasa.gov/physci/repo/data/investigations/PSI-25"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none" }}
            >
              NASA PSI-25 Archive ↗
            </a>
          </div>

          <nav className="firelab-stepper" aria-label="BASS Learning Steps" style={{ marginBottom: "28px" }}>
            <button
              type="button"
              className={`step-btn ${bassStep === 1 ? "active" : ""} ${bassStep > 1 ? "completed" : ""}`}
              onClick={() => setBassStep(1)}
              id="step-tab-1"
            >
              <span className="step-num">1</span>
              <span className="step-label">Configure Parameters</span>
            </button>
            <div className="step-connector" />
            <button
              type="button"
              className={`step-btn ${bassStep === 2 ? "active" : ""} ${bassStep > 2 ? "completed" : ""}`}
              onClick={() => setBassStep(2)}
              id="step-tab-2"
            >
              <span className="step-num">2</span>
              <span className="step-label">Observe Flame Front</span>
            </button>
            <div className="step-connector" />
            <button
              type="button"
              className={`step-btn ${bassStep === 3 ? "active" : ""} ${bassStep > 3 ? "completed" : ""}`}
              onClick={() => setBassStep(3)}
              id="step-tab-3"
            >
              <span className="step-num">3</span>
              <span className="step-label">Measure &amp; Process Data</span>
            </button>
            <div className="step-connector" />
            <button
              type="button"
              className={`step-btn ${bassStep === 4 ? "active" : ""} ${bassStep > 4 ? "completed" : ""}`}
              onClick={() => setBassStep(4)}
              id="step-tab-4"
            >
              <span className="step-num">4</span>
              <span className="step-label">Compare &amp; Interpret</span>
            </button>
          </nav>

          {/* Main Grid: Workspace & HUD */}
          <div className="firelab-grid">
            <div className="firelab-workspace">
              {/* STEP 1: CONFIGURE */}
              {bassStep === 1 && (
                <section className="firelab-card" aria-labelledby="config-title">
                  <div className="card-header">
                    <div>
                      <h3 id="config-title" className="card-title">Design Your Experiment</h3>
                      <p className="card-desc">
                        Choose boundary conditions for a microgravity solid flame spread run. Each combination is evaluated against verified NASA BASS-II flight tests aboard the ISS.
                      </p>
                    </div>
                    <div className="preset-selector">
                      <label htmlFor="documented-run-select">Documented Run:</label>
                      <select
                        id="documented-run-select"
                        className="firelab-select"
                        value={selectedRun.runId}
                        onChange={(e) => handleSelectPredefinedRun(e.target.value)}
                      >
                        {DOCUMENTED_BASS_RUNS.map((r) => (
                          <option key={r.runId} value={r.runId}>
                            Test {r.testNumber}: {r.thicknessMicrons} µm PMMA, {r.airflowCmS} cm/s, {r.oxygenPct}% O₂
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="controls-grid">
                    <div className="control-item">
                      <div className="control-label-row">
                        <label htmlFor="fuel-thickness-slider">Fuel Thickness (PMMA)</label>
                        <span className="control-val">{selectedThickness} µm ({selectedThickness <= 100 ? "Thin Film" : selectedThickness <= 200 ? "Medium Film" : "Thick Slab"})</span>
                      </div>
                      <input
                        id="fuel-thickness-slider"
                        type="range"
                        min="100"
                        max="400"
                        step="100"
                        value={selectedThickness}
                        onChange={(e) => {
                          setSelectedThickness(Number(e.target.value));
                          resetSim();
                        }}
                        className="firelab-range"
                      />
                      <div className="range-ticks">
                        <span>100 µm</span>
                        <span>200 µm</span>
                        <span>300 µm</span>
                        <span>400 µm</span>
                      </div>
                      <small className="control-hint">
                        Thicker fuel acts as a conductive heat sink, increasing thermal inertia and reducing spread rate.
                      </small>
                    </div>

                    <div className="control-item">
                      <div className="control-label-row">
                        <label htmlFor="oxygen-slider">Oxygen Concentration (O₂)</label>
                        <span className="control-val">{selectedOxygen.toFixed(1)}%</span>
                      </div>
                      <input
                        id="oxygen-slider"
                        type="range"
                        min="15.0"
                        max="22.2"
                        step="0.1"
                        value={selectedOxygen}
                        onChange={(e) => {
                          setSelectedOxygen(Number(e.target.value));
                          resetSim();
                        }}
                        className="firelab-range"
                      />
                      <div className="range-ticks">
                        <span>15% (Hypoxic)</span>
                        <span>17.3% (Limit)</span>
                        <span>21% (Earth Air)</span>
                        <span>22.2% (ISS Max)</span>
                      </div>
                      <small className="control-hint">
                        Higher oxygen increases flame temperature and accelerates chemical reaction kinetics.
                      </small>
                    </div>

                    <div className="control-item">
                      <div className="control-label-row">
                        <label htmlFor="airflow-slider">Duct Airflow Velocity</label>
                        <span className="control-val">{selectedAirflow.toFixed(1)} cm/s</span>
                      </div>
                      <input
                        id="airflow-slider"
                        type="range"
                        min="0.35"
                        max="10.0"
                        step="0.05"
                        value={selectedAirflow}
                        onChange={(e) => {
                          setSelectedAirflow(Number(e.target.value));
                          resetSim();
                        }}
                        className="firelab-range"
                      />
                      <div className="range-ticks">
                        <span>0.35 cm/s (Quench)</span>
                        <span>2.0 cm/s</span>
                        <span>5.0 cm/s</span>
                        <span>10.0 cm/s (Blowoff)</span>
                      </div>
                      <small className="control-hint">
                        In microgravity without buoyancy, forced airflow supplies oxygen to the reaction zone.
                      </small>
                    </div>
                  </div>

                  <div className="match-status-card" style={{ marginTop: "24px" }}>
                    {matchResult.isExact ? (
                      <div className="status-exact-match">
                        <div className="status-badge exact-badge">✓ Exact Documented Run Matched</div>
                        <h4 className="match-run-title">
                          NASA Flight Test {matchResult.exactMatch?.testNumber} (Sample #{matchResult.exactMatch?.sampleNumber})
                        </h4>
                        <p className="match-notes">{matchResult.exactMatch?.notes}</p>
                        <div className="run-metric-chips">
                          <span className="metric-chip">Measured Spread: <strong>{matchResult.exactMatch?.measuredSpreadRateMmS} mm/s</strong></span>
                          <span className="metric-chip">Flow: <strong>{matchResult.exactMatch?.flowDirection}</strong></span>
                          <span className="metric-chip">ISS GMT: <strong>Day {matchResult.exactMatch?.gmt}</strong></span>
                        </div>
                      </div>
                    ) : (
                      <div className="status-nearest-match">
                        <div className="status-badge fallback-badge">Closest Documented Flight Run: Test {matchResult.nearestRun.testNumber}</div>
                        <h4 className="match-run-title">Condition Differences from Archive:</h4>
                        <ul className="differences-list">
                          {matchResult.differences.map((diff, i) => (
                            <li key={i}>{diff}</li>
                          ))}
                        </ul>
                        <p className="fallback-explanation">
                          NASA did not execute this exact parameter combination in orbit. The lab maps to the closest verified flight baseline (Test {matchResult.nearestRun.testNumber}) to ensure scientific fidelity without synthetic extrapolation.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="step-actions">
                    <button
                      type="button"
                      className="firelab-btn primary-btn"
                      onClick={() => setBassStep(2)}
                      id="proceed-to-observe-btn"
                    >
                      Proceed to Flight Observation →
                    </button>
                  </div>
                </section>
              )}

              {/* STEP 2: OBSERVE */}
              {bassStep === 2 && (
                <section className="firelab-card" aria-labelledby="observe-title">
                  <div className="card-header">
                    <div>
                      <h3 id="observe-title" className="card-title">Watch the Flame Propagate</h3>
                      <p className="card-desc">
                        Experience flame spread across the PMMA fuel sample. Toggle between the live interactive simulation driven by your configured boundary conditions and authentic NASA astronaut video.
                      </p>
                    </div>
                    <div className="provenance-tag">
                      <span className="source-dot" /> NASA BASS-II Microgravity Lab
                    </div>
                  </div>

                  {/* Mode Selector Toggle: Interactive Simulation vs NASA Flight Video */}
                  <div className="sim-toggle-bar">
                    <button
                      type="button"
                      className={`sim-toggle-btn ${bassViewMode === "sim" ? "active" : ""}`}
                      onClick={() => setBassViewMode("sim")}
                    >
                      🔬 Interactive Flame Spread Simulator (Configured)
                    </button>
                    <button
                      type="button"
                      className={`sim-toggle-btn ${bassViewMode === "video" ? "active" : ""}`}
                      onClick={() => setBassViewMode("video")}
                    >
                      📹 Authentic NASA ISS Flight Video (Sample #147)
                    </button>
                  </div>

                  {/* INTERACTIVE SIMULATION VIEW */}
                  {bassViewMode === "sim" && (
                    <div className="interactive-sim-box">
                      <div className="sim-hud-overlay">
                        <span className="sim-hud-pill">
                          PMMA {selectedThickness} µm · {selectedOxygen.toFixed(1)}% O₂ · {selectedAirflow.toFixed(1)} cm/s
                        </span>
                        <span className="sim-hud-pill highlight">
                          Front x = {simFlameX.toFixed(1)} mm ({simSpreadRate} mm/s)
                        </span>
                        <span className={`sim-hud-pill ${isQuenched && simTime > 12 ? "danger" : ""}`}>
                          {simTime < 4.0 ? "Ignition Spark" : isQuenched && simTime > 12 ? "Radiative Quench" : "Steady Spread"}
                        </span>
                      </div>

                      {/* Interactive Canvas/SVG Flight Simulator */}
                      <svg viewBox="0 0 700 280" className="interactive-sim-svg" role="img" aria-label="Interactive microgravity flame spread simulation">
                        <defs>
                          <radialGradient id="simFlameGlow" cx="0.3" cy="0.5" r="0.6">
                            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                            <stop offset="25%" stopColor="#60a5fa" stopOpacity="0.85" />
                            <stop offset="55%" stopColor="#f97316" stopOpacity="0.75" />
                            <stop offset="85%" stopColor="#ea580c" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
                          </radialGradient>
                          <linearGradient id="streamGrad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.05" />
                            <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.05" />
                          </linearGradient>
                        </defs>

                        {/* Duct Interior Background */}
                        <rect x="0" y="0" width="700" height="280" fill="#040914" />
                        <rect x="40" y="40" width="620" height="12" fill="#1e293b" stroke="#334155" strokeWidth="1" />
                        <rect x="40" y="210" width="620" height="12" fill="#1e293b" stroke="#334155" strokeWidth="1" />

                        {/* Duct Airflow Streamlines */}
                        {[70, 95, 175, 195].map((yLine) => (
                          <g key={yLine}>
                            <line x1={40} y1={yLine} x2={660} y2={yLine} stroke="url(#streamGrad)" strokeWidth="2" strokeDasharray="16 12" />
                            <polygon points={`650,${yLine - 3} 660,${yLine} 650,${yLine + 3}`} fill="#38bdf8" opacity="0.4" />
                          </g>
                        ))}

                        {/* Millimeter Scale Ticks along Duct Rail (0 to 100 mm) */}
                        {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((mm) => {
                          const xPos = 80 + (mm / 100) * 540;
                          return (
                            <g key={mm}>
                              <line x1={xPos} y1="36" x2={xPos} y2="40" stroke="#94a3b8" strokeWidth="1" />
                              <line x1={xPos} y1="222" x2={xPos} y2="226" stroke="#94a3b8" strokeWidth="1" />
                              <text x={xPos} y="32" fill="#64748b" fontSize="9" textAnchor="middle" fontFamily="var(--f-mono)">
                                {mm}
                              </text>
                            </g>
                          );
                        })}

                        {/* Solid PMMA Fuel Sample Strip */}
                        {(() => {
                          const startX = 80;
                          const sampleLen = 540;
                          const flameScreenX = startX + (simFlameX / 100) * sampleLen;

                          return (
                            <>
                              {flameScreenX > startX && (
                                <rect x={startX} y={115} width={flameScreenX - startX} height={36} fill="#090d16" stroke="#1e293b" strokeWidth="1" />
                              )}
                              <rect x={flameScreenX} y={115} width={startX + sampleLen - flameScreenX} height={36} fill="rgba(186, 230, 253, 0.22)" stroke="#0284c7" strokeWidth="1" />
                              <line x1={flameScreenX} y1={120} x2={startX + sampleLen} y2={120} stroke="rgba(255, 255, 255, 0.4)" strokeWidth="1" />

                              {simTime < 4.0 && (
                                <g>
                                  <circle cx={startX} cy={133} r={12 + (simTime % 1) * 6} fill="#fbbf24" opacity="0.6" />
                                  <circle cx={startX} cy={133} r={6} fill="#ffffff" />
                                </g>
                              )}

                              {simTime >= 4.0 && !isQuenched && (
                                <g>
                                  <ellipse cx={flameScreenX + 18} cy={133} rx={28 + (selectedAirflow / 5) * 8} ry={26} fill="url(#simFlameGlow)" />
                                  <ellipse cx={flameScreenX} cy={133} rx={9} ry={20} fill="#2563eb" opacity="0.85" />
                                  <circle cx={flameScreenX} cy={133} r={4.5} fill="#ffffff" />
                                  <line x1={flameScreenX} y1={46} x2={flameScreenX} y2={216} stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="4 2" />
                                </g>
                              )}

                              {caliperA && (
                                <g>
                                  <line x1={startX + (caliperA.x / 100) * sampleLen} y1={50} x2={startX + (caliperA.x / 100) * sampleLen} y2={212} stroke="#ffbd70" strokeWidth="2" />
                                  <circle cx={startX + (caliperA.x / 100) * sampleLen} cy={60} r="5" fill="#ffbd70" />
                                  <text x={startX + (caliperA.x / 100) * sampleLen} y={78} fill="#ffbd70" fontSize="10" textAnchor="middle" fontFamily="var(--f-mono)">
                                    A ({caliperA.t}s, {caliperA.x}mm)
                                  </text>
                                </g>
                              )}

                              {caliperB && (
                                <g>
                                  <line x1={startX + (caliperB.x / 100) * sampleLen} y1={50} x2={startX + (caliperB.x / 100) * sampleLen} y2={212} stroke="#f97c9c" strokeWidth="2" />
                                  <circle cx={startX + (caliperB.x / 100) * sampleLen} cy={195} r="5" fill="#f97c9c" />
                                  <text x={startX + (caliperB.x / 100) * sampleLen} y={190} fill="#f97c9c" fontSize="10" textAnchor="middle" fontFamily="var(--f-mono)">
                                    B ({caliperB.t}s, {caliperB.x}mm)
                                  </text>
                                </g>
                              )}
                            </>
                          );
                        })()}
                      </svg>

                      {/* Interactive Controls Bar */}
                      <div className="sim-controls-bar">
                        <button type="button" className="firelab-btn primary-btn" onClick={toggleSimPlay} id="sim-play-toggle">
                          {simPlaying ? "⏸ Pause" : "▶ Ignite & Spread"}
                        </button>
                        <button type="button" className="firelab-btn secondary-btn" onClick={() => resetSim(true)}>
                          ↺ Reset Sample
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="38"
                          step="0.1"
                          value={simTime}
                          onChange={(e) => {
                            setSimPlaying(false);
                            setSimTime(Number(e.target.value));
                          }}
                          className="video-scrubber"
                          aria-label="Simulation timeline scrubber"
                        />
                        <span style={{ fontFamily: "var(--f-mono)", fontSize: "13px", color: "var(--accent)" }}>
                          t = {simTime.toFixed(1)}s / 38.0s
                        </span>
                      </div>

                      {/* Interactive Caliper Mark Box */}
                      <div className="caliper-mark-box">
                        <div>
                          <strong style={{ color: "#ffffff" }}>Interactive Fiducial Calipers:</strong>
                          <span style={{ color: "var(--ash)", marginLeft: "8px" }}>
                            Current Flame Front: <strong>{simFlameX.toFixed(1)} mm</strong> at <strong>{simTime.toFixed(1)} s</strong>
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className="firelab-btn secondary-btn"
                            onClick={() => markCaliper("A")}
                            style={{ borderColor: "#ffbd70", color: "#ffbd70" }}
                          >
                            Mark Caliper A ({simTime.toFixed(1)}s)
                          </button>
                          <button
                            type="button"
                            className="firelab-btn secondary-btn"
                            onClick={() => markCaliper("B")}
                            style={{ borderColor: "#f97c9c", color: "#f97c9c" }}
                          >
                            Mark Caliper B ({simTime.toFixed(1)}s)
                          </button>
                          <button
                            type="button"
                            className="firelab-btn secondary-btn"
                            onClick={() => captureBassPoint()}
                            style={{ borderColor: "#38bdf8", color: "#38bdf8" }}
                          >
                            + Capture Point ({simTime.toFixed(1)}s)
                          </button>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", fontSize: "12px", color: "var(--ash)", fontFamily: "var(--f-mono)", marginTop: "10px" }}>
                          <span>Caliper A: {caliperA ? `${caliperA.t}s (${caliperA.x} mm)` : "Not marked"}</span>
                          <span>Caliper B: {caliperB ? `${caliperB.t}s (${caliperB.x} mm)` : "Not marked"}</span>
                          <span>Custom Nodes: {bassCapturedPoints.length}</span>
                        </div>
                      </div>

                      {calculatedCaliperRate !== null && (
                        <div className="flex-help-box" style={{ margin: "14px 16px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                            <span>
                              ✓ <strong>Measured Secant Spread Rate:</strong> (x_B − x_A) / (t_B − t_A) = ({caliperB?.x} − {caliperA?.x}) mm / ({caliperB?.t} − {caliperA?.t}) s = <strong>{calculatedCaliperRate.toFixed(2)} mm/s</strong>.
                            </span>
                            <button
                              type="button"
                              className="firelab-btn primary-btn small"
                              onClick={() => setBassStep(3)}
                              style={{ fontSize: "12px", padding: "4px 10px" }}
                            >
                              Plot on Regression Curve (Step 3) →
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* AUTHENTIC NASA FLIGHT VIDEO VIEW */}
                  {bassViewMode === "video" && (
                    <div className="video-player-box">
                      <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className={`firelab-btn small ${bassVideoSrc.includes("video_1") ? "primary-btn" : "ghost-btn"}`}
                          onClick={() => {
                            setBassIsPlaying(false);
                            setBassVideoSrc("/firelab/bass2_video_1.mp4");
                          }}
                        >
                          📹 Flight Video 1: Sample 147 (Test B1)
                        </button>
                        <button
                          type="button"
                          className={`firelab-btn small ${bassVideoSrc.includes("video_2") ? "primary-btn" : "ghost-btn"}`}
                          onClick={() => {
                            setBassIsPlaying(false);
                            setBassVideoSrc("/firelab/bass2_video_2.mp4");
                          }}
                        >
                          📹 Flight Video 2: Sample 147 (Test B2)
                        </button>
                      </div>

                      <div className="video-overlay-header">
                        <span className="video-pill live-pill">● ISS EXPEDITION 39</span>
                        <span className="video-pill meta-pill">
                          {bassVideoSrc.includes("video_2") ? "SAMPLE 147 · TEST B2" : "SAMPLE 147 · TEST B1"}
                        </span>
                        <span className="video-pill time-pill">{videoCurrentTime.toFixed(1)}s / {videoDuration.toFixed(1)}s</span>
                      </div>

                      <video
                        key={bassVideoSrc}
                        ref={videoRef}
                        src={bassVideoSrc}
                        className="firelab-video"
                        onTimeUpdate={handleVideoTimeUpdate}
                        onLoadedMetadata={handleVideoLoadedMetadata}
                        playsInline
                      />

                      <div className="video-scale-overlay">
                        <div className="scale-rule">
                          <span className="scale-bar" />
                          <span>10 mm</span>
                        </div>
                      </div>

                      <div className="video-controls-bar">
                        <button type="button" onClick={toggleBassVideoPlay} className="video-play-btn" id="video-play-toggle">
                          {bassIsPlaying ? "⏸ Pause" : "▶ Play Video"}
                        </button>
                        <input
                          type="range"
                          min="0"
                          max={videoDuration || 38.3}
                          step="0.1"
                          value={videoCurrentTime}
                          onChange={(e) => seekVideoTo(Number(e.target.value))}
                          className="video-scrubber"
                          aria-label="Video scrubber"
                        />
                        <div className="milestone-chips">
                          <button type="button" className="chip-btn" onClick={() => seekVideoTo(7.0)}>t = 7s (Ignition)</button>
                          <button type="button" className="chip-btn" onClick={() => seekVideoTo(15.0)}>t = 15s (Anchor)</button>
                          <button type="button" className="chip-btn" onClick={() => seekVideoTo(30.0)}>t = 30s (Steady)</button>
                          <button type="button" className="chip-btn" onClick={() => seekVideoTo(34.0)}>t = 34s (Quench)</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Hardware Explorer */}
                  <div className="hardware-explorer">
                    <div className="hardware-header">
                      <h4 className="hardware-title">Glovebox Apparatus &amp; Diagnostics</h4>
                      <p className="hardware-desc">
                        Select an instrument below to inspect how physical combustion variables were captured aboard the ISS.
                      </p>
                    </div>

                    <div className="hotspot-tabs" role="tablist">
                      {APPARATUS_HOTSPOTS.map((h) => (
                        <button
                          key={h.id}
                          type="button"
                          role="tab"
                          aria-selected={activeHotspotId === h.id}
                          className={`hotspot-tab-btn ${activeHotspotId === h.id ? "active" : ""}`}
                          onClick={() => setActiveHotspotId(h.id)}
                        >
                          {h.icon} {h.name}
                        </button>
                      ))}
                    </div>

                    <div className="hotspot-detail-card">
                      <div className="hotspot-badge-row">
                        <span className="hotspot-instrument-tag">{activeHotspot.instrument}</span>
                        <span className="hotspot-uncertainty-tag">{activeHotspot.icon} Diagnostic Sensor</span>
                      </div>
                      <p className="hotspot-desc">{activeHotspot.description}</p>
                      <div className="hotspot-specs-grid">
                        <div>
                          <strong>Measurement Principle:</strong>
                          <p>{activeHotspot.howMeasured}</p>
                        </div>
                        <div>
                          <strong>Calibration Standard:</strong>
                          <p>{activeHotspot.calibrationNotes}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="step-actions">
                    <button type="button" className="firelab-btn secondary-btn" onClick={() => setBassStep(1)}>
                      ← Back to Parameters
                    </button>
                    <button type="button" className="firelab-btn primary-btn" onClick={() => setBassStep(3)}>
                      Proceed to Data Processing →
                    </button>
                  </div>
                </section>
              )}

              {/* STEP 3: PROCESS (HONORS USER CALIPER CAPTURES) */}
              {bassStep === 3 && (
                <section className="firelab-card" aria-labelledby="process-title">
                  <div className="card-header">
                    <div>
                      <h3 id="process-title" className="card-title">Measure and Process Data</h3>
                      <p className="card-desc">
                        Honoring your live experiment captures: Select observation times (t₁, t₂) from the flame-front position data x(t), compute the secant spread rate Δx/Δt, and evaluate linear regression slope.
                      </p>
                    </div>
                    <span className="evidence-badge-tag">NASA PSI-25 Derived Evidence</span>
                  </div>

                  {/* ACTIVE DATASET TOGGLE & ACTIONS */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "13px", color: "var(--ash)" }}>Active Source:</span>
                      <button
                        type="button"
                        className={`firelab-btn small ${bassDataSource === "active" ? "primary-btn" : "ghost-btn"}`}
                        onClick={() => setBassDataSource("active")}
                      >
                        🎯 Your Live Captures &amp; Model ({selectedOxygen}%, {selectedAirflow} cm/s)
                      </button>
                      <button
                        type="button"
                        className={`firelab-btn small ${bassDataSource === "synthetic" ? "primary-btn" : "ghost-btn"}`}
                        onClick={() => setBassDataSource("synthetic")}
                      >
                        📋 NASA PSI-25 Synthetic Baseline (2.0 mm/s)
                      </button>
                    </div>
                    {(caliperA || caliperB || bassCapturedPoints.length > 0) && (
                      <button
                        type="button"
                        className="firelab-btn ghost-btn small"
                        onClick={() => {
                          setCaliperA(null);
                          setCaliperB(null);
                          setBassCapturedPoints([]);
                        }}
                        style={{ fontSize: "12px", color: "var(--ash)" }}
                      >
                        ⟳ Clear Custom Captures
                      </button>
                    )}
                  </div>

                  {/* USER CAPTURE HONORED BANNER */}
                  {bassDataSource === "active" && (caliperA || caliperB) && (
                    <div className="flex-help-box" style={{ background: "rgba(59, 202, 178, 0.15)", borderColor: "#3bcab2", color: "#a7f4e8", marginBottom: "20px" }}>
                      🎯 <strong>Your Live Captures Honored:</strong> Point A ({spreadResult.t1}s, {spreadResult.x1}mm) → Point B ({spreadResult.t2}s, {spreadResult.x2}mm) yielded an empirical spread rate of <strong>{spreadResult.averageRateMmS.toFixed(2)} mm/s</strong>. Regression slope across your dataset: <strong>{regressionResult.slope.toFixed(2)} mm/s</strong> (R² = {regressionResult.rSquared.toFixed(2)}).
                    </div>
                  )}

                  {/* INLINE CALIPER SCRUBBER WORKBENCH */}
                  <div style={{ background: "#060e1c", padding: "14px 18px", borderRadius: "10px", border: "1px solid #1e3a5f", marginBottom: "18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontSize: "13px", color: "#ffffff", fontWeight: 600 }}>Scrub Timeline &amp; Adjust Calipers:</span>
                      <span style={{ fontSize: "13px", color: "var(--accent)", fontFamily: "var(--f-mono)" }}>
                        t = {simTime.toFixed(1)}s (Flame x = {simFlameX.toFixed(1)} mm)
                      </span>
                    </div>
                    <input
                      aria-label="Timeline scrubber for BASS caliper adjustment"
                      type="range"
                      min="0"
                      max="38"
                      step="0.5"
                      value={simTime}
                      onChange={(e) => setSimTime(Number(e.target.value))}
                      className="firelab-range"
                      style={{ marginBottom: "10px" }}
                    />
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="firelab-btn secondary-btn"
                        onClick={() => markCaliper("A", simTime)}
                        style={{ flex: 1, borderColor: "#ffbd70", color: "#ffbd70" }}
                      >
                        Set Caliper A ({simTime.toFixed(1)}s)
                      </button>
                      <button
                        type="button"
                        className="firelab-btn secondary-btn"
                        onClick={() => markCaliper("B", simTime)}
                        style={{ flex: 1, borderColor: "#f97c9c", color: "#f97c9c" }}
                      >
                        Set Caliper B ({simTime.toFixed(1)}s)
                      </button>
                      <button
                        type="button"
                        className="firelab-btn secondary-btn"
                        onClick={() => captureBassPoint(simTime)}
                        style={{ borderColor: "#38bdf8", color: "#38bdf8" }}
                      >
                        + Add Capture Point
                      </button>
                    </div>
                  </div>

                  <div className="calculation-controls-bar">
                    <div className="point-select-group">
                      <label htmlFor="t1-select">Initial Time t₁:</label>
                      <select
                        id="t1-select"
                        value={effectiveT1}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setT1(val);
                          const pt = activeBassDataset.find((p) => Math.abs(p.t - val) < 0.05);
                          if (pt) setCaliperA({ t: pt.t, x: pt.x });
                        }}
                        className="firelab-select"
                      >
                        {activeBassDataset.filter((p) => p.t < effectiveT2).map((p) => (
                          <option key={p.t} value={p.t}>
                            t = {p.t} s (x = {p.x} mm) {p.source ? `— [${p.source}]` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="point-select-group">
                      <label htmlFor="t2-select">Final Time t₂:</label>
                      <select
                        id="t2-select"
                        value={effectiveT2}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setT2(val);
                          const pt = activeBassDataset.find((p) => Math.abs(p.t - val) < 0.05);
                          if (pt) setCaliperB({ t: pt.t, x: pt.x });
                        }}
                        className="firelab-select"
                      >
                        {activeBassDataset.filter((p) => p.t > effectiveT1).map((p) => (
                          <option key={p.t} value={p.t}>
                            t = {p.t} s (x = {p.x} mm) {p.source ? `— [${p.source}]` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      className={`toggle-fit-btn ${showRegression ? "active" : ""}`}
                      onClick={() => setShowRegression(!showRegression)}
                    >
                      {showRegression ? "Hide Linear Regression" : "Show Linear Regression"}
                    </button>
                  </div>

                  <div className="rate-summary-grid">
                    <div className="rate-stat-card">
                      <span className="rate-stat-label">Δx (Displacement)</span>
                      <span className="rate-stat-val">{spreadResult.deltaX} mm</span>
                      <span className="rate-stat-sub">x₂ ({spreadResult.x2} mm) − x₁ ({spreadResult.x1} mm)</span>
                    </div>
                    <div className="rate-stat-card">
                      <span className="rate-stat-label">Δt (Time Interval)</span>
                      <span className="rate-stat-val">{spreadResult.deltaT} s</span>
                      <span className="rate-stat-sub">t₂ ({spreadResult.t2} s) − t₁ ({spreadResult.t1} s)</span>
                    </div>
                    <div className="rate-stat-card highlight">
                      <span className="rate-stat-label">Secant Spread Rate</span>
                      <span className="rate-stat-val neon">{spreadResult.averageRateMmS.toFixed(2)} mm/s</span>
                      <span className="rate-stat-sub">Δx / Δt slope</span>
                    </div>
                    <div className="rate-stat-card">
                      <span className="rate-stat-label">Regression Slope</span>
                      <span className="rate-stat-val">{regressionResult.slope.toFixed(2)} mm/s</span>
                      <span className="rate-stat-sub">R² = {regressionResult.rSquared.toFixed(2)} (Linearity)</span>
                    </div>
                  </div>

                  {/* SVG Chart with Dynamic Scales */}
                  {(() => {
                    const maxT = Math.max(20, ...activeBassDataset.map((p) => p.t));
                    const rawMaxX = Math.max(...activeBassDataset.map((p) => p.x), spreadResult.x2, 20);
                    const maxX = Math.max(20, Math.ceil((rawMaxX + 5) / 10) * 10);

                    const yTicks = [0, Math.round(maxX * 0.25), Math.round(maxX * 0.5), Math.round(maxX * 0.75), maxX];
                    const xTicks = [0, Math.round(maxT * 0.25), Math.round(maxT * 0.5), Math.round(maxT * 0.75), maxT];

                    const px1 = 60 + (spreadResult.t1 / maxT) * 560;
                    const py1 = 270 - (spreadResult.x1 / maxX) * 240;
                    const px2 = 60 + (spreadResult.t2 / maxT) * 560;
                    const py2 = 270 - (spreadResult.x2 / maxX) * 240;

                    const regX1 = 0;
                    const regY1 = regressionResult.intercept;
                    const regX2 = maxT;
                    const regY2 = regressionResult.slope * maxT + regressionResult.intercept;

                    const regPx1 = 60;
                    const regPy1 = 270 - (Math.max(0, regY1) / maxX) * 240;
                    const regPx2 = 60 + 560;
                    const regPy2 = 270 - (Math.min(maxX, Math.max(0, regY2)) / maxX) * 240;

                    return (
                      <div className="graph-container">
                        <div className="graph-header">
                          <h4>Flame-Front Displacement vs. Time</h4>
                          <span className="graph-coords">
                            Selected Interval: [{spreadResult.t1}s, {spreadResult.t2}s] · Rate = {spreadResult.averageRateMmS.toFixed(2)} mm/s
                          </span>
                        </div>

                        <div className="svg-chart-wrapper">
                          <svg viewBox="0 0 680 320" className="flame-front-svg" role="img" aria-label="Flame-front position graph">
                            <line x1="60" y1="20" x2="60" y2="270" stroke="var(--rule-strong)" strokeWidth="1.5" />
                            <line x1="60" y1="270" x2="640" y2="270" stroke="var(--rule-strong)" strokeWidth="1.5" />

                            {yTicks.map((xVal) => {
                              const yPos = 270 - (xVal / maxX) * 240;
                              return (
                                <g key={xVal}>
                                  <line x1="55" y1={yPos} x2="640" y2={yPos} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
                                  <text x="50" y={yPos + 4} fill="var(--ink-2)" fontSize="11" textAnchor="end" fontFamily="var(--f-mono)">
                                    {xVal} mm
                                  </text>
                                </g>
                              );
                            })}

                            {xTicks.map((tVal) => {
                              const xPos = 60 + (tVal / maxT) * 560;
                              return (
                                <g key={tVal}>
                                  <line x1={xPos} y1="20" x2={xPos} y2="275" stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
                                  <text x={xPos} y="292" fill="var(--ink-2)" fontSize="11" textAnchor="middle" fontFamily="var(--f-mono)">
                                    {tVal} s
                                  </text>
                                </g>
                              );
                            })}

                            {showRegression && (
                              <line
                                x1={regPx1}
                                y1={regPy1}
                                x2={regPx2}
                                y2={regPy2}
                                stroke="rgba(46, 150, 245, 0.55)"
                                strokeWidth="2.5"
                                strokeDasharray="6 4"
                              />
                            )}

                            {/* User Secant Line */}
                            <line x1={px1} y1={py1} x2={px2} y2={py2} stroke="#eafe07" strokeWidth="3.5" />

                            {/* Data Points */}
                            {activeBassDataset.map((pt) => {
                              const px = 60 + (pt.t / maxT) * 560;
                              const py = 270 - (pt.x / maxX) * 240;
                              const isT1 = Math.abs(pt.t - spreadResult.t1) < 0.05;
                              const isT2 = Math.abs(pt.t - spreadResult.t2) < 0.05;
                              const isUserCapture = pt.source?.toLowerCase().includes("user") || pt.source?.toLowerCase().includes("caliper");

                              return (
                                <g key={`${pt.t}-${pt.x}`}>
                                  <circle
                                    cx={px}
                                    cy={py}
                                    r={isT1 || isT2 ? 7 : isUserCapture ? 5.5 : 4}
                                    fill={isT1 ? "#ffbd70" : isT2 ? "#f97c9c" : isUserCapture ? "#38bdf8" : "var(--blue-yonder)"}
                                    stroke="#ffffff"
                                    strokeWidth={isT1 || isT2 ? "2.5" : "1.5"}
                                  />
                                  {(isT1 || isT2) && (
                                    <text
                                      x={px}
                                      y={py - 12}
                                      fill={isT1 ? "#ffbd70" : "#f97c9c"}
                                      fontSize="11"
                                      fontWeight="700"
                                      textAnchor="middle"
                                      fontFamily="var(--f-mono)"
                                    >
                                      {isT1 ? "Point A" : "Point B"} ({pt.t}s, {pt.x}mm)
                                    </text>
                                  )}
                                </g>
                              );
                            })}
                          </svg>
                        </div>

                        <div className="graph-footer">
                          <span className="formula-display">
                            Calculation: <code>{spreadResult.formula}</code>
                          </span>
                          <div style={{ display: "flex", gap: "10px" }}>
                            <button type="button" className="firelab-btn ghost-btn small" onClick={() => setShowRawTable(!showRawTable)}>
                              {showRawTable ? "Hide Data Table" : "View Raw Data Table"}
                            </button>
                            <button
                              type="button"
                              className="firelab-btn primary-btn small"
                              onClick={() => {
                                const headers = [
                                  "Timestamp (s)",
                                  "Flame Front x (mm)",
                                  "Local Rate (mm/s)",
                                  "Fuel Thickness (um)",
                                  "Oxygen (%)",
                                  "Airflow (cm/s)",
                                  "Data Source",
                                ];
                                const rows = activeBassDataset.map((p, idx) => {
                                  const prev = activeBassDataset[idx - 1];
                                  const localRate = prev && p.t > prev.t ? ((p.x - prev.x) / (p.t - prev.t)).toFixed(2) : "0.00";
                                  return [
                                    p.t.toFixed(1),
                                    p.x.toFixed(1),
                                    localRate,
                                    selectedThickness.toString(),
                                    selectedOxygen.toFixed(1),
                                    selectedAirflow.toFixed(1),
                                    p.source || "sim_model",
                                  ];
                                });
                                exportMeasurementCsv(`nasa_psi25_bass2_flame_spread_${Date.now()}.csv`, headers, rows);
                              }}
                            >
                              📥 Export CSV
                            </button>
                          </div>
                        </div>

                        {showRawTable && (
                          <div className="raw-data-table-wrap" style={{ marginTop: "16px" }}>
                            <table className="raw-data-table">
                              <thead>
                                <tr>
                                  <th>Timestamp (s)</th>
                                  <th>Flame Position x (mm)</th>
                                  <th>Local Δx/Δt (mm/s)</th>
                                  <th>Data Provenance</th>
                                </tr>
                              </thead>
                              <tbody>
                                {activeBassDataset.map((p, idx) => {
                                  const prev = activeBassDataset[idx - 1];
                                  const localRate = prev && p.t > prev.t ? (p.x - prev.x) / (p.t - prev.t) : null;
                                  const isA = Math.abs(p.t - spreadResult.t1) < 0.05;
                                  const isB = Math.abs(p.t - spreadResult.t2) < 0.05;
                                  return (
                                    <tr key={`${p.t}-${p.x}`} className={isA || isB ? "highlight-row" : ""}>
                                      <td>{p.t.toFixed(1)}</td>
                                      <td>{p.x.toFixed(1)}</td>
                                      <td>{localRate !== null ? `${localRate.toFixed(2)} mm/s` : "Initial Anchor"}</td>
                                      <td>
                                        <span className={`sim-hud-pill ${isA || isB ? "highlight" : ""}`}>
                                          {p.source || "sim_run"}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Challenge: Find the Measurement */}
                  <div className="mini-game-box">
                    <div className="mini-game-header">
                      <span className="game-badge">Research Challenge</span>
                      <h4>Find the Measurement: How was Flame-Front Displacement x(t) Extracted?</h4>
                    </div>
                    <p className="game-prompt">
                      Review the glovebox diagnostics. Which flight instrument provides the displacement record plotted above?
                    </p>
                    <div className="game-options-grid">
                      <button
                        type="button"
                        className={`game-option-btn ${selectedInstrument === "camera" ? "selected correct" : ""}`}
                        onClick={() => {
                          setSelectedInstrument("camera");
                          setInstrumentFeedback("Correct! High-resolution top-view optical imaging records the moving flame front against millimeter-graduated fiducial marks.");
                        }}
                      >
                        <strong>Top-View Color Camera</strong>
                        <span>Optical frame calibration</span>
                      </button>
                      <button
                        type="button"
                        className={`game-option-btn ${selectedInstrument === "radiometer" ? "selected incorrect" : ""}`}
                        onClick={() => {
                          setSelectedInstrument("radiometer");
                          setInstrumentFeedback("Incorrect. The broadband radiometer records total radiative heat flux (mW/cm²), not spatial flame-front position.");
                        }}
                      >
                        <strong>Broadband Radiometer</strong>
                        <span>Radiative emission flux</span>
                      </button>
                      <button
                        type="button"
                        className={`game-option-btn ${selectedInstrument === "anemometer" ? "selected incorrect" : ""}`}
                        onClick={() => {
                          setSelectedInstrument("anemometer");
                          setInstrumentFeedback("Incorrect. The hot-wire anemometer calibrates duct forced airflow velocity (cm/s), not solid pyrolyzing front position.");
                        }}
                      >
                        <strong>Hot-Wire Anemometer</strong>
                        <span>Flow duct velocity</span>
                      </button>
                    </div>

                    {instrumentFeedback && (
                      <div className={`game-feedback ${selectedInstrument === "camera" ? "positive" : "negative"}`}>
                        {instrumentFeedback}
                      </div>
                    )}
                  </div>

                  <div className="step-actions">
                    <button type="button" className="firelab-btn secondary-btn" onClick={() => setBassStep(2)}>
                      ← Back to Observation
                    </button>
                    <button type="button" className="firelab-btn primary-btn" onClick={() => setBassStep(4)}>
                      Proceed to Scientific Interpretation →
                    </button>
                  </div>
                </section>
              )}

              {/* STEP 4: INTERPRET */}
              {bassStep === 4 && (
                <section className="firelab-card" aria-labelledby="interpret-title">
                  <div className="card-header">
                    <div>
                      <h3 id="interpret-title" className="card-title">Compare and Interpret</h3>
                      <p className="card-desc">
                        Analyze how fuel thickness and forced airflow govern burning rates, test hypotheses against confounders, and view results through dual scientific lenses.
                      </p>
                    </div>
                    <div className="perspective-toggle-group">
                      <span className="toggle-label">Scientific View:</span>
                      <button
                        type="button"
                        className={`persp-btn ${perspective === "experimentalist" ? "active" : ""}`}
                        onClick={() => setPerspective("experimentalist")}
                      >
                        Astronaut / Experimentalist
                      </button>
                      <button
                        type="button"
                        className={`persp-btn ${perspective === "modeller" ? "active" : ""}`}
                        onClick={() => setPerspective("modeller")}
                      >
                        CFD / Modeller
                      </button>
                    </div>
                  </div>

                  <div className="comparison-runs-box">
                    <div className="comp-header">
                      <h4>Side-by-Side Run Comparison</h4>
                      <div className="comp-selector">
                        <label htmlFor="compare-run-select">Compare Run 1 against:</label>
                        <select
                          id="compare-run-select"
                          value={comparisonRunId}
                          onChange={(e) => setComparisonRunId(e.target.value)}
                          className="firelab-select"
                        >
                          {DOCUMENTED_BASS_RUNS.filter((r) => r.runId !== selectedRun.runId).map((r) => (
                            <option key={r.runId} value={r.runId}>
                              Test {r.testNumber}: {r.thicknessMicrons} µm, {r.airflowCmS} cm/s ({r.geometry})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="comparison-columns">
                      <div className="run-card run-primary">
                        <div className="run-card-header">
                          <span className="run-badge">RUN 1 (ACTIVE CONFIG)</span>
                          <h5>Test {selectedRun.testNumber}</h5>
                        </div>
                        <dl className="run-specs-list">
                          <div className="spec-row"><dt>Thickness:</dt><dd>{selectedThickness} µm</dd></div>
                          <div className="spec-row"><dt>Oxygen:</dt><dd>{selectedOxygen.toFixed(1)}%</dd></div>
                          <div className="spec-row"><dt>Airflow:</dt><dd>{selectedAirflow.toFixed(1)} cm/s</dd></div>
                          <div className="spec-row"><dt>Spread Rate:</dt><dd className="highlight-metric">2.0 mm/s</dd></div>
                          <div className="spec-row"><dt>Burn Outcome:</dt><dd>{selectedRun.outcome}</dd></div>
                        </dl>
                      </div>

                      <div className="run-card run-secondary">
                        <div className="run-card-header">
                          <span className="run-badge comp-badge">RUN 2 (COMPARISON RUN)</span>
                          <h5>Test {comparisonRun.testNumber}</h5>
                        </div>
                        <dl className="run-specs-list">
                          <div className="spec-row"><dt>Thickness:</dt><dd>{comparisonRun.thicknessMicrons} µm</dd></div>
                          <div className="spec-row"><dt>Oxygen:</dt><dd>{comparisonRun.oxygenPct.toFixed(1)}%</dd></div>
                          <div className="spec-row"><dt>Airflow:</dt><dd>{comparisonRun.airflowCmS.toFixed(1)} cm/s</dd></div>
                          <div className="spec-row"><dt>Spread Rate:</dt><dd className="highlight-metric">{comparisonRun.measuredSpreadRateMmS || "—"} mm/s</dd></div>
                          <div className="spec-row"><dt>Burn Outcome:</dt><dd>{comparisonRun.outcome}</dd></div>
                        </dl>
                      </div>
                    </div>
                  </div>

                  {/* Challenge: Spot the Confounder */}
                  <div className="mini-game-box">
                    <div className="mini-game-header">
                      <span className="game-badge">Confounder Analysis</span>
                      <h4>Spot the Confounder: Why did Test B4 spread slower than Test B1?</h4>
                    </div>
                    <p className="game-prompt">
                      A junior researcher observes that Test B4 spreads at 0.9 mm/s while Test B1 spreads at 2.0 mm/s. Both tests ran at 22.2% O₂ and 5.0 cm/s airflow. What explains the difference?
                    </p>
                    <div className="game-options-vertical">
                      <button
                        type="button"
                        className={`confounder-btn ${confounderAnswer === "a" ? "selected" : ""}`}
                        onClick={() => {
                          setConfounderAnswer("a");
                          setShowConfounderFeedback(true);
                        }}
                      >
                        A. The glovebox pressure fell below 50 kPa, reducing oxidizer density.
                      </button>
                      <button
                        type="button"
                        className={`confounder-btn ${confounderAnswer === "b" ? "selected correct" : ""}`}
                        onClick={() => {
                          setConfounderAnswer("b");
                          setShowConfounderFeedback(true);
                        }}
                      >
                        B. Fuel thickness increased from 100 µm to 300 µm, tripling the solid thermal mass that must be heated to pyrolysis temperature.
                      </button>
                      <button
                        type="button"
                        className={`confounder-btn ${confounderAnswer === "c" ? "selected" : ""}`}
                        onClick={() => {
                          setConfounderAnswer("c");
                          setShowConfounderFeedback(true);
                        }}
                      >
                        C. Microgravity drift induced buoyant flow in the opposite direction.
                      </button>
                    </div>

                    {showConfounderFeedback && (
                      <div className={`game-feedback ${confounderAnswer === "b" ? "positive" : "negative"}`}>
                        {confounderAnswer === "b" ? (
                          <>
                            <strong>Well reasoned!</strong> Fuel thickness is the primary confounding variable here. At 300 µm, the sample transitions towards thermal thickness: conductive heat conduction into the solid absorbs energy, lowering the flame-front propagation velocity.
                          </>
                        ) : (
                          <>
                            <strong>Not quite:</strong> Chamber pressure remained standard at 100 kPa and residual g-jitter is negligible (10⁻⁶ g). Re-examine the fuel thickness of Test B4.
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="step-actions">
                    <button type="button" className="firelab-btn secondary-btn" onClick={() => setBassStep(3)}>
                      ← Back to Data Processing
                    </button>
                    <button type="button" className="firelab-btn primary-btn" onClick={() => setBassStep(1)}>
                      ↺ Configure Another Test Run
                    </button>
                  </div>
                </section>
              )}
            </div>

            {/* RIGHT SIDEBAR: Telemetry HUD */}
            <aside className="firelab-hud">
              <div className="hud-panel">
                <div className="hud-header">
                  <span className="hud-title">REAL-TIME TELEMETRY</span>
                  <span className="hud-run-badge">{selectedRun.runId}</span>
                </div>

                <dl className="hud-data-list">
                  <div className="hud-row"><dt>Sample:</dt><dd>{selectedRun.sampleNumber} ({selectedRun.material})</dd></div>
                  <div className="hud-row"><dt>Thickness:</dt><dd className="hud-highlight">{selectedThickness} µm</dd></div>
                  <div className="hud-row"><dt>Oxygen O₂:</dt><dd className="hud-highlight">{selectedOxygen.toFixed(1)}%</dd></div>
                  <div className="hud-row"><dt>Airflow:</dt><dd className="hud-highlight">{selectedAirflow.toFixed(1)} cm/s</dd></div>
                  <div className="hud-row"><dt>Chamber Press:</dt><dd>{selectedRun.pressureKpa} kPa</dd></div>
                  <div className="hud-row"><dt>Flow Regime:</dt><dd>{selectedRun.flowDirection}</dd></div>
                  <div className="hud-row"><dt>Derived Rate:</dt><dd className="hud-highlight">{spreadResult.averageRateMmS.toFixed(1)} mm/s</dd></div>
                </dl>

                <div className="hud-footer">
                  <span className="hud-mode-indicator"><span className="mode-dot" /> MSG Operational</span>
                  <a href="https://psi.nasa.gov/physci/repo/data/investigations/PSI-25" target="_blank" rel="noopener noreferrer" className="hud-link">
                    NASA PSI Repository ↗
                  </a>
                </div>
              </div>

              <div className="hud-guide-card">
                <h4>Microgravity Science Insights</h4>
                <div className="concept-chip">
                  <strong>Why Microgravity Matters:</strong> Without buoyancy, natural convective drafts disappear. Combustion becomes purely diffusion- and forced-ventilation-driven.
                </div>
                <div className="concept-chip">
                  <strong>Thermal Inertia:</strong> Thin fuels ignite and spread fast; thick fuels conduct heat into the bulk, slowing flame propagation.
                </div>
                <div className="concept-chip">
                  <strong>Extinction Boundaries:</strong> At low flow, radiation outpaces heat release (radiative quench). At extreme high flow, blowing cools the reaction zone (blowoff quench).
                </div>
              </div>
            </aside>
          </div>
        </div>
      )}

      {/* Scientific Integrity Footer (Exact per ChatGPT and NASA Guidelines) */}
      <footer className="scientific-integrity-banner">
        <strong>Scientific Integrity &amp; Provenance:</strong> Built-in droplet animations, numerical values, and comparative models are pedagogical teaching frameworks sourced from NASA Physical Sciences Informatics (PSI-69 / PSI-25) published investigations. Flight video recordings reflect authentic ISS crew observations. Uploaded video footage is evaluated locally in your browser and is authentic only when verified against the NASA PSI data archive.
      </footer>
    </div>
  );
}
