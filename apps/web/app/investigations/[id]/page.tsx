"use client";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { humanize, readCompare, toggleCompare } from "@/lib/format";
import { CondCell, ErrorBox, EvidenceLabel, Loading, Notice } from "@/components/ui";
import { Flags } from "@/components/Citations";
import NasaSummary from "@/components/NasaSummary";
import InvestigationOverview from "@/components/InvestigationOverview";

const fmtBytes = (b?: number) => (b ? (b >= 1e12 ? `${(b / 1e12).toFixed(2)} TB` : b >= 1e9 ? `${(b / 1e9).toFixed(2)} GB` : `${(b / 1e6).toFixed(1)} MB`) : "—");

function Detail() {
  const { id } = useParams<{ id: string }>();
  const sp = useSearchParams();
  const fromQ = sp.get("q") || sp.get("from_q") || null;
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState<unknown>(null);
  const [cmp, setCmp] = useState<string[]>([]);
  useEffect(() => { api(`/api/investigations/${id}`).then(setD).catch(setErr); setCmp(readCompare()); }, [id]);
  if (err) return <ErrorBox error={err} />;
  if (!d) return <Loading />;
  return (
    <>
      <p className="back"><Link href={fromQ ? `/explorer?q=${encodeURIComponent(fromQ)}` : "/explorer"}>← Explorer{fromQ ? ` · "${fromQ}"` : ""}</Link></p>
      <header className="dossier-head">
        <h1 className="acr-xl"><span className="visually-hidden">{d.acronym} — {d.title}</span><span aria-hidden="true">{d.acronym}</span></h1>
        <p className="title" aria-hidden="true">{d.title}</p>
        <ul className="meta-strip" aria-label="Record metadata"><li>{d.accession}</li><li>{d.family}</li>
          <li>{d.fuel_class}</li><li>{d.platform}</li>
          {d.is_ground && <li className="tag-ground">Ground / modeling study</li>}
          {d.version?.version && <li>Version {d.version.version} · released {d.version.release_date}{d.version.modified_date ? ` · modified ${d.version.modified_date}` : ""}</li>}</ul>
      </header>
      <p className="detail-actions">
        <a href={d.source_url} target="_blank" rel="noreferrer">PSI record ↗</a>
        {d.doi && <> · <a href={`https://doi.org/${d.doi}`} target="_blank" rel="noreferrer">DOI {d.doi} ↗</a></>}
        {" · "}<button className="secondary" onClick={() => setCmp(toggleCompare(d.id))}>{cmp.includes(d.id) ? "Remove from compare" : "Add to compare"}</button>
        {cmp.length >= 2 && <> · <Link href={`/compare?ids=${cmp.join(",")}`}>Compare {cmp.length}</Link></>}
      </p>
      {d.caveats.map((c: string) => <Notice key={c} kind="warn">{c}</Notice>)}
      {d.platform_note && <Notice>{d.platform_note}</Notice>}

      {/* ── AI Overview / Summary ── */}
      <InvestigationOverview invId={id} query={fromQ} />

      <section className="dossier">
        <p className="dossier-no">What this record tells us <EvidenceLabel text={d.interpretation.label} /></p>
        <ul className="interp">{d.interpretation.sentences.map((x: any, i: number) => <li key={i}>{x.text}</li>)}</ul>
      </section>
      <NasaSummary s={d.nasa_program} acronym={d.acronym} />
      {d.relationships?.length > 0 && (<><h2>{d.is_ground ? "Reuses flight data of" : "Related in PSI"} <EvidenceLabel text="PSI record (related_glds)" /></h2>
        <ul className="evidence-list">{d.relationships.map((r: any) => <li key={r.to}><Link href={`/investigations/${r.to.toLowerCase()}`}>{r.to_acronym || r.to}</Link>
          <span className="muted small"> {r.to} · {r.kind.replace(/_/g, " ")}</span>{r.quote && <blockquote>{r.quote.slice(0, 300)}</blockquote>}</li>)}</ul></>)}
      {Object.keys(d.lenses_evidence || {}).length > 0 && (<><h2>Informs <EvidenceLabel text="Curator classification (rule-based, quoted)" /></h2>
        <ul className="evidence-list">{Object.entries(d.lenses_evidence).map(([k, v]: any) => <li key={k}><strong>{v.label}</strong>
          <span className="muted small"> {v.source}: “{v.excerpt}”</span> {v.url && <a href={v.url} target="_blank" rel="noreferrer">↗</a>}</li>)}</ul></>)}
      {d.images?.length > 0 && (<><h2>Representative images <EvidenceLabel text="Hotlinked from PSI" /></h2>
        <div className="gallery">{d.images.map((im: any) => (
          <figure key={im.url}><img src={im.url} alt={im.caption} loading="lazy" referrerPolicy="no-referrer" />
            <figcaption>{im.caption} <span className="muted small">· {im.credit}</span></figcaption></figure>))}</div></>)}
      <h2>Overview <EvidenceLabel text={d.text_label} /></h2>
      <h3>Objectives</h3><p className="prose">{d.objective}</p>
      <h3>Approach / setup</h3><p className="prose">{d.approach}</p>
      <details><summary>Hypothesis and research impacts</summary>
        <h3>Hypothesis</h3><p className="prose">{d.hypothesis}</p><h3>Research impacts / Earth benefits</h3><p className="prose">{d.research_impacts}</p></details>
      <h2>Key facts</h2>
      <table className="facts"><tbody>
        <tr><th scope="row">Hardware</th><td>{d.hardware} {d.hardware_link && <a href={d.hardware_link} target="_blank" rel="noreferrer">↗</a>} <EvidenceLabel text="Reported by authors (PSI record)" /></td></tr>
        <tr><th scope="row">Fuel class</th><td>{d.fuel_class} <EvidenceLabel text={d.fuel_class_basis.label} /><blockquote>{d.fuel_class_basis.text}</blockquote>{d.fuel_class_basis.note && <span className="muted small">{d.fuel_class_basis.note}</span>}</td></tr>
        <tr><th scope="row">Gravity regime</th><td>{d.gravity_regime} <span className="muted small">({d.gravity_regime_basis})</span></td></tr>
        <tr><th scope="row">Oxygen</th><td><CondCell c={d.conditions.oxygen} /> <EvidenceLabel text={d.conditions.oxygen.label} /></td></tr>
        <tr><th scope="row">Pressure</th><td><CondCell c={d.conditions.pressure} /> <EvidenceLabel text={d.conditions.pressure.label} /></td></tr>
        <tr><th scope="row">Airflow</th><td><CondCell c={d.conditions.airflow} /> <EvidenceLabel text={d.conditions.airflow.label} /></td></tr>
        <tr><th scope="row">Materials / fuels (PSI table)</th><td>{d.materials.length ? d.materials.join("; ") : "Not reported"}</td></tr>
        <tr><th scope="row">Investigation period</th><td>{d.investigation_period.filter(Boolean).join(" → ") || "Not reported"}</td></tr>
        <tr><th scope="row">License</th><td>{d.license || "Not reported"}</td></tr>
        <tr><th scope="row">Last checked</th><td className="num">{d.last_checked_at}</td></tr>
      </tbody></table>
      <h2>Sensors / measurement types <EvidenceLabel text="Curator classification (rule-based keyword match)" /></h2>
      {Object.keys(d.measurement_types_evidence).length === 0 ? <p className="cond-unknown">Not reported</p> : (
        <ul className="evidence-list">{Object.entries(d.measurement_types_evidence).map(([k, v]: any) => <li key={k}><strong>{k}</strong> <span className="muted small">from {v.field}: “{v.excerpt}”</span></li>)}</ul>
      )}
      <h2>Topics <EvidenceLabel text="Curator classification (rule-based keyword match)" /></h2>
      <ul className="evidence-list">{Object.entries(d.topics_evidence).map(([k, v]: any) => <li key={k}><strong>{humanize(k)}</strong> <span className="muted small">{v.field}: “{v.excerpt}”</span></li>)}</ul>
      {d.brief_facts.length > 0 && (<><h2>Official challenge brief mentions <EvidenceLabel text="Official challenge brief" /></h2>
        {d.brief_facts.map((b: any, i: number) => <blockquote key={i}>{b.text} <a href={b.citation_url} target="_blank" rel="noreferrer">source ↗</a></blockquote>)}</>)}
      {d.variables?.length > 0 && (<><h2>Variables: varied vs held constant <EvidenceLabel text="Computed from PSI tables" /></h2>
        {d.variables.map((t: any) => (<div key={t.table} className="vars"><h3 className="small">{t.subtable || t.table} <span className="muted">({t.n_rows} rows)</span></h3>
          <table className="facts"><tbody>
            <tr><th scope="row">Varied</th><td>{t.varied.map((v: any) => <span key={v.column} className="block small"><b>{v.column}</b>: {v.numeric ? `${v.min} to ${v.max}` : `${v.n_distinct} values (e.g. ${v.values.slice(0, 4).join(", ")})`}</span>)}</td></tr>
            <tr><th scope="row">Constant</th><td className="small">{t.constant.length ? t.constant.map((v: any) => `${v.column} = ${v.values?.[0] ?? v.min}`).join("; ") : "—"}</td></tr>
            {t.empty?.length > 0 && <tr><th scope="row">Blank in source</th><td className="small">{t.empty.join(", ")}</td></tr>}
          </tbody></table></div>))}</>)}
      {(d.flags?.length > 0 || d.table_flags?.length > 0) && (<><h2>Data-quality flags <span className="muted small">({(d.flags?.length || 0) + (d.table_flags?.length || 0)}; shown verbatim, never silently corrected)</span></h2>
        <details open={d.flags.length <= 12}><summary>Show flags</summary><Flags flags={[...(d.table_flags || []), ...d.flags]} /></details></>)}
      <h2>Conditions by test run <span className="muted small">({d.test_runs.length}{d.test_runs_truncated ? "+ shown, truncated" : ""} rows from PSI experimental tables)</span></h2>
      {d.test_runs.length === 0 ? <p className="cond-unknown">No experimental table rows ingested.</p> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Run</th><th>Table</th><th>Material / fuel</th><th>Geometry</th><th>O2</th><th>Pressure</th><th>Airflow</th><th>Measured</th><th>Source row</th></tr></thead>
          <tbody>{d.test_runs.map((r: any) => (
            <tr key={r.id}><td className="num">{r.run_label}{r.row_kind !== "test" && <span className="muted small block">{r.row_kind.replace(/_/g, " ")}</span>}
              {r.flags?.length > 0 && <span className="label label-nr small block">{r.flags.length} flag(s)</span>}</td>
              <td className="small">{r.subtable || "—"}{r.oxygen_is_stream && <span className="muted block">O2 = burner stream</span>}</td>
              <td>{r.material}{r.material_normalized && r.material_normalized !== r.material && <span className="muted small block">alias: {r.material_normalized}</span>}</td><td className="small">{r.sample_geometry}</td>
              <td><CondCell c={r.oxygen} showSource /></td><td><CondCell c={r.pressure} showSource /></td><td><CondCell c={r.airflow} showSource /></td>
              <td className="small">{r.measurements.length ? r.measurements.map((m: any) => `${m.variable.replace(/_/g, " ")}: ${m.value_text} ${m.unit}`).join("; ") : "—"}</td>
              <td className="num">row {r.source.row}</td></tr>))}</tbody>
        </table></div>
      )}
      {d.files && (<><h2>Data files and documents <span className="muted small">({d.files.listed_files} files listed, {fmtBytes(d.files.total_file_size_bytes)})</span></h2>
        <p className="muted small">{d.files.listing_note}</p>
        <table className="facts"><tbody>{Object.entries(d.files.categories || {}).map(([k, v]: any) => <tr key={k}><th scope="row">{k}</th><td className="num">{v.files} files · {fmtBytes(v.bytes)}</td></tr>)}</tbody></table>
        <details><summary>Folder tree</summary><ul className="tree">{(d.files.tree || []).slice(0, 200).map((t: any) => <li key={t.path} className="mono small">{t.path} <span className="muted">({t.files})</span></li>)}</ul></details></>)}
      <h2>Documents</h2>
      <ul className="docs">{d.documents.map((x: any) => <li key={x.id}>{x.url ? <a href={x.url} target="_blank" rel="noreferrer">{x.title}</a> : x.title}
        <span className="muted small"> — {x.type}{x.doi ? ` · doi:${x.doi}` : ""}{x.local_path ? ` · local: ${x.local_path}` : ""}</span></li>)}</ul>
      <p className="muted small">Publication titles are as listed in the PSI record; page numbers are not available for PSI metadata.</p>
    </>
  );
}

// useSearchParams needs a Suspense boundary (Next.js App Router), as on the Explorer, Compare and Insights pages.
export default function Page() {
  return <Suspense fallback={<Loading />}><Detail /></Suspense>;
}
