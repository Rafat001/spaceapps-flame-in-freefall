"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { api, qs } from "@/lib/api";
import { humanize, readCompare, toggleCompare } from "@/lib/format";
import { CondCell, ErrorBox, Loading, Notice, PageHead } from "@/components/ui";

const FIELDS = ["q", "family", "fuel_class", "topic", "measurement_type", "material", "hardware", "oxygen_min", "oxygen_max",
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
    api(`/api/investigations?${key}`).then(setData).catch(setErr);
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
                {["kPa", "psi", "atm", "bar"].map((u) => <option key={u}>{u}</option>)}</select>
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
            <select id="sort" value={f.sort || "relevance"} onChange={(e) => set("sort", e.target.value)}>
              <option value="relevance">Relevance (scenario)</option><option value="title">Title</option>
              <option value="completeness">Data completeness</option><option value="accession">PSI accession</option>
            </select>
          </fieldset>
          <div className="actions">
            <button type="submit">Apply</button>
            <button type="button" className="secondary" onClick={() => { setF({}); router.push("/explorer"); }}>Reset</button>
          </div>
          <p className="field-hint">Numeric filters only match values listed in PSI experimental tables. “Not reported” never passes a numeric filter.</p>
        </form>
        <section aria-live="polite" aria-label="Results">
          <ErrorBox error={err} />
          {cmp.length > 0 && (
            <Notice>Selected for comparison: <span className="mono">{cmp.join(", ")}</span> — <Link href={`/compare?ids=${cmp.join(",")}`}>compare ({cmp.length}/3)</Link>
              {cmp.length >= 2 && <> · <a href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/export.csv?ids=${cmp.join(",")}`}>export CSV</a></>}</Notice>
          )}
          {!data ? <Loading /> : (
            <>
              <p className="result-count"><b>{data.total}</b> investigation(s) match. {data.total === 0 && "No documented work in this catalog matches all filters — this is not proof that none exists."}</p>
              <ol className="entries">
                {data.items.map((c: any) => (
                  <li key={c.id}>
                    <article className="entry">
                      <h2 className="entry-acr"><Link href={`/investigations/${c.id}`}>{c.acronym}</Link>
                        <span className="entry-acc">{c.accession}</span></h2>
                      <div>
                        <p className="entry-title">{c.title}</p>
                        <ul className="tags"><li>{c.family}</li><li>{c.fuel_class}</li><li>{c.gravity_regime}</li><li>{c.n_test_runs} table rows</li></ul>
                        <p className="entry-obj">{c.objective_short}</p>
                        <dl className="cond-strip">
                          <div><dt>O2</dt><dd><CondCell c={c.conditions.oxygen} /></dd></div>
                          <div><dt>Pressure</dt><dd><CondCell c={c.conditions.pressure} /></dd></div>
                          <div><dt>Airflow</dt><dd><CondCell c={c.conditions.airflow} /></dd></div>
                        </dl>
                        <div className="entry-foot">
                          <span className="score-inline">Relevance <b>{c.relevance_score ?? "—"}</b> · completeness {Math.round(c.data_completeness * 100)}%</span>
                          <label className="check">
                            <input type="checkbox" checked={cmp.includes(c.id)} onChange={() => setCmp(toggleCompare(c.id))} />
                            Compare
                          </label>
                          <a href={c.source_url} target="_blank" rel="noreferrer">PSI record ↗</a>
                        </div>
                      </div>
                    </article>
                  </li>
                ))}
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
