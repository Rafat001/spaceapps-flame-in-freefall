"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ErrorBox, EvidenceLabel, Loading, Notice } from "@/components/ui";

function Insights() {
  const sp = useSearchParams();
  const router = useRouter();
  const scenario = sp.get("scenario") || "lunar_habitat";
  const [meta, setMeta] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<unknown>(null);
  useEffect(() => { api("/api/meta").then(setMeta).catch(setErr); }, []);
  useEffect(() => { setData(null); api(`/api/rank?scenario=${scenario}`).then(setData).catch(setErr); }, [scenario]);
  return (
    <>
      <h1>Research relevance ranking</h1>
      <label htmlFor="scenario">Scenario</label>
      <select id="scenario" style={{ maxWidth: 360 }} value={scenario} onChange={(e) => router.push(`/insights?scenario=${e.target.value}`)}>
        {meta && Object.entries(meta.scenarios).map(([k, v]) => <option key={k} value={k}>{v as string}</option>)}
      </select>
      <ErrorBox error={err} />
      {!data ? <Loading /> : (
        <>
          {data.warnings.map((w: string) => <Notice key={w} kind="warn">{w}</Notice>)}
          {data.scenario_atmosphere && <p>Target atmosphere: {data.scenario_atmosphere.display} <EvidenceLabel text="Official challenge brief" /></p>}
          <p className="muted small">{data.score_formula}. Weights: {Object.entries(data.weights).map(([k, v]: any) => `${data.criteria_labels[k]} ${Math.round(v * 100)}%`).join(" · ")}. {data.weights_note} Version {data.ranking_version}.</p>
          <ol style={{ paddingLeft: 20 }}>
            {data.results.map((r: any) => (
              <li key={r.investigation.id} className="panel" style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div><strong><Link href={`/investigations/${r.investigation.id}`}>{r.investigation.acronym}</Link></strong> — {r.investigation.title}
                    <div className="chips"><span className="chip">{r.investigation.family}</span><span className="chip">{r.investigation.fuel_class}</span></div></div>
                  <div><span className="score">{r.score}</span><span className="muted"> / 100</span></div>
                </div>
                <details><summary>Why this score</summary>
                  <table><thead><tr><th>Criterion</th><th>Weight</th><th>Match</th><th>Points</th><th>Evidence</th></tr></thead>
                    <tbody>{r.breakdown.map((c: any) => (
                      <tr key={c.criterion}><td>{c.label}</td><td>{Math.round(c.weight * 100)}%</td>
                        <td><div className="bar" aria-label={`match ${c.match}`}><span style={{ width: `${c.match * 100}%` }} /></div>{c.match}</td>
                        <td>{c.contribution}</td>
                        <td className="small">{c.citations.map((ci: any, i: number) => <div key={i}><EvidenceLabel text={ci.label} /> {ci.excerpt} {ci.url && <a href={ci.url} target="_blank" rel="noreferrer">↗</a>}</div>)}
                          {c.flags.map((fl: string) => <div key={fl} className="st-unknown">{fl}</div>)}</td></tr>))}</tbody></table>
                </details>
              </li>
            ))}
          </ol>
        </>
      )}
    </>
  );
}
export default function Page() { return <Suspense fallback={<Loading />}><Insights /></Suspense>; }
