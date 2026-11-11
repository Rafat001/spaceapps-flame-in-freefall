"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ErrorBox, EvidenceLabel, Loading, Notice, PageHead } from "@/components/ui";

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
      <PageHead no="04" kicker="Ranking" title="Research relevance ranking">
        How closely each investigation’s documented conditions match a target scenario. Relevance to research, not a hazard score.
      </PageHead>
      <div className="inline-field picker-narrow">
        <label htmlFor="scenario">Scenario</label>
        <select id="scenario" value={scenario} onChange={(e) => router.push(`/insights?scenario=${e.target.value}`)}>
          {meta && Object.entries(meta.scenarios).map(([k, v]) => <option key={k} value={k}>{v as string}</option>)}
        </select>
      </div>
      <ErrorBox error={err} />
      {!data ? <Loading /> : (
        <>
          {data.warnings.map((w: string) => <Notice key={w} kind="warn">{w}</Notice>)}
          {data.scenario_atmosphere && <p className="atmo">Target atmosphere <span className="mono">{data.scenario_atmosphere.display}</span> <EvidenceLabel text="Official challenge brief" /></p>}
          <p className="formula">{data.score_formula}. Weights: {Object.entries(data.weights).map(([k, v]: any) => `${data.criteria_labels[k]} ${Math.round(v * 100)}%`).join(" · ")}. {data.weights_note} Version {data.ranking_version}.</p>
          <ol className="ranked rank-full">
            {data.results.map((r: any, i: number) => (
              <li key={r.investigation.id} className="ranked-row">
                <span className="ranked-no">{String(i + 1).padStart(2, "0")}</span>
                <Link className="ranked-acr" href={`/investigations/${r.investigation.id}`}>{r.investigation.acronym}</Link>
                <span className="ranked-title">{r.investigation.title}
                  <span className="ranked-meta">{r.investigation.family} · {r.investigation.fuel_class}</span></span>
                <span className="ranked-score"><b>{r.score}</b><span className="muted"> / 100</span>
                  <span className="meter" aria-hidden="true"><span style={{ width: `${r.score}%` }} /></span></span>
                <details className="ranked-detail"><summary>Why this score</summary>
                  <div className="table-wrap free"><table><thead><tr><th>Criterion</th><th>Weight</th><th>Match</th><th>Points</th><th>Evidence</th></tr></thead>
                    <tbody>{r.breakdown.map((c: any) => (
                      <tr key={c.criterion}><td>{c.label}</td><td className="num">{Math.round(c.weight * 100)}%</td>
                        <td className="num"><div className="bar" aria-label={`match ${c.match}`}><span style={{ width: `${c.match * 100}%` }} /></div>{c.match}</td>
                        <td className="num">{c.contribution}</td>
                        <td className="small">{c.citations.map((ci: any, i: number) => <div key={i} className="cite-line"><EvidenceLabel text={ci.label} /> {ci.excerpt} {ci.url && <a href={ci.url} target="_blank" rel="noreferrer">↗</a>}</div>)}
                          {c.flags.map((fl: string) => <div key={fl} className="st-unknown">{fl}</div>)}</td></tr>))}</tbody></table></div>
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
