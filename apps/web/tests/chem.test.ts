import { describe, expect, it } from "vitest";
import { chem } from "@/lib/chem";

describe("chem", () => {
  it("subscripts chemical formulas", () => {
    expect(chem("≥ 30 % O2, CO2 and N2")).toBe("≥ 30 % O₂, CO₂ and N₂");
    expect(chem("50% C2H4 with N2, XO2 0.85")).toBe("50% C₂H₄ with N₂, XO₂ 0.85");
    expect(chem("O2/He")).toBe("O₂/He");
  });
  it("leaves identifiers alone", () => {
    expect(chem("H10H101 [S1] test 21106A4 o2_max PSI-20")).toBe("H10H101 [S1] test 21106A4 o2_max PSI-20");
  });
});
