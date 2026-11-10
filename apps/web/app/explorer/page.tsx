"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { api, qs } from "@/lib/api";
import { humanize, readCompare, toggleCompare } from "@/lib/format";
import { CondCell, ErrorBox, Loading, Notice } from "@/components/ui";

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
      <h1>Explorer</h1>
      <div className="layout-side">
        <form className="panel" onSubmit={apply} aria-label="Filters">
          <label htmlFor="q">Text search</label>
          <input id="q" value={f.q || ""} onChange={(e) => set("q", e.target.value)} placeholder="e.g. PMMA, smoke, BASS-II" />
          {sel("family", meta?.families, "Investigation family")}
          {sel("fuel_class", meta?.fuel_classes, "Fuel class")}
          {sel("topic", meta?.topics, "Topic (rule-based tag)")}
          {sel("measurement_type", meta?.measurement_types, "Measurement type")}
          <label htmlFor="material">Material / fuel contains</label>
          <input id="material" value={f.material || ""} onChange={(e) => set("material", e.target.value)} placeholder="e.g. PMMA, SIBAL, heptane" />
          <fieldset style={{ border: 0, padding: 0, marginTop: 8 }}>
            <legend className="muted small">Oxygen, % by volume (known values only)</legend>
            <div className="row">
              <input aria-label="Oxygen minimum %" type="number" step="any" min={0} max={100} placeholder="min" value={f.oxygen_min || ""} onChange={(e) => set("oxygen_min", e.target.value)} />
              <input aria-label="Oxygen maximum %" type="number" step="any" min={0} max={100} placeholder="max" value={f.oxygen_max || ""} onChange={(e) => set("oxygen_max", e.target.value)} />
            </div>
          </fieldset>
          <fieldset style={{ border: 0, padding: 0 }}>
            <legend className="muted small">Pressure (absolute)</legend>
            <div className="row">
              <input aria-label="Pressure minimum" type="number" step="any" min={0} placeholder="min" value={f.pressure_min || ""} onChange={(e) => set("pressure_min", e.target.value)} />
              <input aria-label="Pressure maximum" type="number" step="any" min={0} placeholder="max" value={f.pressure_max || ""} onChange={(e) => set("pressure_max", e.target.value)} />
              <select aria-label="Pressure unit" value={f.pressure_unit || "kPa"} onChange={(e) => set("pressure_unit", e.target.value)}>
                {["kPa", "psi", "atm", "bar"].map((u) => <option key={u}>{u}</option>)}</select>
            </div>
          </fieldset>
          <fieldset style={{ border: 0, padding: 0 }}>
            <legend className="muted small">Airflow / flow velocity</legend>
            <div className="row">
              <input aria-label="Airflow minimum" type="number" step="any" min={0} placeholder="min" value={f.airflow_min || ""} onChange={(e) => set("airflow_min", e.target.value)} />
              <input aria-label="Airflow maximum" type="number" step="any" min={0} placeholder="max" value={f.airflow_max || ""} onChange={(e) => set("airflow_max", e.target.value)} />
              <select aria-label="Airflow unit" value={f.airflow_unit || "m/s"} onChange={(e) => set("airflow_unit", e.target.value)}>
                {["m/s", "cm/s", "mm/s"].map((u) => <option key={u}>{u}</option>)}</select>
            </div>
          </fieldset>
          {sel("scenario", meta ? Object.keys(meta.scenarios) : [], "Relevance scenario")}
          <label htmlFor="sort">Sort by</label>
          <select id="sort" value={f.sort || "relevance"} onChange={(e) => set("sort", e.target.value)}>
            <option value="relevance">Relevance (scenario)</option><option value="title">Title</option>
            <option value="completeness">Data completeness</option><option value="accession">PSI accession</option>
          </select>
          <div className="row" style={{ marginTop: 14 }}>
            <button type="submit">Apply</button>
            <button type="button" className="secondary" onClick={() => { setF({}); router.push("/explorer"); }}>Reset</button>
          </div>
          <p className="muted small">Numeric filters only match values listed in PSI experimental tables. “Not reported” never passes a numeric filter.</p>
        </form>
        <section aria-live="polite">
          <ErrorBox error={err} />
          {cmp.length > 0 && (
            <Notice>Selected for comparison: {cmp.join(", ")} — <Link href={`/compare?ids=${cmp.join(",")}`}>compare ({cmp.length}/3)</Link>
              {cmp.length >= 2 && <> · <a href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/export.csv?ids=${cmp.join(",")}`}>export CSV</a></>}</Notice>
          )}
          {!data ? <Loading /> : (
            <>
              <p className="muted">{data.total} investigation(s) match. {data.total === 0 && "No documented work in this catalog matches all filters — this is not proof that none exists."}</p>
              <div className="grid">
                {data.items.map((c: any) => (
                  <article className="card" key={c.id}>
                    <h3><Link href={`/investigations/${c.id}`}>{c.acronym}</Link> <span className="muted small">{c.accession}</span></h3>
                    <div className="small">{c.title}</div>
                    <div className="chips"><span className="chip">{c.family}</span><span className="chip">{c.fuel_class}</span>
                      <span className="chip">{c.gravity_regime}</span><span className="chip">{c.n_test_runs} table rows</span></div>
                    <p className="small muted" style={{ margin: 0 }}>{c.objective_short}</p>
                    <table><tbody>
                      <tr><th scope="row">O2</th><td><CondCell c={c.conditions.oxygen} /></td></tr>
                      <tr><th scope="row">Pressure</th><td><CondCell c={c.conditions.pressure} /></td></tr>
                      <tr><th scope="row">Airflow</th><td><CondCell c={c.conditions.airflow} /></td></tr>
                    </tbody></table>
                    <div className="small">Relevance: <strong>{c.relevance_score ?? "—"}</strong> · completeness {Math.round(c.data_completeness * 100)}%</div>
                    <label className="small" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input type="checkbox" style={{ width: "auto" }} checked={cmp.includes(c.id)} onChange={() => setCmp(toggleCompare(c.id))} />
                      Compare
                    </label>
                    <a className="small" href={c.source_url} target="_blank" rel="noreferrer">PSI record ↗</a>
                  </article>
                ))}
              </div>
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
