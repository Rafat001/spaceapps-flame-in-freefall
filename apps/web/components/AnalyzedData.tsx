"use client";
import { EvidenceLabel, Notice } from "@/components/ui";

// PSI "Analyzed Data" files (CFI run-summary plots, DAFT instrument logs). Kept apart from the experimental-table runs.
const CFI_COLS: [string, string][] = [["pressure_mmhg", "P (mmHg)"], ["y_o2", "YO₂"], ["d0_mm", "D0 (mm)"], ["dext_mm", "Dext (mm)"],
  ["kavg_mm2_s", "kavg (mm²/s)"], ["kavg_cool_mm2_s", "kavg, cool (mm²/s)"], ["dext_cool_mm", "Dext, cool (mm)"]];

const fmt = (x: number | null | undefined) => (x == null ? "—" : Number.isInteger(x) ? String(x) : String(+x.toPrecision(6)));

function Files({ files }: { files: any[] }) {
  return (
    <details><summary>{files.length} analyzed-data files</summary>
      <ul className="docs">{files.map((f) => (
        <li key={f.file_name}><a href={f.url} target="_blank" rel="noreferrer">{f.short_name}</a>
          <span className="muted small"> — {(f.size_bytes / 1e6).toFixed(2)} MB · local: {f.local_path}</span>
          {f.status !== "parsed" && <span className="label label-nr small"> {f.status}</span>}
          {f.note && <span className="muted small block">{f.note}</span>}</li>))}</ul>
    </details>
  );
}

function CfiSummaries({ rows }: { rows: any[] }) {
  return (
    <div className="table-wrap"><table>
      <thead><tr><th>FLEX test</th><th>Date</th><th>Fuel</th>{CFI_COLS.map(([, h]) => <th key={h}>{h}</th>)}<th>CFI table</th><th>File</th></tr></thead>
      <tbody>{rows.map((s) => (
        <tr key={s.id}>
          <td className="num">{s.flex_number}{s.kind === "preliminary" && <span className="muted small block">preliminary</span>}</td>
          <td className="num small">{s.test_date}</td><td>{s.fuel}</td>
          {CFI_COLS.map(([k]) => <td key={k} className="num">{s.values_as_printed[k] ?? "—"}</td>)}
          <td className="small">{s.cfi_table_records.length ? s.cfi_table_records.map((r: any) => `row ${r.csv_record}`).join(", ")
            : <span className="muted">not in table</span>}
            {s.observations.map((o: string) => <span key={o} className="block muted">“{o}”</span>)}</td>
          <td className="small"><a href={s.url} target="_blank" rel="noreferrer">plot ↗</a></td>
        </tr>))}</tbody>
    </table></div>
  );
}

function DaftLogs({ d }: { d: any }) {
  return (
    <>
      <h3>Instrument logs</h3>
      <div className="table-wrap free"><table>
        <thead><tr><th>Instrument</th><th>Test</th><th>GMT</th><th>Units</th><th>Readings</th><th>Min</th><th>Median</th><th>Mean</th><th>Max</th><th>Sheet</th></tr></thead>
        <tbody>{d.instrument_logs.map((l: any) => (
          <tr key={`${l.instrument}-${l.test_id}-${l.gmt}`}><td>{l.instrument}</td><td className="num">{l.test_id}</td>
            <td className="num small">{l.gmt}</td><td className="small">{l.units}</td>
            <td className="num">{l.n_values}{l.points_listed && String(l.n_values) !== l.points_listed && <span className="muted small block">header says {l.points_listed}</span>}</td>
            <td className="num">{fmt(l.min)}</td><td className="num">{fmt(l.median)}</td><td className="num">{fmt(l.mean)}</td><td className="num">{fmt(l.max)}</td>
            <td className="small">{l.sheet}{l.files.length > 1 && <span className="muted block">in {l.files.length} workbooks</span>}</td></tr>))}</tbody>
      </table></div>
      {d.bag_summary?.length > 0 && (<>
        <h3>Logged bag summary <span className="muted small">(sheet “{d.bag_summary_derived?.sheet}”)</span></h3>
        <table className="facts"><thead><tr><th>Bag</th><th>P-Trak avg (n/cm³)</th><th>DustTrak avg (mg/m³)</th><th>Derived diameter (micron)</th></tr></thead>
          <tbody>{d.bag_summary.map((b: any) => <tr key={b.bag}><th scope="row">{b.bag}</th><td className="num">{fmt(b.ptrak_avg_n_cm3)}</td>
            <td className="num">{fmt(b.dusttrak_avg_mg_m3)}</td><td className="num">{fmt(b.derived_diameter_um)}</td></tr>)}</tbody></table>
        {d.bag_summary_derived?.average_diameter_um != null && <p className="muted small">As labelled in the sheet: Average D (micron) = {fmt(d.bag_summary_derived.average_diameter_um)};
          0gD/1gD = {fmt(d.bag_summary_derived.ratio_0g_to_1g_diameter)}. <a href={d.bag_summary_derived.url} target="_blank" rel="noreferrer">workbook ↗</a></p>}
      </>)}
      {d.notes?.length > 0 && (<><h3>Notes written in the workbooks</h3>
        {d.notes.map((n: any, i: number) => <blockquote key={i}>{n.text} <span className="muted small">({n.sheet})</span> <a href={n.url} target="_blank" rel="noreferrer">↗</a></blockquote>)}</>)}
    </>
  );
}

export default function AnalyzedData({ d }: { d: any }) {
  if (!d) return null;
  return (
    <section aria-labelledby="analyzed-h">
      <h2 id="analyzed-h">{d.label} <EvidenceLabel text={d.evidence_label} /></h2>
      <Notice>{d.note}</Notice>
      {d.kind === "cfi_run_summaries" && <CfiSummaries rows={d.cfi_run_summaries} />}
      {d.kind === "daft_logs" && <DaftLogs d={d} />}
      <Files files={d.files} />
    </section>
  );
}
