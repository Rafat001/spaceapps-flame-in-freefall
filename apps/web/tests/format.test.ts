import { describe, expect, it } from "vitest";
import { condText, humanize, pct, qsSafe } from "./helpers";

describe("format", () => {
  it("never shows a value for unknown conditions", () => {
    expect(condText({ known: false, display: "21 %" })).toBe("Not reported");
    expect(condText(null)).toBe("Not reported");
    expect(condText({ known: true, display: "13.6–22.2 % O2 (by volume)" })).toBe("13.6–22.2 % O2 (by volume)");
  });
  it("formats percentages and labels", () => {
    expect(pct(0.5)).toBe("50%");
    expect(pct(undefined)).toBe("Not reported");
    expect(humanize("flame_spread")).toBe("Flame Spread");
  });
  it("builds query strings without empty params", () => {
    expect(qsSafe({ a: 1, b: "", c: undefined })).toBe("?a=1");
  });
});
