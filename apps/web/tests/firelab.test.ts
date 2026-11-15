import { describe, expect, it } from "vitest";
import {
  APPARATUS_HOTSPOTS,
  DOCUMENTED_BASS_RUNS,
  SYNTHETIC_DATA_POINTS,
  calculateLinearRegression,
  calculateSpreadRate,
  findNearestBassRun,
  calculateDropletDiameter,
  calculateFlexRateConstant,
} from "../lib/firelabData";
import { detectPathways } from "../lib/pathways";

describe("Learning FireLab: Data & Scientific Calculations", () => {
  it("calculates flame spread rate correctly from synthetic observation points (PDF §06)", () => {
    // PDF Section 06: user selects t1 = 2 s and t2 = 8 s. Show x1 = 4 mm and x2 = 16 mm.
    // The average spread rate is (16 - 4) / (8 - 2) = 2 mm/s.
    const res = calculateSpreadRate(2, 8);
    expect(res.t1).toBe(2);
    expect(res.t2).toBe(8);
    expect(res.x1).toBe(4);
    expect(res.x2).toBe(16);
    expect(res.deltaX).toBe(12);
    expect(res.deltaT).toBe(6);
    expect(res.averageRateMmS).toBe(2.0);
    expect(res.formula).toContain("2 mm/s");
  });

  it("calculates spread rate honoring live custom user captures (e.g. non-static data)", () => {
    // User marks Caliper A at t=5s, x=15mm and Caliper B at t=10s, x=35mm (rate = 4.0 mm/s)
    const customCaptures = [
      { t: 0, x: 0, source: "user" },
      { t: 5, x: 15, source: "user_caliper_A" },
      { t: 10, x: 35, source: "user_caliper_B" },
    ];
    const res = calculateSpreadRate(5, 10, customCaptures);
    expect(res.t1).toBe(5);
    expect(res.t2).toBe(10);
    expect(res.x1).toBe(15);
    expect(res.x2).toBe(35);
    expect(res.deltaX).toBe(20);
    expect(res.deltaT).toBe(5);
    expect(res.averageRateMmS).toBe(4.0);
    expect(res.formula).toContain("4 mm/s");
  });

  it("computes linear regression with slope = 2.0 mm/s and R² = 1.0", () => {
    const reg = calculateLinearRegression(SYNTHETIC_DATA_POINTS);
    expect(reg.slope).toBe(2.0);
    expect(reg.intercept).toBe(0.0);
    expect(reg.rSquared).toBe(1.0);
  });

  it("finds exact NASA BASS-II flight run match for Test B1", () => {
    const match = findNearestBassRun(100, 22.2, 5.0);
    expect(match.isExact).toBe(true);
    expect(match.exactMatch?.runId).toBe("B1");
    expect(match.exactMatch?.sampleNumber).toBe("147");
    expect(match.exactMatch?.isRealFlightVideo).toBe(true);
    expect(match.differences.length).toBe(0);
  });

  it("falls back to nearest run when conditions do not exactly match documented NASA tests", () => {
    // Request a hypothetical 250 µm fuel at 18.5% O2 and 4.2 cm/s
    const match = findNearestBassRun(250, 18.5, 4.2);
    expect(match.isExact).toBe(false);
    expect(match.exactMatch).toBeUndefined();
    expect(match.nearestRun).toBeDefined();
    expect(match.differences.length).toBeGreaterThan(0);
    expect(match.differences.some((d) => d.includes("Fuel thickness") || d.includes("Oxygen") || d.includes("Airflow"))).toBe(true);
  });

  it("contains all documented apparatus hotspots with calibration notes", () => {
    expect(APPARATUS_HOTSPOTS.length).toBe(5);
    const ids = APPARATUS_HOTSPOTS.map((h) => h.id);
    expect(ids).toContain("camera");
    expect(ids).toContain("holder");
    expect(ids).toContain("airflow");
    expect(ids).toContain("timing");
    expect(ids).toContain("radiometer");

    for (const h of APPARATUS_HOTSPOTS) {
      expect(h.howMeasured.length).toBeGreaterThan(10);
      expect(h.calibrationNotes.length).toBeGreaterThan(10);
    }
  });

  it("detects Learning FireLab pathway from relevant queries", () => {
    const p1 = detectPathways({ query: "How is the experiment conducted in FireLab?" });
    expect(p1.some((p) => p.href === "/firelab")).toBe(true);
    expect(p1.some((p) => p.badge === "INTERACTIVE LAB")).toBe(true);

    const p2 = detectPathways({ query: "how data is extracted from flame front video" });
    expect(p2.some((p) => p.href === "/firelab")).toBe(true);
  });

  it("calculates droplet diameter and rate constant according to D²-law", () => {
    // At t=0, D should equal initial diameter
    const d0 = calculateDropletDiameter(0, 4.0, 21, "n-Heptane");
    expect(d0).toBe(4.0);

    // At t=40s, D should shrink
    const d40 = calculateDropletDiameter(40, 4.0, 21, "n-Heptane");
    expect(d40).toBeLessThan(4.0);
    expect(d40).toBeGreaterThan(0.4);

    // Rate constant between t1=10, d1 and t2=60, d2
    const d1 = calculateDropletDiameter(10, 4.0, 21, "n-Heptane");
    const d2 = calculateDropletDiameter(60, 4.0, 21, "n-Heptane");
    const res = calculateFlexRateConstant(10, d1, 60, d2);
    expect(res.rateK).toBeCloseTo(0.22, 1);
    expect(res.formula).toContain("mm²/s");
  });
});
