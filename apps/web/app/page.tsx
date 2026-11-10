"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Disclaimer, ErrorBox, EvidenceLabel, Loading } from "@/components/ui";

export default function Home() {
  const router = useRouter();
  const [meta, setMeta] = useState<any>(null);
  const [top, setTop] = useState<any>(null);
  const [scenario, setScenario] = useState("lunar_habitat");
  const [q, setQ] = useState("");
  const [err, setErr] = useState<unknown>(null);

  useEffect(() => { api("/api/meta").then(setMeta).catch(setErr); }, []);
  useEffect(() => { setTop(null); api(`/api/rank?scenario=${scenario}`).then(setTop).catch(setErr); }, [scenario]);

  return (
    <>
      <section className="hero panel">
        <h1>Has this fire-safety work already been done?</h1>
        <p>Search NASA microgravity combustion investigations by material, oxygen, pressure, airflow, hardware and
          measurement type. See what is documented, what is <em>Not reported</em>, and where the evidence comes from.</p>
        <form onSubmit={(e) => { e.preventDefault(); router.push(`/explorer?q=${encodeURIComponent(q)}`); }} role="search">
          <label htmlFor="q">Search investigations (e.g. “PMMA flame spread”, “smoke detection”, “BASS-II”)</label>
          <div className="row"><input id="q" value={q} onChange={(e) => setQ(e.target.value)} />
            <button type="submit" style={{ flex: "0 0 auto" }}>Search</button></div>
        </form>
        <p className="small"><Link href="/coverage">Check parameter coverage →</Link> · <Link href="/assistant">Ask the evidence →</Link></p>
      </section>
      <Disclaimer />
      <ErrorBox error={err} />
      <h2>Scenario</h2>
      <label htmlFor="scenario">Application scenario</label>
      <select id="scenario" value={scenario} onChange={(e) => setScenario(e.target.value)} style={{ maxWidth: 360 }}>
        {meta && Object.entries(meta.scenarios).map(([k, v]) => <option key={k} value={k}>{v as string}</option>)}
      </select>
      {top?.scenario_atmosphere ? (
        <p className="small">Target atmosphere: {top.scenario_atmosphere.display} <EvidenceLabel text="Official challenge brief" /></p>
      ) : top ? <p className="small">Target atmosphere: <EvidenceLabel text="Not established" /> (no value in the official brief)</p> : null}
      <h2>Most research-relevant investigations <span className="muted small">(relevance, not hazard)</span></h2>
      {!top ? <Loading /> : (
        <div className="grid">
          {top.results.slice(0, 6).map((r: any) => (
            <div className="card" key={r.investigation.id}>
              <h3><Link href={`/investigations/${r.investigation.id}`}>{r.investigation.acronym}</Link></h3>
              <div className="muted small">{r.investigation.title}</div>
              <div><span className="score">{r.score}</span><span className="muted"> / 100 relevance</span></div>
              <div className="chips"><span className="chip">{r.investigation.family}</span><span className="chip">{r.investigation.fuel_class}</span></div>
            </div>
          ))}
        </div>
      )}
      <p><Link href={`/insights?scenario=${scenario}`}>See full ranking with score breakdown →</Link></p>
      {meta && (
        <>
          <h2>Reference atmospheres</h2>
          <ul>{meta.reference_atmospheres.map((a: any) => <li key={a.label}><strong>{a.label}:</strong> {a.text} <EvidenceLabel text="Official challenge brief" /></li>)}</ul>
          <p className="muted small">Catalog: {meta.counts.investigations} investigations · {meta.counts.test_runs} PSI table rows · {meta.counts.chunks} indexed text chunks.</p>
        </>
      )}
    </>
  );
}
