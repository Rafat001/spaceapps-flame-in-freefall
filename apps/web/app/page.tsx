"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Mark from "@/components/Mark";
import VideoFacade from "@/components/VideoFacade";
import { SpaceFireTeaser } from "@/components/SpaceFire";
import { Disclaimer, ErrorBox, EvidenceLabel, Loading } from "@/components/ui";

const VIDEO = { id: "W1oXykoz9zg", title: "NASA ScienceCasts: The Power of Studying Combustion on the ISS" };
const GLENN = "https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/";
const TRY = ["PMMA flame spread", "smoke detection", "BASS-II"];
const n = (v?: number) => (typeof v === "number" ? v.toLocaleString("en-US") : "—");

export default function Home() {
  const router = useRouter();
  const [meta, setMeta] = useState<any>(null);
  const [top, setTop] = useState<any>(null);
  const [scenario, setScenario] = useState("lunar_habitat");
  const [q, setQ] = useState("");
  const [err, setErr] = useState<unknown>(null);

  const [lunar, setLunar] = useState<any>(null);
  useEffect(() => { api("/api/meta").then(setMeta).catch(setErr); }, []);
  useEffect(() => {
    api("/api/coverage", { method: "POST", body: JSON.stringify({ oxygen_min: 30, pressure_max: 10.2, pressure_unit: "psi", max_runs: 3 }) })
      .then(setLunar).catch(() => {});
  }, []);
  useEffect(() => { setTop(null); api(`/api/rank?scenario=${scenario}`).then(setTop).catch(setErr); }, [scenario]);

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="kicker"><span className="kicker-no">TM-2026</span> Flame in Freefall: SI-Powered Fire Safety Insights from Microgravity Combustion Data · 2026 NASA Space Apps Challenge</p>
          <h1 id="hero-title" className="display display-xl">Has this fire&#8209;safety work already been&nbsp;done?</h1>
          <p className="lede">Search NASA microgravity combustion investigations by material, oxygen, pressure, airflow, hardware and
            measurement type. See what is documented, what is <em>Not reported</em>, and where the evidence comes from.</p>
          <form className="instrument" onSubmit={(e) => { e.preventDefault(); router.push(`/explorer?q=${encodeURIComponent(q)}`); }} role="search">
            <label htmlFor="q" className="instrument-label">Search investigations (e.g. “PMMA flame spread”, “smoke detection”, “BASS-II”)</label>
            <div className="instrument-row">
              <input id="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="material, condition, hardware…" autoComplete="off" />
              <button type="submit">Search</button>
            </div>
            <p className="instrument-try"><span>Try</span>
              {TRY.map((t) => <Link key={t} href={`/explorer?q=${encodeURIComponent(t)}`}>{t}</Link>)}</p>
          </form>
          <p className="hero-links"><Link href="/coverage">Check parameter coverage →</Link><Link href="/assistant">Ask the evidence →</Link></p>
        </div>
        <aside className="plate" aria-label="Catalog index">
          <figure className="plate-figure">
            <Mark id="hero-mark" size={132} className="mark mark-lg" />
            <figcaption>Fig. 1 — Without buoyancy, a flame draws in oxygen from every side and burns as a sphere.</figcaption>
          </figure>
          <dl className="plate-index">
            <div><dt>Investigations</dt><dd>{n(meta?.counts.investigations)}</dd></div>
            <div><dt>Test rows (PSI tables)</dt><dd>{n(meta?.counts.test_runs)}</dd></div>
            <div><dt>Data in PSI</dt><dd>{meta?.catalog_stats ? `${meta.catalog_stats.total_tb.toFixed(1)} TB` : "—"}</dd></div>
            <div><dt>Indexed passages</dt><dd>{n(meta?.counts.chunks)}</dd></div>
            {meta?.catalog_stats && <p className="plate-note">Computed from PSI records, as of {meta.catalog_stats.as_of}: {meta.catalog_stats.by_project_type["Microgravity Investigation"]} microgravity + {meta.catalog_stats.by_project_type["Ground Investigation"]} ground investigations.</p>}
          </dl>
        </aside>
      </section>

      <section className="lead-card" aria-labelledby="lead-title">
        <p className="kicker"><span className="kicker-no">Lead question</span> Lunar habitat atmosphere (official brief: ≥ 30 % O2, ≤ 10.2 psi)</p>
        <h2 id="lead-title" className="display">Has fire been studied at Moon-base oxygen and pressure?</h2>
        {!lunar ? <Loading /> : <p className="answer">{lunar.answer_text}</p>}
        <p><Link href="/insights">See scenario rankings, rows, and research scores →</Link></p>
      </section>

      <section className="film" aria-labelledby="film-title">
        <VideoFacade id={VIDEO.id} title={VIDEO.title} />
        <div className="film-copy">
          <p className="kicker"><span className="kicker-no">Fig. 2</span> Before you search</p>
          <h2 id="film-title" className="display">The power of studying combustion on the ISS</h2>
          <p className="film-meta">NASA ScienceCasts · 3:39 · official challenge resource</p>
          <blockquote className="film-quote">The Space Station environment also provides an important test-bed for studying spacecraft fire risk.
            <cite><a href={GLENN} target="_blank" rel="noreferrer">NASA Combustion Science page ↗</a></cite></blockquote>
          <p className="film-links">
            <a href={`https://www.youtube.com/watch?v=${VIDEO.id}`} target="_blank" rel="noreferrer">Watch on YouTube ↗</a>
            <Link href="/beyond-psi">NASA experiments not in PSI →</Link>
          </p>
        </div>
      </section>

      <SpaceFireTeaser />

      <Disclaimer />
      <ErrorBox error={err} />

      <section className="section" aria-labelledby="rank-title">
        <div className="section-head">
          <h2 id="rank-title" className="display">Most research-relevant investigations <span className="aside">relevance, not hazard</span></h2>
          <div className="inline-field">
            <label htmlFor="scenario">Application scenario</label>
            <select id="scenario" value={scenario} onChange={(e) => setScenario(e.target.value)}>
              {meta && Object.entries(meta.scenarios).map(([k, v]) => <option key={k} value={k}>{v as string}</option>)}
            </select>
          </div>
        </div>
        {top?.scenario_atmosphere ? (
          <p className="atmo">Target atmosphere <span className="mono">{top.scenario_atmosphere.display}</span> <EvidenceLabel text="Official challenge brief" /></p>
        ) : top ? <p className="atmo">Target atmosphere <EvidenceLabel text="Not established" /> (no value in the official brief)</p> : null}
        {top?.tier_note && <p className="small muted">{top.tier_note}</p>}
        {!top ? <Loading /> : (
          <ol className="ranked">
            {top.results.slice(0, 6).map((r: any, i: number) => (
              <li key={r.investigation.id} className="ranked-row">
                <span className="ranked-no">{String(i + 1).padStart(2, "0")}</span>
                <Link className="ranked-acr" href={`/investigations/${r.investigation.id}`}>{r.investigation.acronym}</Link>
                <span className="ranked-title">{r.investigation.title}
                  <span className="ranked-meta">{r.investigation.family} · {r.investigation.fuel_class}{r.tier === "documented_at_target" ? ` · ${r.target_rows} rows meet the target` : r.tier ? " · no row meets the target" : ""}</span></span>
                <span className="ranked-score"><b>{r.score}</b><span className="muted"> / 100 relevance</span>
                  <span className="meter" aria-hidden="true"><span style={{ width: `${r.score}%` }} /></span></span>
              </li>
            ))}
          </ol>
        )}
        <p className="more"><Link href={`/insights?scenario=${scenario}`}>See full ranking with score breakdown →</Link></p>
      </section>

      {meta && (
        <section className="footnotes" aria-labelledby="atmo-title">
          <h2 id="atmo-title" className="footnotes-title">Reference atmospheres</h2>
          <ol>{meta.reference_atmospheres.map((a: any) => (
            <li key={a.label}><strong>{a.label}.</strong> {a.text} <EvidenceLabel text="Official challenge brief" /></li>))}</ol>
        </section>
      )}
    </>
  );
}
