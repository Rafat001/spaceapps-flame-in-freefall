"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, Suspense, useEffect, useState } from "react";
import { api, qs, API_BASE } from "@/lib/api";
import { humanize, readCompare, toggleCompare } from "@/lib/format";
import { PointsLine, RankingExplainer, TargetAtmosphere } from "@/components/RankingExplainer";
import { CondCell, ErrorBox, EvidenceLabel, Loading, Notice, PageHead } from "@/components/ui";
import { Markdown, citeHref } from "@/components/Markdown";
import { assistantHeaders } from "@/lib/byok";

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
  const [searchAnswer, setSearchAnswer] = useState<any>(null);
  const [answerLoading, setAnswerLoading] = useState(false);

  const activeQuery = sp.get("q") || "";

  useEffect(() => { api("/api/meta").then(setMeta).catch(setErr); setCmp(readCompare()); }, []);
  const key = sp.toString();
  useEffect(() => {
    let live = true;
    setData(null); setErr(null);
    // A text search with no explicit sort orders by text match; the default scenario order is
    // query-independent, so every search would otherwise list the same investigations first.
    const params = new URLSearchParams(key);
    if (params.get("q") && !params.get("sort")) params.set("sort", "match");
    api(`/api/investigations?${params.toString()}`)
      .then((d) => { if (live) setData(d); })
      .catch((e) => { if (live) setErr(e); });
    return () => { live = false; };
  }, [key]);

  // The AI synthesis is fetched in parallel and never blocks the result list, which renders as soon as it arrives.
  // Repeated searches are served from the API's answer cache (no new AI call).
  useEffect(() => {
    let live = true;
    if (!activeQuery.trim()) {
      setSearchAnswer(null);
      setAnswerLoading(false);
      return;
    }
    setAnswerLoading(true);
    setSearchAnswer(null);
    const headers = assistantHeaders(API_BASE);
    api("/api/ask", {
      method: "POST",
      body: JSON.stringify({ question: activeQuery.trim() }),
      headers: headers as Record<string, string>,
    })
      .then((res) => { if (live) setSearchAnswer(res); })
      .catch(() => { if (live) setSearchAnswer(null); })
      .finally(() => { if (live) setAnswerLoading(false); });
    return () => { live = false; };
  }, [activeQuery]);

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
            {sel("scenario", meta ? Object.keys(meta.scenarios) : [], "Scenario")}
            <label htmlFor="sort">Sort by</label>
            <select id="sort" value={f.sort || (f.q ? "match" : "relevance")} onChange={(e) => set("sort", e.target.value)}>
              <option value="relevance">Best scenario fit first</option>{f.q && <option value="match">Best text match</option>}<option value="title">Title</option>
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
                      {" "}<b>Scenario rank</b> is the investigation’s position by <b>scenario fit</b> (0–100) for the <i>{data.scenario_label}</i> scenario.
                    </>
                  ) : (
                    <>
                      <b>Scenario fit</b> (0–100) scores how closely an investigation’s PSI test rows match the <i>{data.scenario_label}</i> atmosphere (oxygen and pressure,
                      ideally on the same row), which materials it tested, and its flame-behaviour and detection/suppression evidence. It is research fit, not a hazard or safety score.
                      {" "}<b>Rank</b> follows the score alone, highest first (ties go to more rows at the target, then data completeness).
                    </>
                  )}
                  {" "}<b>Data completeness</b> is how many of 10 key catalog fields NASA’s record fills in (objective, approach, hardware, test rows, materials,
                  oxygen, pressure, airflow, measurements, documents). <Link href={`/insights?scenario=${data.scenario}`}>Full ranking with evidence</Link>
                </p>)}
              {data.total > 0 && data.ranking && (<>
                <TargetAtmosphere atm={data.ranking.scenario_atmosphere} />
                <RankingExplainer lines={data.ranking.explainer} />
              </>)}
              {activeQuery && (
                <div className="search-synthesis" aria-live="polite">
                  <div className="search-synthesis-head">
                    <h3 className="search-synthesis-title">
                      <span>Synthesized findings for</span>
                      <span className="search-synthesis-query">“{activeQuery}”</span>
                    </h3>
                    <EvidenceLabel text={searchAnswer?.answer_label || "NASA PSI Evidence Synthesis"} />
                  </div>

                  {answerLoading && (
                    <div className="overview-shimmer" aria-busy="true">
                      <p className="muted small" style={{ marginBottom: 8 }}>Searching literature and synthesizing experimental records…</p>
                      <div className="shimmer-line shimmer-line--long" />
                      <div className="shimmer-line shimmer-line--mid" />
                      <div className="shimmer-line shimmer-line--long" />
                      <div className="shimmer-line shimmer-line--short" />
                    </div>
                  )}

                  {!answerLoading && searchAnswer && (
                    <>
                      {searchAnswer.llm_notice && <Notice kind="warn">{searchAnswer.llm_notice}</Notice>}
                      {searchAnswer.answer ? (
                        <div className="search-synthesis-body md">
                          <Markdown text={searchAnswer.answer} citations={searchAnswer.citations} />
                        </div>
                      ) : searchAnswer.template_summary ? (
                        <p className="search-synthesis-body">{searchAnswer.template_summary}</p>
                      ) : searchAnswer.direct?.answer ? (
                        <div className="search-synthesis-body">{searchAnswer.direct.answer}</div>
                      ) : (
                        <p className="muted small">No direct written synthesis returned. See matching experimental records below.</p>
                      )}

                      {searchAnswer.answer && (searchAnswer.citations || []).length > 0 && (
                        <details className="search-synthesis-sources">
                          <summary>Sources ({searchAnswer.citations.length})</summary>
                          <ol>
                            {searchAnswer.citations.map((c: any) => {
                              const to = citeHref(c);
                              const name = [c.acronym || "Challenge brief", c.section].filter(Boolean).join(" · ");
                              return (
                                <li key={c.ref} id={`cite-${c.ref}`}>
                                  <span className="cite-ref">[{c.ref}]</span>{" "}
                                  {to ? (/^https?:/.test(to)
                                    ? <a href={to} target="_blank" rel="noreferrer">{name} ↗</a>
                                    : <Link href={to}>{name}</Link>) : name}
                                  {c.locator && <span className="muted small"> · {c.locator}</span>}
                                  {c.label && <span className="muted small"> · {c.label}</span>}
                                </li>
                              );
                            })}
                          </ol>
                        </details>
                      )}

                      {(() => {
                        const invMap = new Map<string, { id: string; acronym: string }>();
                        (searchAnswer.citations || []).forEach((c: any) => {
                          if (c.investigation_id && c.acronym && !invMap.has(c.investigation_id)) {
                            invMap.set(c.investigation_id, { id: c.investigation_id, acronym: c.acronym });
                          }
                        });
                        const citedInvs = Array.from(invMap.values());
                        if (!citedInvs.length) return null;
                        return (
                          <div className="search-synthesis-chips">
                            <span className="search-synthesis-chips-label">Relevant investigations:</span>
                            {citedInvs.map((inv) => (
                              <Link
                                key={inv.id}
                                href={`/investigations/${inv.id}?q=${encodeURIComponent(activeQuery)}`}
                                className="search-chip"
                                title={`Open AI Overview for ${inv.acronym}`}
                              >
                                {inv.acronym} ↗
                              </Link>
                            ))}
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
              )}

              <ol className="entries">
                {data.items.map((c: any, idx: number) => {
                  const resultRank = (data.page ? (data.page - 1) * (data.page_size || 50) : 0) + idx + 1;
                  const itemQuery = activeQuery || f.q;
                  const itemHref = `/investigations/${c.id}${itemQuery ? `?q=${encodeURIComponent(itemQuery)}` : ""}`;
                  return (
                    <Fragment key={c.id}>
                    <li>
                      <article className="entry">
                        <h2 className="entry-acr">
                          <Link href={itemHref}>{c.acronym}</Link>
                          <span className="entry-acc">#{resultRank} · {c.accession}</span>
                          {itemQuery && <span className="entry-match-tag">Match #{resultRank} for “{itemQuery}”</span>}
                        </h2>
                        <div>
                          <p className="entry-title">
                            <Link href={itemHref} style={{ color: "inherit", textDecoration: "none" }}>{c.title}</Link>
                          </p>
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
                          {c.relevance_reason && (
                            <p className="entry-reason"><span className="ranked-reason">{c.relevance_reason}</span>
                              <PointsLine parts={c.relevance_parts} /></p>)}
                          <div className="entry-foot">
                            <span className="score-inline" title="Scenario fit to the selected scenario, out of 100. Not a hazard score.">
                              {data.sort === "match" ? (
                                <>Match rank <b>#{resultRank}</b> of {data.total}{c.relevance_rank ? <> · Scenario rank #{c.relevance_rank} (scenario fit <b>{c.relevance_score}</b>/100)</> : null}</>
                              ) : (
                                c.relevance_rank ? (
                                  <>{(data.total < data.ranked_total || (data.applied_filters && Object.keys(data.applied_filters).length > 0)) ? <>Result <b>#{resultRank}</b> · scenario rank <b>#{c.relevance_rank}</b> of {data.ranked_total}</> : <>Rank <b>#{c.relevance_rank}</b> of {data.ranked_total}</>} · scenario fit <b>{c.relevance_score}</b>/100</>
                                ) : (
                                  <>Scenario fit —</>
                                )
                              )}
                            </span>
                            <span className="score-inline" title="Share of 10 key catalog fields that NASA's record fills in.">
                              Data completeness {Math.round(c.data_completeness * 10)}/10 fields</span>
                            <label className="check">
                              <input type="checkbox" checked={cmp.includes(c.id)} onChange={() => setCmp(toggleCompare(c.id))} />
                              Compare
                            </label>
                            <Link href={itemHref} className="entry-cta-overview">
                              View overview{itemQuery ? ` for “${itemQuery}”` : ""} →
                            </Link>
                            <a href={c.source_url} target="_blank" rel="noreferrer">PSI record ↗</a>
                          </div>
                        </div>
                      </article>
                    </li>
                    </Fragment>
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
