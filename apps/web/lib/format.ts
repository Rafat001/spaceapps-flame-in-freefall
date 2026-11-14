export const NOT_REPORTED = "Not reported";

export type Cond = { known: boolean; display: string; unit?: string; source_text?: string | null; context?: string | null;
  approximate?: boolean; n_rows?: number; n_total?: number; contexts?: string[]; label?: string };

/** Never shows a value for unknown conditions; never invents precision. */
export function condText(c?: Cond | null): string {
  if (!c || !c.known) return NOT_REPORTED;
  return c.display;
}

export function pct(x: number | null | undefined): string {
  if (x === null || x === undefined || Number.isNaN(x)) return NOT_REPORTED;
  return `${Math.round(x * 100)}%`;
}

export function humanize(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

export const COMPARE_KEY = "fif-compare";
export function readCompare(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(COMPARE_KEY) || "[]"); } catch { return []; }
}
export function toggleCompare(id: string): string[] {
  const cur = readCompare();
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id].slice(-3);
  localStorage.setItem(COMPARE_KEY, JSON.stringify(next));
  return next;
}

/** Compact scenario-fit breakdown: the points each criterion adds (only non-zero ones), e.g. "Target tests 34.7 · Fuel 6". */
export type FitPart = { criterion: string; short_label?: string; label?: string; contribution: number };
export function fitParts(parts?: FitPart[] | null): string {
  if (!parts) return "";
  const nz = parts.filter((p) => p.contribution > 0);
  return nz.length ? nz.map((p) => `${p.short_label || p.label} ${p.contribution}`).join(" + ") : "no criterion matched";
}

/** Plain-language "N rows meet the target" line for a ranked row. */
export function targetLine(tier: string | null | undefined, rows: number | null | undefined): string {
  if (!tier) return "";
  if (tier === "documented_at_target") return ` · ${rows} ${rows === 1 ? "row meets" : "rows meet"} the target`;
  return " · no row meets the target";
}
