import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import FireTetrahedron, { faceNormal, orientationFacing } from "../components/FireTetrahedron";
import {
  BUOYANCY_QUOTE, EMPTY_ENV, EXAMPLES, FACES, envToParams, filterRuns, journeyFor, pathways, toggleFace, type SourceQuote,
} from "../lib/fireDynamics";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const squash = (s: string) => s.replace(/\s+/g, " ").trim();

/** All text of a stored source: plain text files as-is, PSI JSON records as every string value joined. */
function sourceText(file: string): string {
  const raw = readFileSync(ROOT + file, "utf8");
  if (!file.endsWith(".json")) return squash(raw);
  const out: string[] = [];
  const walk = (o: unknown): void => {
    if (typeof o === "string") out.push(o);
    else if (Array.isArray(o)) o.forEach(walk);
    else if (o && typeof o === "object") Object.values(o).forEach(walk);
  };
  walk(JSON.parse(raw));
  return squash(out.join(" "));
}

describe("Fire Dynamics Explorer content", () => {
  const quotes: SourceQuote[] = [BUOYANCY_QUOTE, ...Object.values(EXAMPLES).flatMap((x) => x.studied)];
  it.each(quotes.map((q) => [q.source, q] as const))("quote from %s is verbatim in the stored source", (_s, q) => {
    expect(sourceText(q.file)).toContain(squash(q.quote));
  });

  it("every quote links to a source listed in the official manifest or a PSI record", () => {
    const manifest = readFileSync(ROOT + "data/sources/official/MANIFEST.md", "utf8");
    for (const q of quotes) {
      if (q.file.startsWith("data/sources/psi/")) expect(q.url).toMatch(/^https:\/\/psi\.nasa\.gov\/physci\/repo\/data\/investigations\/PSI-\d+$/);
      else expect(manifest).toContain(q.url);
    }
  });

  it("follows the guide's pathways", () => {
    expect(journeyFor(["fuel", "oxidizer"])).toBe("bass2");
    expect(journeyFor(["oxidizer", "fuel"])).toBe("bass2");
    expect(journeyFor(["fuel", "heat"])).toBe("gel");
    expect(journeyFor(["heat", "oxidizer"])).toBe("mist");
    expect(journeyFor([...FACES])).toBe("saffire");
    expect(journeyFor(["fuel"])).toBeNull();
    expect(journeyFor([])).toBeNull();
    expect(pathways().map((p) => p.label)).toEqual(["Fuel + Oxidizer", "Fuel + Heat", "Heat + Oxidizer", "All four faces"]);
  });

  it("only examples with PSI tables claim PSI records", () => {
    expect(EXAMPLES.bass2.psi).toEqual(["psi-25"]);
    expect(EXAMPLES.saffire.psi).toEqual(["psi-98", "psi-99", "psi-100"]);
    expect(EXAMPLES.gel.psi).toEqual([]);
    expect(EXAMPLES.mist.psi).toEqual([]);
    expect(EXAMPLES.gel.inPsiNote).toMatch(/no PSI record/);
  });

  it("toggles faces in canonical order", () => {
    expect(toggleFace([], "oxidizer")).toEqual(["oxidizer"]);
    expect(toggleFace(["oxidizer"], "fuel")).toEqual(["fuel", "oxidizer"]);
    expect(toggleFace(["fuel", "oxidizer"], "fuel")).toEqual(["oxidizer"]);
  });
});

describe("environment filters", () => {
  const runs = [
    { material: "100 micron PMMA film", oxygen: { known: true, min: 22.2, max: 22.2 }, airflow: { known: false } },
    { material: "SIBAL Fabric", oxygen: { known: true, min: 21.5, max: 21.7 }, airflow: { known: true, min: 0.2, max: 0.2 } },
    { material: "SIBAL Fabric", oxygen: { known: false }, airflow: { known: true, min: 0.3, max: 0.3 } },
  ];
  it("passes everything with no filters", () => expect(filterRuns(runs, { ...EMPTY_ENV })).toHaveLength(3));
  it("matches material case-insensitively", () => expect(filterRuns(runs, { ...EMPTY_ENV, material: "pmma" })).toHaveLength(1));
  it("never passes Not reported values through a numeric bound", () => {
    expect(filterRuns(runs, { ...EMPTY_ENV, oxygen_min: "21" })).toHaveLength(2);
    expect(filterRuns(runs, { ...EMPTY_ENV, airflow_max: "0.25" })).toHaveLength(1);
  });
  it("treats ranges as overlapping", () => expect(filterRuns(runs, { ...EMPTY_ENV, oxygen_min: "21.6", oxygen_max: "22" })).toHaveLength(1));
  it("maps to Explorer parameters, only the ones set", () => {
    expect(envToParams(EMPTY_ENV)).toEqual({ gravity_regime: "microgravity" });
    expect(envToParams({ ...EMPTY_ENV, gravity: "", material: " PMMA ", airflow_min: "0.1" }))
      .toEqual({ material: "PMMA", airflow_min: "0.1", airflow_unit: "m/s" });
  });
});

describe("FireTetrahedron", () => {
  it("renders a decorative 3D solid plus four accessible toggle buttons reflecting the selection", () => {
    const html = renderToStaticMarkup(<FireTetrahedron selected={["fuel", "oxidizer"]} onToggle={() => {}} />);
    expect(html).toContain('aria-hidden="true" class="fd-tetra-3d"');
    expect((html.match(/data-face="/g) || []).length).toBe(4);
    expect((html.match(/aria-pressed="/g) || []).length).toBe(4);
    expect((html.match(/aria-pressed="true"/g) || []).length).toBe(2);
    expect(html).toContain('title="Material that can burn."');
  });

  it("can turn every face to point at the viewer", () => {
    for (const f of FACES) {
      const n = faceNormal(f);
      const { yaw, pitch } = orientationFacing(n);
      const x1 = n[0] * Math.cos(yaw) + n[2] * Math.sin(yaw), z1 = -n[0] * Math.sin(yaw) + n[2] * Math.cos(yaw);
      const y2 = n[1] * Math.cos(pitch) - z1 * Math.sin(pitch), z2 = n[1] * Math.sin(pitch) + z1 * Math.cos(pitch);
      expect(Math.abs(x1)).toBeLessThan(1e-9); expect(Math.abs(y2)).toBeLessThan(1e-9); expect(z2).toBeCloseTo(1, 9);
    }
  });
});
