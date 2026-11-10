"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { humanize, readCompare, toggleCompare } from "@/lib/format";
import { CondCell, ErrorBox, EvidenceLabel, Loading, Notice } from "@/components/ui";

export default function Detail() {
  const { id } = useParams<{ id: string }>();
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState<unknown>(null);
  const [cmp, setCmp] = useState<string[]>([]);
  useEffect(() => { api(`/api/investigations/${id}`).then(setD).catch(setErr); setCmp(readCompare()); }, [id]);
  if (err) return <ErrorBox error={err} />;
  if (!d) return <Loading />;
  return (
    <>
      <p className="small"><Link href="/explorer">← Explorer</Link></p>
      <h1>{d.acronym} — {d.title}</h1>
      <div className="chips"><span className="chip">{d.accession}</span><span className="chip">{d.family}</span>
        <span className="chip">{d.fuel_class}</span><span className="chip">{d.gravity_regime}</span>
        <span className="chip">{d.flight_platform}</span></div>
      <p className="small">
        <a href={d.source_url} target="_blank" rel="noreferrer">PSI record ↗</a>
        {d.doi && <> · <a href={`https://doi.org/${d.doi}`} target="_blank" rel="noreferrer">DOI {d.doi} ↗</a></>}
        {" · "}<button className="secondary" onClick={() => setCmp(toggleCompare(d.id))}>{cmp.includes(d.id) ? "Remove from compare" : "Add to compare"}</button>
        {cmp.length >= 2 && <> · <Link href={`/compare?ids=${cmp.join(",")}`}>Compare {cmp.length}</Link></>}
      </p>
      {d.caveats.map((c: string) => <Notice key={c} kind="warn">{c}</Notice>)}
      <h2>Overview <EvidenceLabel text={d.text_label} /></h2>
      <h3>Objectives</h3><p style={{ whiteSpace: "pre-line" }}>{d.objective}</p>
      <h3>Approach / setup</h3><p style={{ whiteSpace: "pre-line" }}>{d.approach}</p>
      <details><summary>Hypothesis and research impacts</summary>
        <h3>Hypothesis</h3><p>{d.hypothesis}</p><h3>Research impacts / Earth benefits</h3><p>{d.research_impacts}</p></details>
      <h2>Key facts</h2>
      <table><tbody>
        <tr><th scope="row">Hardware</th><td>{d.hardware} {d.hardware_link && <a href={d.hardware_link} target="_blank" rel="noreferrer">↗</a>} <EvidenceLabel text="Reported by authors (PSI record)" /></td></tr>
        <tr><th scope="row">Fuel class</th><td>{d.fuel_class} <EvidenceLabel text={d.fuel_class_basis.label} /><blockquote>{d.fuel_class_basis.text}</blockquote>{d.fuel_class_basis.note && <span className="muted small">{d.fuel_class_basis.note}</span>}</td></tr>
        <tr><th scope="row">Gravity regime</th><td>{d.gravity_regime} <span className="muted small">({d.gravity_regime_basis})</span></td></tr>
        <tr><th scope="row">Oxygen</th><td><CondCell c={d.conditions.oxygen} /> <EvidenceLabel text={d.conditions.oxygen.label} /></td></tr>
        <tr><th scope="row">Pressure</th><td><CondCell c={d.conditions.pressure} /> <EvidenceLabel text={d.conditions.pressure.label} /></td></tr>
        <tr><th scope="row">Airflow</th><td><CondCell c={d.conditions.airflow} /> <EvidenceLabel text={d.conditions.airflow.label} /></td></tr>
        <tr><th scope="row">Materials / fuels (PSI table)</th><td>{d.materials.length ? d.materials.join("; ") : "Not reported"}</td></tr>
        <tr><th scope="row">Investigation period</th><td>{d.investigation_period.filter(Boolean).join(" → ") || "Not reported"}</td></tr>
        <tr><th scope="row">License</th><td>{d.license || "Not reported"}</td></tr>
        <tr><th scope="row">Last checked</th><td>{d.last_checked_at}</td></tr>
      </tbody></table>
      <h2>Sensors / measurement types <EvidenceLabel text="Curator classification (rule-based keyword match)" /></h2>
      {Object.keys(d.measurement_types_evidence).length === 0 ? <p className="cond-unknown">Not reported</p> : (
        <ul>{Object.entries(d.measurement_types_evidence).map(([k, v]: any) => <li key={k}><strong>{k}</strong> — <span className="muted small">from {v.field}: “{v.excerpt}”</span></li>)}</ul>
      )}
      <h2>Topics <EvidenceLabel text="Curator classification (rule-based keyword match)" /></h2>
      <ul>{Object.entries(d.topics_evidence).map(([k, v]: any) => <li key={k}><strong>{humanize(k)}</strong> — <span className="muted small">{v.field}: “{v.excerpt}”</span></li>)}</ul>
      {d.brief_facts.length > 0 && (<><h2>Official challenge brief mentions <EvidenceLabel text="Official challenge brief" /></h2>
        {d.brief_facts.map((b: any, i: number) => <blockquote key={i}>{b.text} <a href={b.citation_url} target="_blank" rel="noreferrer">source ↗</a></blockquote>)}</>)}
      <h2>Conditions by test run <span className="muted small">({d.test_runs.length}{d.test_runs_truncated ? "+ shown, truncated" : ""} rows from PSI experimental tables)</span></h2>
      {d.test_runs.length === 0 ? <p className="cond-unknown">No experimental table rows ingested.</p> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Run</th><th>Material / fuel</th><th>Geometry</th><th>O2</th><th>Pressure</th><th>Airflow</th><th>Measured</th><th>Source row</th></tr></thead>
          <tbody>{d.test_runs.map((r: any) => (
            <tr key={r.id}><td>{r.run_label}{r.row_kind !== "test" && <span className="muted small block">{r.row_kind}</span>}</td>
              <td>{r.material}</td><td className="small">{r.sample_geometry}</td>
              <td><CondCell c={r.oxygen} showSource /></td><td><CondCell c={r.pressure} showSource /></td><td><CondCell c={r.airflow} showSource /></td>
              <td className="small">{r.measurements.length ? r.measurements.map((m: any) => `${m.variable.replace(/_/g, " ")}: ${m.value_text} ${m.unit}`).join("; ") : "—"}</td>
              <td className="small">row {r.source.row}</td></tr>))}</tbody>
        </table></div>
      )}
      <h2>Documents</h2>
      <ul>{d.documents.map((x: any) => <li key={x.id}>{x.url ? <a href={x.url} target="_blank" rel="noreferrer">{x.title}</a> : x.title}
        <span className="muted small"> — {x.type}{x.doi ? ` · doi:${x.doi}` : ""}{x.local_path ? ` · local: ${x.local_path}` : ""}</span></li>)}</ul>
      <p className="muted small">Publication titles are as listed in the PSI record; page numbers are not available for PSI metadata.</p>
    </>
  );
}
