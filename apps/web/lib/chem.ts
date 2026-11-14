// Chemical formulas written the chemistry way: O2 -> O₂, CO2 -> CO₂, C2H4 -> C₂H₄.
// Only a known list of formulas is converted so test IDs (e.g. "H10H101", "A4", "[S1]") stay untouched.
const FORMULAS = [
  "C12H26", "C7H16", "C4H10", "C3H8", "C2H6", "C2H4", "CH4", "H2O", "CO2", "N2O", "NO2", "SO2", "SF6", "CF3Br", "O2", "N2", "H2",
];
const SUB: Record<string, string> = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉" };
// "XO2" (oxygen mole fraction) is matched too, as X + O2.
const RE = new RegExp(`(?<![A-Za-z0-9_])(X?)(${FORMULAS.join("|")})(?![A-Za-z0-9_])`, "g");

export function chem(text: string): string {
  if (!/\d/.test(text)) return text;
  return text.replace(RE, (_m, x: string, f: string) => x + f.replace(/\d/g, (d) => SUB[d]));
}
