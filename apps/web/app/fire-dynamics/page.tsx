"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { api, qs } from "@/lib/api";
import { readCompare, toggleCompare } from "@/lib/format";
import FireTetrahedron from "@/components/FireTetrahedron";
import { CondCell, Disclaimer, ErrorBox, EvidenceLabel, Loading, Notice, PageHead } from "@/components/ui";
import {
  BUOYANCY_QUOTE, COMBUSTION_SUMMARY, EMPTY_ENV, EXAMPLE_ORDER, EXAMPLES, FACE_INFO, FACES, envToParams, filterRuns,
  journeyFor, pathways, toggleFace, type EnvFilters, type ExampleId, type Face, type SourceQuote,
} from "@/lib/fireDynamics";

const ROWS_SHOWN = 12;

function parseFaces(s: string | null): Face[] {
  const want = new Set((s || "").split(","));
  return FACES.filter((f) => want.has(f));
}

function Quote({ q }: { q: SourceQuote }) {
  return (
    <blockquote className="fd-quote">“{q.quote}”
      <span className="muted small block"><a href={q.url} target="_blank" rel="noreferrer">{q.source} ↗</a></span>
    </blockquote>
  );
}

function ElementPanel({ selected }: { selected: Face[] }) {
  if (selected.length === 0) {
    return (
      <div className="fd-panel">
        <p className="dossier-no">How combustion works</p>
        <p className="prose">{COMBUSTION_SUMMARY}</p>
        <p className="muted">Select a face of the tetrahedron to see what it means, which variables describe it, and where it
          appears in NASA experiments. Pick two faces to follow a guided pathway.</p>
      </div>
    );
  }
  return (
    <div className="fd-panel">
      {selected.map((f) => {
        const i = FACE_INFO[f];
        return (
          <section key={f} className={`fd-element fd-element-${f}`} aria-label={i.name}>
            <h2 className="fd-element-name">{i.name} <span className="muted small">— {i.meaning}</span></h2>
            <p className="prose">{i.explain}</p>
            <p className="small"><strong>In freefall:</strong> {i.microgravity}</p>
            <p className="small fd-vars"><strong>Variables:</strong> {i.variables.map((v) => <span key={v} className="chip">{v}</span>)}</p>
            <p className="small">Find in the catalog: {i.links.map((l, n) => (
              <span key={l.label}>{n > 0 && " · "}<Link href={`/explorer${qs(l.params)}`}>{l.label}</Link></span>))}</p>
          </section>
        );
      })}
    </div>
  );
}

function EnvControls({ env, setEnv }: { env: EnvFilters; setEnv: (e: EnvFilters) => void }) {
  const set = (k: keyof EnvFilters, v: string) => setEnv({ ...env, [k]: v });
  const num = (k: keyof EnvFilters, label: string, max?: number) => (
    <div><label htmlFor={`fd-${k}`}>{label}</label>
      <input id={`fd-${k}`} type="number" step="any" min={0} max={max} value={env[k]} onChange={(e) => set(k, e.target.value)} /></div>
  );
  return (
    <form className="console fd-env" aria-label="Environment conditions" onSubmit={(e) => e.preventDefault()}>
      <p className="console-title" aria-hidden="true"><span>Environment conditions</span><span>filters test rows</span></p>
      <div className="console-grid">
        <div><label htmlFor="fd-gravity">Gravity regime</label>
          <select id="fd-gravity" value={env.gravity} onChange={(e) => set("gravity", e.target.value)}>
            <option value="microgravity">Microgravity</option><option value="1g_lab_or_model">1 g lab / model</option><option value="">Any</option>
          </select></div>
        <div><label htmlFor="fd-material">Material / sample contains</label>
          <input id="fd-material" value={env.material} placeholder="PMMA, SIBAL, Nomex…" onChange={(e) => set("material", e.target.value)} /></div>
        <div className="fd-env-actions">
          <Link className="btn secondary" href={`/explorer${qs(envToParams(env))}`}>Search whole catalog →</Link>
        </div>
        {num("oxygen_min", "O₂ min (% by volume)", 100)}{num("oxygen_max", "O₂ max (% by volume)", 100)}<div />
        {num("airflow_min", "Airflow min (m/s)")}{num("airflow_max", "Airflow max (m/s)")}
        <div className="fd-env-actions"><button type="button" className="secondary" onClick={() => setEnv(EMPTY_ENV)}>Reset</button></div>
      </div>
      <p className="muted small">Pressure is not reported in the BASS-II or Saffire tables, so it is not offered here; use the catalog
        Explorer for pressure ranges. Numeric bounds skip rows whose value is <em>Not reported</em>.</p>
    </form>
  );
}

function RunsTable({ d, env }: { d: any; env: EnvFilters }) {
  const [all, setAll] = useState(false);
  const gravityMismatch = env.gravity && d.gravity_regime !== env.gravity;
  const tests = (d.test_runs as any[]).filter((r) => r.row_kind === "test" || !r.row_kind);
  const rows = gravityMismatch ? [] : filterRuns(tests, env);
  const shown = all ? rows : rows.slice(0, ROWS_SHOWN);
  return (
    <div className="fd-runs">
      <p className="small"><strong>{rows.length}</strong> of {tests.length} test rows match the environment conditions
        {gravityMismatch && <> — this is a {d.gravity_regime.replace(/_/g, " ")} investigation, so none match the selected gravity regime</>}.
        <EvidenceLabel text="Reported by authors (PSI experimental table)" /></p>
      {rows.length > 0 && (
        <div className="table-wrap"><table>
          <thead><tr><th>Test</th><th>Material / sample</th><th>Geometry</th><th>O₂</th><th>Airflow</th><th>Measured</th><th>Source</th></tr></thead>
          <tbody>{shown.map((r: any) => (
            <tr key={r.id}><td className="num">{r.run_label}</td><td>{r.material}</td><td className="small">{r.sample_geometry}</td>
              <td><CondCell c={r.oxygen} /></td><td><CondCell c={r.airflow} /></td>
              <td className="small">{r.measurements?.length ? r.measurements.map((m: any) => `${m.variable.replace(/_/g, " ")}: ${m.value_text} ${m.unit}`).join("; ") : "—"}</td>
              <td className="num small">{r.source?.file?.replace(/^PSI-\d+_Experimental table_/, "")} row {r.source?.row}</td></tr>))}</tbody>
        </table></div>
      )}
      {rows.length > ROWS_SHOWN && <button type="button" className="secondary" onClick={() => setAll(!all)}>{all ? "Show fewer" : `Show all ${rows.length} rows`}</button>}
    </div>
  );
}

function PsiEvidence({ id, env, details }: { id: string; env: EnvFilters; details: Record<string, any> }) {
  const [cmp, setCmp] = useState<string[]>([]);
  useEffect(() => { setCmp(readCompare()); }, []);
  const d = details[id];
  if (!d) return <Loading what={`Loading ${id.toUpperCase()}`} />;
  if (d instanceof Error) return <ErrorBox error={d} />;
  return (
    <section className="fd-psi" aria-label={`${d.acronym} test records`}>
      <h4>{d.acronym} <span className="muted small">{d.accession} · {d.platform} · {d.test_runs.length} table rows</span></h4>
      <div className="cond-strip">
        <div><span className="muted small block">O₂</span><CondCell c={d.conditions.oxygen} /></div>
        <div><span className="muted small block">Pressure</span><CondCell c={d.conditions.pressure} /></div>
        <div><span className="muted small block">Airflow</span><CondCell c={d.conditions.airflow} /></div>
      </div>
      <RunsTable d={d} env={env} />
      <p className="detail-actions small">
        <a href={d.source_url} target="_blank" rel="noreferrer">PSI record ↗</a>
        {" · "}<Link href={`/investigations/${d.id}`}>Full dossier</Link>
        {" · "}<button type="button" className="secondary" onClick={() => setCmp(toggleCompare(d.id))}>{cmp.includes(d.id) ? "Remove from compare" : "Add to compare"}</button>
      </p>
    </section>
  );
}

function ScaleTable({ details }: { details: Record<string, any> }) {
  const ids = ["psi-25", ...EXAMPLES.saffire.psi];
  if (ids.some((i) => !details[i] || details[i] instanceof Error)) return null;
  const firstTest = (d: any) => (d.test_runs as any[]).find((r) => r.row_kind === "test" || !r.row_kind) || d.test_runs[0];
  return (
    <>
      <h4>Scale-up: sample-scale vs spacecraft-scale <EvidenceLabel text="Reported by authors (PSI experimental table)" /></h4>
      <div className="table-wrap"><table>
        <thead><tr><th>Investigation</th><th>Platform</th><th>Example sample (first test row)</th><th>Geometry</th><th>O₂ range</th><th>Airflow</th></tr></thead>
        <tbody>{ids.map((i) => { const d = details[i]; const r = firstTest(d); return (
          <tr key={i}><td><Link href={`/investigations/${i}`}>{d.acronym}</Link></td><td className="small">{d.platform}</td>
            <td className="small">{r?.material}</td><td className="small">{r?.sample_geometry}</td>
            <td><CondCell c={d.conditions.oxygen} /></td><td><CondCell c={d.conditions.airflow} /></td></tr>); })}</tbody>
      </table></div>
      <p className="small"><Link href={`/compare?ids=${ids.slice(0, 3).join(",")}`}>Compare BASS-II, Saffire I and II side by side →</Link>
        <span className="muted"> (the compare page takes up to three)</span></p>
    </>
  );
}

function ExampleCard({ id, selected, env, details }: { id: ExampleId; selected: Face[]; env: EnvFilters; details: Record<string, any> }) {
  const x = EXAMPLES[id];
  return (
    <article className="fd-example" aria-labelledby={`fd-ex-${id}`}>
      <header>
        <p className="kicker">Worked NASA example{x.psi.length === 0 && <span className="tag-nopsi"> Not in PSI</span>}</p>
        <h3 id={`fd-ex-${id}`} className="fd-example-title">{x.acronym} <span className="muted">— {x.title}</span></h3>
        <p className="fd-question">{x.question}</p>
      </header>
      <h4>What NASA says it studied</h4>
      {x.studied.map((q) => <Quote key={q.quote} q={q} />)}
      <h4>Through the tetrahedron <EvidenceLabel text="Curator classification (team framing)" /></h4>
      <table className="facts fd-map"><tbody>{FACES.map((f) => (
        <tr key={f} className={selected.includes(f) ? "fd-map-on" : undefined}>
          <th scope="row">{FACE_INFO[f].name}</th><td className={x.faces[f] ? undefined : "cond-unknown"}>{x.faces[f] || "Not described in the source"}</td></tr>))}
      </tbody></table>
      {x.psi.length === 0 ? (
        <>
          <Notice>{x.inPsiNote}</Notice>
          <p className="small">Closest evidence in PSI: <Link href={`/explorer${qs({ material: "PMMA", topic: "extinction" })}`}>PMMA extinction studies</Link>
            {" · "}<Link href="/investigations/psi-25">BASS-II (PMMA films in forced flow)</Link>
            {" · "}<Link href="/beyond-psi">Other NASA programs beyond PSI</Link></p>
        </>
      ) : (
        <>
          <h4>NASA test records</h4>
          {x.psi.map((p) => <PsiEvidence key={p} id={p} env={env} details={details} />)}
          {id === "saffire" && <ScaleTable details={details} />}
        </>
      )}
    </article>
  );
}

function GravityExplainer() {
  return (
    <section className="fd-gravity" aria-labelledby="fd-gravity-h">
      <h2 id="fd-gravity-h">Why microgravity changes fire</h2>
      <div className="fd-gravity-grid">
        <figure>
          <svg viewBox="0 0 160 170" role="img" aria-label="On Earth: a tall teardrop-shaped candle flame with hot gas rising and fresh air drawn in from below">
            <rect x="70" y="120" width="20" height="44" fill="#C9D4EC" />
            <path d="M80 30 C 98 70, 100 100, 80 120 C 60 100, 62 70, 80 30 Z" fill="#E43700" />
            <path d="M80 70 C 88 90, 88 104, 80 114 C 72 104, 72 90, 80 70 Z" fill="#EAFE07" />
            {[50, 110].map((x) => <path key={x} d={`M${x} 60 v-40 m-6 8 l6 -8 l6 8`} stroke="#A9B8DB" strokeWidth="2" fill="none" />)}
            {[40, 120].map((x) => <path key={x} d={`M${x} 140 L${x < 80 ? 62 : 98} 118`} stroke="#2E96F5" strokeWidth="2" fill="none" markerEnd="" />)}
          </svg>
          <figcaption><strong>On Earth</strong>: hot gas is lighter and rises, pulling fresh air in from below. That buoyant flow stretches the flame upward and keeps feeding it oxygen.</figcaption>
        </figure>
        <figure>
          <svg viewBox="0 0 160 170" role="img" aria-label="In freefall: a rounded, nearly spherical flame around the fuel with oxygen arriving slowly from every side">
            <circle cx="80" cy="85" r="46" fill="#0960E1" opacity=".55" />
            <circle cx="80" cy="85" r="34" fill="#0042A6" />
            <circle cx="80" cy="85" r="9" fill="#C9D4EC" />
            {[0, 60, 120, 180, 240, 300].map((a) => { const r = (a * Math.PI) / 180; const x1 = 80 + 74 * Math.cos(r), y1 = 85 + 74 * Math.sin(r), x2 = 80 + 54 * Math.cos(r), y2 = 85 + 54 * Math.sin(r);
              return <line key={a} x1={x1.toFixed(1)} y1={y1.toFixed(1)} x2={x2.toFixed(1)} y2={y2.toFixed(1)} stroke="#2E96F5" strokeWidth="2" strokeDasharray="3 3" />; })}
          </svg>
          <figcaption><strong>In freefall</strong>: buoyancy all but disappears. Oxygen reaches the flame mostly by slow diffusion or by whatever ventilation flow is imposed, so flames can be rounded, dimmer and surprisingly persistent.</figcaption>
        </figure>
      </div>
      <p className="prose">That is why fire behaviour in a spacecraft cannot simply be read off a candle on Earth, and why the
        experiments below control airflow explicitly. NASA puts it this way:</p>
      <Quote q={BUOYANCY_QUOTE} />
    </section>
  );
}

function FireDynamics() {
  const sp = useSearchParams();
  const router = useRouter();
  const urlFaces = sp.get("faces");
  const [selected, setSelectedState] = useState<Face[]>(() => parseFaces(urlFaces));
  const [env, setEnv] = useState<EnvFilters>(EMPTY_ENV);
  const [details, setDetails] = useState<Record<string, any>>({});

  const featured = journeyFor(selected);
  // Selection lives in state (so rapid clicks never read a stale URL) and is mirrored to ?faces= for sharing / demos.
  const setSelected = (next: Face[] | ((cur: Face[]) => Face[])) => setSelectedState(next);
  useEffect(() => { setSelectedState(parseFaces(urlFaces)); }, [urlFaces]);
  useEffect(() => {
    const want = selected.join(",");
    if (want !== (urlFaces || "")) router.replace(`/fire-dynamics${want ? `?faces=${want}` : ""}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // Fetch the PSI records the featured example needs (Saffire also needs BASS-II for the scale-up table), once each.
  useEffect(() => {
    if (!featured) return;
    const ids = featured === "saffire" ? ["psi-25", ...EXAMPLES.saffire.psi] : EXAMPLES[featured].psi;
    let live = true;
    ids.filter((i) => !details[i]).forEach((i) => {
      api(`/api/investigations/${i}`).then((d) => d, (e) => (e instanceof Error ? e : new Error(String(e))))
        .then((d) => { if (live) setDetails((p) => ({ ...p, [i]: d })); });
    });
    return () => { live = false; };
    // details is read only to skip ids already loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featured]);

  return (
    <>
      <PageHead no="03" kicker="Fire Dynamics" title="Fire Dynamics Explorer">
        Start from the science of fire, then follow it into NASA&apos;s microgravity experiments. Choose faces of the Fire
        Tetrahedron, set environmental conditions, and inspect the test records that NASA actually reported.
      </PageHead>

      <div className="fd-stage">
        <div>
          <FireTetrahedron selected={selected} onToggle={(f) => setSelected((cur) => toggleFace(cur, f))} />
          <div className="fd-paths" role="group" aria-label="Guided pathways">
            <p className="small muted">Guided pathways</p>
            {pathways().map((p) => {
              const active = featured === p.example;
              return (
                <button key={p.example} type="button" className={active ? "fd-path on" : "fd-path secondary"} aria-pressed={active}
                  onClick={() => setSelected(p.faces)}>{p.label} <span aria-hidden="true">→</span> {EXAMPLES[p.example].acronym}</button>
              );
            })}
            {selected.length > 0 && <button type="button" className="secondary fd-path" onClick={() => setSelected([])}>Clear selection</button>}
          </div>
        </div>
        <ElementPanel selected={selected} />
      </div>

      <EnvControls env={env} setEnv={setEnv} />

      <section className="fd-evidence" aria-labelledby="fd-evidence-h">
        <h2 id="fd-evidence-h">NASA evidence</h2>
        {featured ? <ExampleCard id={featured} selected={selected} env={env} details={details} /> : (
          <>
            <p className="muted">{selected.length === 0 ? "No faces selected yet." : `No guided pathway for ${selected.map((f) => FACE_INFO[f].name).join(" + ")}.`}
              {" "}Each worked example below starts from a pair of faces (or all four):</p>
            <ul className="fd-example-list">{EXAMPLE_ORDER.map((id) => {
              const p = pathways().find((q) => q.example === id)!;
              const x = EXAMPLES[id];
              return (
                <li key={id}><button type="button" className="secondary" onClick={() => setSelected(p.faces)}>
                  <strong>{x.acronym}</strong> <span className="muted small">{p.label}</span></button>
                  <span className="small block">{x.question}</span></li>
              );
            })}</ul>
          </>
        )}
      </section>

      <GravityExplainer />
      <Disclaimer />
    </>
  );
}

// useSearchParams needs a Suspense boundary (Next.js App Router), as on the Explorer page.
export default function Page() {
  return <Suspense fallback={<Loading />}><FireDynamics /></Suspense>;
}
