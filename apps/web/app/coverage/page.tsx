"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { humanize } from "@/lib/format";
import { CondCell, ErrorBox, Loading, PageHead } from "@/components/ui";

const EMPTY: Record<string, string> = { pressure_unit: "kPa", airflow_unit: "m/s" };
const EXAMPLE: Record<string, string> = { fuel_class: "solid", oxygen_min: "30", pressure_max: "10.2", pressure_unit: "psi",
  airflow_unit: "m/s", application_scenario: "lunar_habitat" };

export default function Coverage() {
  const [meta, setMeta] = useState<any>(null);
  const [f, setF] = useState<Record<string, string>>(EMPTY);
  const [out, setOut] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>(null);
  useEffect(() => { api("/api/meta").then(setMeta).catch(setErr); }, []);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function run(e?: React.FormEvent, body = f) {
    e?.preventDefault(); setBusy(true); setErr(null);
    const payload: Record<string, any> = {};
    for (const [k, v] of Object.entries(body)) if (v !== "") payload[k] = /_(min|max)$/.test(k) ? Number(v) : v;
    try { setOut(await api("/api/coverage", { method: "POST", body: JSON.stringify(payload) })); } catch (x) { setErr(x); }
    setBusy(false);
  }
  const sel = (k: string, opts: string[] | undefined, label: string, values?: Record<string, string>) => (
    <div><label htmlFor={k}>{label}</label>
      <select id={k} value={f[k] || ""} onChange={(e) => set(k, e.target.value)}>
        <option value="">Any</option>{(values ? Object.keys(values) : opts)?.map((o) => <option key={o} value={o}>{values ? values[o] : humanize(o)}</option>)}
      </select></div>
  );
  const num = (k: string, label: string) => (
    <div><label htmlFor={k}>{label}</label><input id={k} type="number" step="any" min={0} value={f[k] || ""} onChange={(e) => set(k, e.target.value)} /></div>
  );

  return (
    <>
      <PageHead no="02" kicker="Coverage" title="Has this work already been done?">
        Enter the parameters of the study you are planning. The catalog checks every PSI table row and reports
        which investigations document them, where they partially overlap, and what is <em>Not reported</em>.
      </PageHead>
      <form className="console" onSubmit={run} aria-label="Coverage parameters">
        <p className="console-title" aria-hidden="true"><span>Planned study parameters</span><span>PSI rows</span></p>
        <fieldset>
          <legend>Material</legend>
          <div className="console-grid">{sel("fuel_class", meta?.fuel_classes, "Fuel class")}{sel("family", meta?.families, "Family")}
            <div><label htmlFor="material">Material / fuel contains</label><input id="material" value={f.material || ""} onChange={(e) => set("material", e.target.value)} placeholder="PMMA, SIBAL, Nomex, heptane…" /></div></div>
        </fieldset>
        <fieldset>
          <legend>Atmosphere and flow</legend>
          <div className="console-grid">
            {num("oxygen_min", "O2 min (% by volume)")}{num("oxygen_max", "O2 max (% by volume)")}<div />
            {num("pressure_min", "Pressure min")}{num("pressure_max", "Pressure max")}
            <div><label htmlFor="pressure_unit">Pressure unit</label><select id="pressure_unit" value={f.pressure_unit} onChange={(e) => set("pressure_unit", e.target.value)}>{["kPa", "psi", "atm", "bar", "mmHg"].map((u) => <option key={u}>{u}</option>)}</select></div>
            {num("airflow_min", "Airflow min")}{num("airflow_max", "Airflow max")}
            <div><label htmlFor="diluent">Diluent / suppressant present</label><select id="diluent" value={f.diluent || ""} onChange={(e) => set("diluent", e.target.value)}>
              <option value="">Any</option><option value="He">Helium (He)</option><option value="CO2">Carbon dioxide (CO2)</option><option value="N2">Nitrogen (N2)</option></select></div>
            <div><label htmlFor="airflow_unit">Airflow unit</label><select id="airflow_unit" value={f.airflow_unit} onChange={(e) => set("airflow_unit", e.target.value)}>{["m/s", "cm/s", "mm/s"].map((u) => <option key={u}>{u}</option>)}</select></div>
          </div>
        </fieldset>
        <fieldset>
          <legend>Environment and instruments</legend>
          <div className="console-grid">
            <div><label htmlFor="gravity_regime">Gravity regime</label><select id="gravity_regime" value={f.gravity_regime || ""} onChange={(e) => set("gravity_regime", e.target.value)}>
              <option value="">Any</option><option value="microgravity">Microgravity</option><option value="lunar">Lunar (partial gravity)</option><option value="martian">Martian (partial gravity)</option></select></div>
            {sel("measurement_type", meta?.measurement_types, "Measurement type")}
            {sel("platform", meta?.platforms, "Platform")}
            <div><label htmlFor="hardware">Hardware contains</label><input id="hardware" value={f.hardware || ""} onChange={(e) => set("hardware", e.target.value)} placeholder="MSG, CIR, MDCA…" /></div>
            {sel("application_scenario", undefined, "Application scenario (adds relevance score)", meta?.scenarios)}
          </div>
        </fieldset>
        <div className="actions">
          <button type="submit" disabled={busy}>{busy ? "Checking…" : "Check coverage"}</button>
          <button type="button" className="secondary" onClick={() => { setF(EXAMPLE); run(undefined, EXAMPLE); }}>Example: solid material, ≥30 % O2, ≤10.2 psi (lunar)</button>
          <button type="button" className="secondary" onClick={() => { setF(EMPTY); setOut(null); }}>Reset</button>
        </div>
      </form>
      <ErrorBox error={err} />
      {busy && <Loading what="Checking" />}
      {out && (
        <section aria-live="polite" aria-label="Coverage result">
          <p className={`summary-line ${out.results.some((r: any) => r.verdict === "documented_match") ? "summary-match" : "summary-gap"}`}>{out.summary}</p>
          {out.answer_text && <p className="answer">{out.answer_text}</p>}
          {out.caveats.length > 0 && <ul className="caveat-list">{out.caveats.map((c: string) => <li key={c}>{c}</li>)}</ul>}
          <ol className="entries">
            {out.results.filter((r: any) => r.verdict !== "no_documented_overlap").map((r: any) => (
              <li key={r.investigation.id}>
                <article className="entry">
                  <h2 className="entry-acr"><Link href={`/investigations/${r.investigation.id}`}>{r.investigation.acronym}</Link></h2>
                  <div>
                    <div className="verdict-head">
                      <span className={`verdict verdict-${r.verdict}`}>{humanize(r.verdict)}</span>
                      <span className="overlap">overlap <b>{Math.round(r.overlap_score * 100)}%</b>{r.relevance_score !== undefined && <> · relevance <b>{r.relevance_score}</b>/100</>}</span>
                    </div>
                    <ul className="params">
                      {Object.entries(r.parameters).map(([k, v]: any) => <li key={k}><span>{humanize(k)}</span> <span className={`st-${v}`}>{humanize(v)}</span></li>)}
                    </ul>
                    {r.match_notes?.length > 0 && <p className="small gap-top">{r.match_notes.join(" ")}</p>}
                    {r.closest_miss && <p className="small gap-top">Closest miss: CSV record {r.closest_miss.source.row} — {r.closest_miss.why}</p>}
                    {r.unknown_parameters.length > 0 && <p className="small st-unknown gap-top">Not reported for: {r.unknown_parameters.map(humanize).join(", ")}</p>}
                    {r.matching_runs.length > 0 && (
                      <details><summary>{r.n_runs_full_match > 0 ? `${r.n_runs_full_match} PSI table row(s) meet all row-level parameters` : "Closest PSI table rows"}</summary>
                        <div className="table-wrap"><table><thead><tr><th>Run</th><th>Material</th><th>O2</th><th>Pressure</th><th>Airflow</th><th>Row</th></tr></thead>
                          <tbody>{r.matching_runs.map((m: any) => <tr key={m.id}><td className="num">{m.run_label}</td><td>{m.material}</td>
                            <td><CondCell c={m.oxygen} showSource /></td><td><CondCell c={m.pressure} showSource /></td><td><CondCell c={m.airflow} showSource /></td><td className="num">{m.source.row}</td></tr>)}</tbody></table></div>
                      </details>
                    )}
                  </div>
                </article>
              </li>
            ))}
          </ol>
          <details><summary>Investigations with no documented overlap ({out.results.filter((r: any) => r.verdict === "no_documented_overlap").length})</summary>
            <ul className="tags gap-top">{out.results.filter((r: any) => r.verdict === "no_documented_overlap").map((r: any) => <li key={r.investigation.id}>{r.investigation.acronym}</li>)}</ul></details>
        </section>
      )}
    </>
  );
}
