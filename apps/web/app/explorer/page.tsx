"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { api, qs } from "@/lib/api";
import { humanize, readCompare, toggleCompare } from "@/lib/format";
import { CondCell, ErrorBox, Loading, Notice, PageHead } from "@/components/ui";

const FIELDS = ["q", "family", "fuel_class", "topic", "measurement_type", "material", "hardware", "platform", "lens", "oxygen_min", "oxygen_max",
  "pressure_min", "pressure_max", "pressure_unit", "airflow_min", "airflow_max", "airflow_unit", "sort", "scenario"] as const;

function Explorer() {
  const sp = useSearchParams();
  const router = useRouter();
  const init: Record<string, string> = {};
  FIELDS.forEach((f) => { const v = sp.get(f); if (v) init[f] = v; });
  const [f, setF] = useState<Record<string, string>>(init);
  const [meta, setMeta] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<unknown>(null);
  const [cmp, setCmp] = useState<string[]>([]);

  useEffect(() => { api("/api/meta").then(setMeta).catch(setErr); setCmp(readCompare()); }, []);
  const key = sp.toString();
  useEffect(() => {
    setData(null); setErr(null);
    // A text search with no explicit sort orders by text match; the default scenario order is
    // query-independent, so every search would otherwise list the same investigations first.
    const params = new URLSearchParams(key);
    if (params.get("q") && !params.get("sort")) params.set("sort", "match");
    api(`/api/investigations?${params.toString()}`).then(setData).catch(setErr);
  }, [key]);

  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const apply = (e?: React.FormEvent) => { e?.preventDefault(); router.push(`/explorer${qs(f)}`); };
  const sel = (k: string, opts: string[] | undefined, label: string) => (
    <><label htmlFor={k}>{label}</label>
      <select id={k} value={f[k] || ""} onChange={(e) => set(k, e.target.value)}>
        <option value="">Any</option>{opts?.map((o) => <option key={o} value={o}>{humanize(o)}</option>)}
      </select></>
  );

  return (
    <>
      <PageHead no="01" kicker="Catalog" title="Explorer">
        Every PSI combustion investigation in the catalog, filterable by what the experimental tables actually report.
      </PageHead>
      <div className="layout-side">
        <form className="console" onSubmit={apply} aria-label="Filters">
          <p className="console-title" aria-hidden="true"><span>Filters</span><span>PSI</span></p>
          <fieldset>
            <legend>Query</legend>
            <label htmlFor="q">Text search</label>
            <input id="q" value={f.q || ""} onChange={(e) => set("q", e.target.value)} placeholder="e.g. PMMA, smoke, BASS-II" />
            <label htmlFor="material">Material / fuel contains</label>
            <input id="material" value={f.material || ""} onChange={(e) => set("material", e.target.value)} placeholder="e.g. PMMA, SIBAL, heptane" />
          </fieldset>
          <fieldset>
            <legend>Classification</legend>
            {sel("family", meta?.families, "Investigation family")}
            {sel("fuel_class", meta?.fuel_classes, "Fuel class")}
            {sel("topic", meta?.topics, "Topic (rule-based tag)")}
            {sel("measurement_type", meta?.measurement_types, "Measurement type")}
            {sel("platform", meta?.platforms, "Platform (ground = lab / modeling)")}
            <label htmlFor="lens">Informs (lens)</label>
            <select id="lens" value={f.lens || ""} onChange={(e) => set("lens", e.target.value)}>
              <option value="">Any</option>{meta && Object.entries(meta.lenses).map(([k, v]: any) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </fieldset>
          <fieldset>
            <legend>Oxygen, % by volume (known values only)</legend>
            <div className="row">
              <input aria-label="Oxygen minimum %" type="number" step="any" min={0} max={100} placeholder="min" value={f.oxygen_min || ""} onChange={(e) => set("oxygen_min", e.target.value)} />
              <input aria-label="Oxygen maximum %" type="number" step="any" min={0} max={100} placeholder="max" value={f.oxygen_max || ""} onChange={(e) => set("oxygen_max", e.target.value)} />
            </div>
          </fieldset>
          <fieldset>
            <legend>Pressure (absolute)</legend>
            <div className="row">
              <input aria-label="Pressure minimum" type="number" step="any" min={0} placeholder="min" value={f.pressure_min || ""} onChange={(e) => set("pressure_min", e.target.value)} />
              <input aria-label="Pressure maximum" type="number" step="any" min={0} placeholder="max" value={f.pressure_max || ""} onChange={(e) => set("pressure_max", e.target.value)} />
              <select aria-label="Pressure unit" value={f.pressure_unit || "kPa"} onChange={(e) => set("pressure_unit", e.target.value)}>
                {["kPa", "psi", "atm", "bar", "mmHg"].map((u) => <option key={u}>{u}</option>)}</select>
            </div>
          </fieldset>
          <fieldset>
            <legend>Airflow / flow velocity</legend>
            <div className="row">
              <input aria-label="Airflow minimum" type="number" step="any" min={0} placeholder="min" value={f.airflow_min || ""} onChange={(e) => set("airflow_min", e.target.value)} />
              <input aria-label="Airflow maximum" type="number" step="any" min={0} placeholder="max" value={f.airflow_max || ""} onChange={(e) => set("airflow_max", e.target.value)} />
              <select aria-label="Airflow unit" value={f.airflow_unit || "m/s"} onChange={(e) => set("airflow_unit", e.target.value)}>
                {["m/s", "cm/s", "mm/s"].map((u) => <option key={u}>{u}</option>)}</select>
            </div>
          </fieldset>
          <fieldset>
            <legend>Ordering</legend>
            {sel("scenario", meta ? Object.keys(meta.scenarios) : [], "Relevance scenario")}
            <label htmlFor="sort">Sort by</label>
            <select id="sort" value={f.sort || (f.q ? "match" : "relevance")} onChange={(e) => set("sort", e.target.value)}>
              <option value="relevance">Most relevant first</option>{f.q && <option value="match">Best text match</option>}<option value="title">Title</option>
              <option value="completeness">Data completeness</option><option value="accession">PSI accession</option>
            </select>
          </fieldset>
          <div className="actions">
            <button type="submit">Apply</button>
            <button type="button" className="secondary" onClick={() => { setF({}); router.push("/explorer"); }}>Reset</button>
          </div>
          <p className="field-hint">Numeric filters only match values listed in PSI experimental tables. “Not reported” never passes a numeric filter.</p>
          <p className="field-hint">For modeling: <a href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/export/modeling.csv`}>every countable table row as CSV</a> (SI units, verbatim cells, flags, source row) · <a href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/export/dictionary`} target="_blank" rel="noreferrer">data dictionary</a></p>
        </form>
        <section aria-live="polite" aria-label="Results">
          <ErrorBox error={err} />
          {cmp.length > 0 && (
            <Notice>{cmp.length} of 3 selected for comparison (<span className="mono">{cmp.map((x) => x.toUpperCase()).join(", ")}</span>).{" "}
              {cmp.length >= 2 ? <><Link href={`/compare?ids=${cmp.join(",")}`}>Compare them side by side</Link> · <a href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/export.csv?ids=${cmp.join(",")}`}>export CSV</a></>
                : <>Tick Compare on one or two more investigations to compare them side by side.</>}</Notice>
          )}
          {!data ? <Loading /> : (
            <>
              {(data.total === 0 || Object.keys(data.applied_filters || {}).some((k) => !k.endsWith("_unit"))) && (
                <p className="result-count">{data.total === 0 ? "No documented work in this catalog matches all filters. That is not proof that none exists."
                  : <><b>{data.total}</b> investigation(s) match your filters.</>}</p>)}
              {data.total > 0 && data.scenario_label && (
                <p className="score-legend muted small">
                  {data.sort === "match" ? (
                    <>
                      Ordered by <b>Best text match</b> for your search. <b>Match rank</b> shows each investigation’s position in the search results (top match is #1).
                      {" "}<b>Scenario rank</b> shows research relevance (0–100) to the <i>{data.scenario_label}</i> scenario.
                    </>
                  ) : (
                    <>
                      <b>Relevance</b> (0–100) is how closely an investigation’s documented fuel, oxygen and pressure, flame behavior, suppression work and habitat use match
                      the <i>{data.scenario_label}</i> scenario. It is research relevance, not a hazard or safety score.
                      {" "}<b>Rank</b> puts investigations with table rows that meet the scenario’s oxygen and pressure target first, then orders by score.
                    </>
                  )}
                  {" "}<b>Data completeness</b> is how many of 10 key catalog fields NASA’s record fills in (objective, approach, hardware, test rows, materials,
                  oxygen, pressure, airflow, measurements, documents). <Link href="/insights">How scores are built</Link>
                </p>)}
              <ol className="entries">
                {data.items.map((c: any, idx: number) => {
                  const resultRank = (data.page ? (data.page - 1) * (data.page_size || 50) : 0) + idx + 1;
                  return (
                    <li key={c.id}>
                      <article className="entry">
                        <h2 className="entry-acr"><Link href={`/investigations/${c.id}${f.q ? `?from_q=${encodeURIComponent(f.q)}` : ""}`}>{c.acronym}</Link>
                          <span className="entry-acc">#{resultRank} · {c.accession}</span></h2>
                        <div>
                          <p className="entry-title">{c.title}</p>
                          <ul className="tags"><li>{c.family}</li><li>{c.fuel_class}</li><li>{c.platform}</li>
                            {c.is_ground && <li className="tag-ground">Ground / modeling</li>}
                            <li>{c.n_test_runs} test rows</li>{c.n_flags > 0 && <li className="tag-flag">{c.n_flags} data flags</li>}</ul>
                          <p className="entry-obj">{c.objective_short}</p>
                          {c.nasa_hint && (
                            <p className="entry-nasa"><span className="entry-nasa-tag">NASA</span>
                              <q>{c.nasa_hint.quote}</q> <a href={c.nasa_hint.citation.url} target="_blank" rel="noreferrer"
                                title={`${c.nasa_hint.citation.title}, ${c.nasa_hint.citation.locator}`}>source ↗</a></p>)}
                          <dl className="cond-strip">
                            <div><dt>O2</dt><dd><CondCell c={c.conditions.oxygen} /></dd></div>
                            <div><dt>Pressure</dt><dd><CondCell c={c.conditions.pressure} /></dd></div>
                            <div><dt>Airflow</dt><dd><CondCell c={c.conditions.airflow} /></dd></div>
                          </dl>
                          <div className="entry-foot">
                            <span className="score-inline" title={data.sort === "match" ? "Full-text search match rank in this query, alongside scenario research relevance." : "Research relevance to the selected scenario, out of 100. Not a hazard score."}>
                              {data.sort === "match" ? (
                                <>Match rank <b>#{resultRank}</b> of {data.total}{c.relevance_rank ? <> · Scenario rank #{c.relevance_rank} (relevance <b>{c.relevance_score}</b>/100)</> : null}</>
                              ) : (
                                c.relevance_rank ? (
                                  <>{(data.total < data.ranked_total || (data.applied_filters && Object.keys(data.applied_filters).length > 0)) ? <>Result <b>#{resultRank}</b> · scenario rank <b>#{c.relevance_rank}</b> of {data.ranked_total}</> : <>Rank <b>#{c.relevance_rank}</b> of {data.ranked_total}</>} · relevance <b>{c.relevance_score}</b>/100</>
                                ) : (
                                  <>Relevance —</>
                                )
                              )}
                              {c.relevance_tier === "documented_at_target" && <span className="tag-target"> · meets target on same row</span>}
                            </span>
                            <span className="score-inline" title="Share of 10 key catalog fields that NASA's record fills in.">
                              Data completeness {Math.round(c.data_completeness * 10)}/10 fields</span>
                            <label className="check">
                              <input type="checkbox" checked={cmp.includes(c.id)} onChange={() => setCmp(toggleCompare(c.id))} />
                              Compare
                            </label>
                            <a href={c.source_url} target="_blank" rel="noreferrer">PSI record ↗</a>
                          </div>
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ol>
            </>
          )}
        </section>
      </div>
    </>
  );
}

export default function Page() {
  return <Suspense fallback={<Loading />}><Explorer /></Suspense>;
}
