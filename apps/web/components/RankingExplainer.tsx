"use client";
import { EvidenceLabel } from "@/components/ui";

/** Target atmosphere line for a scenario, labelled with the official resource it comes from (or "Not established"). */
export function TargetAtmosphere({ atm }: { atm?: any }) {
  if (!atm) return null;
  const stated = atm.numeric_target_stated !== false;
  return (
    <div className="atmo-block">
      <p className="atmo">Target atmosphere <span className="mono">{atm.display}</span>{" "}
        {stated ? <EvidenceLabel text={atm.source_label} /> : <EvidenceLabel text="Not established" />}
        {atm.citation_url && <a className="small" href={atm.citation_url} target="_blank" rel="noreferrer">source ↗</a>}</p>
      {!stated && <p className="small muted atmo-note">{atm.basis}</p>}
      {atm.convention && <p className="small muted atmo-note">{atm.convention}</p>}
    </div>
  );
}

/** Collapsible plain-language "How ranking works" panel. `lines` comes from the API (ranking.explainer). */
export function RankingExplainer({ lines, open = false }: { lines?: string[] | null; open?: boolean }) {
  if (!lines || !lines.length) return null;
  return (
    <details className="rank-explainer" open={open}>
      <summary>How ranking works</summary>
      <ul>{lines.map((l) => <li key={l}>{l}</li>)}</ul>
    </details>
  );
}

/** "Target tests 29.7/30 · O2 15/15 · …": every criterion with points earned out of points possible. */
export function PointsLine({ parts }: { parts?: any[] | null }) {
  if (!parts) return null;
  return (
    <span className="ranked-parts" title="Points each factor adds to the score (earned / possible)">
      {parts.map((p, i) => (
        <span key={p.criterion} className={p.contribution > 0 ? "pt" : "pt pt-zero"}>
          {i > 0 && " · "}{p.short_label} {p.contribution}{p.max_points !== undefined && <span className="muted">/{p.max_points}</span>}
        </span>
      ))}
    </span>
  );
}
