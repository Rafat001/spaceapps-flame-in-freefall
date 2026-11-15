import { describe, expect, it } from "vitest";
import { detectPathways } from "../lib/pathways";

describe("detectPathways", () => {
  it("detects BASS PMMA investigation pathway from query", () => {
    const pathways = detectPathways({ query: "Where can I find PMMA tests in BASS?" });
    expect(pathways.some((p) => p.href === "/investigations/psi-26")).toBe(true);
    expect(pathways.some((p) => p.badge === "DATASET")).toBe(true);
  });

  it("detects Fire Dynamics Explorer from fire tetrahedron questions", () => {
    const pathways = detectPathways({ query: "How does the fire tetrahedron explain extinction?" });
    expect(pathways.some((p) => p.href === "/fire-dynamics")).toBe(true);
    expect(pathways.some((p) => p.badge === "3D TOOL")).toBe(true);
  });

  it("detects Lunar and partial gravity page for moon/mars queries", () => {
    const pathways = detectPathways({ query: "What happens in lunar partial gravity?" });
    expect(pathways.some((p) => p.href === "/lunar")).toBe(true);
  });

  it("detects comparison page for comparison queries", () => {
    const pathways = detectPathways({ query: "Can you compare BASS vs Saffire?" });
    expect(pathways.some((p) => p.href === "/compare")).toBe(true);
  });

  it("adds pathways from RAG citations", () => {
    const pathways = detectPathways({
      query: "combustion droplet experiments",
      citations: [
        { investigation_id: "psi-39", acronym: "FLEX" },
      ],
    });
    expect(pathways.some((p) => p.href === "/investigations/psi-39")).toBe(true);
  });
});
