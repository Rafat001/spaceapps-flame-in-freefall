"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Citations } from "@/components/Citations";
import LunarChart from "@/components/LunarChart";
import { ErrorBox, EvidenceLabel, Loading, Notice, PageHead } from "@/components/ui";

const WHY_Q = "Why do NASA's planned lunar habitats have raised oxygen, and what does that imply for fire?";

export default function Lunar() {
  const [stream, setStream] = useState(true);
  const [cov, setCov] = useState<any>(null);
  const [rank, setRank] = useState<any>(null);
  const [pts, setPts] = useState<any>(null);
  const [why, setWhy] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [err, setErr] = useState<unknown>(null);
  useEffect(() => {
    api("/api/rank?scenario=lunar_habitat").then(setRank).catch(setErr);
    api("/api/lunar/points").then(setPts).catch(setErr);
    api("/api/qa", { method: "POST", body: JSON.stringify({ question: WHY_Q }) }).then(setWhy).catch(() => {});
    api("/api/stats").then(setStats).catch(() => {});
  }, []);
  useEffect(() => {
    setCov(null);
    api("/api/coverage", { method: "POST", body: JSON.stringify({ oxygen_min: 30, pressure_max: 10.2, pressure_unit: "psi", include_oxidizer_stream: stream, max_runs: 12 }) })
      .then(setCov).catch(setErr);
  }, [stream]);
  const matched = cov?.results.filter((r: any) => r.verdict === "documented_match") || [];
  const misses = cov?.results.filter((r: any) => r.closest_miss) || [];
  return (
    <>
      <PageHead no="00" kicker="Lead question" title="Has fire been studied at lunar-habitat oxygen and pressure?">
        <p>The official brief expects Moon-base cabins at <b>30 % oxygen or more</b> and <b>10.2 psi or less</b>. This page checks every PSI
          experimental-table row for both conditions <em>on the same row</em>, using exactly 10.2 psi = 70.33 kPa.</p>
      </PageHead>
      <ErrorBox error={err} />
      {why?.answer && (
        <section className="dossier">
          <p className="dossier-no">Why it matters <EvidenceLabel text="Official sources" /></p>
          <p className="answer">{why.answer}</p>
          <Citations items={why.citations} title="Sources" />
        </section>
      )}
      <section className="dossier" aria-live="polite">
        <p className="dossier-no">Answer <EvidenceLabel text="Computed from PSI tables (no AI)" /></p>
        <label className="check"><input type="checkbox" checked={stream} onChange={(e) => setStream(e.target.checked)} />
          Count burner oxidizer-stream O2 (inverse flames). It is labelled, because it is not the cabin atmosphere.</label>
        {!cov ? <Loading /> : (<>
          <p className="answer">{cov.answer_text}</p>
          <div className="table-wrap"><table>
            <thead><tr><th>Investigation</th><th>Rows meeting both</th><th>By table</th><th>Notes</th><th>Example rows (verbatim)</th></tr></thead>
            <tbody>{matched.map((r: any) => (
              <tr key={r.investigation.id}>
                <td><Link href={`/investigations/${r.investigation.id}`}>{r.investigation.acronym}</Link><span className="muted small block">{r.investigation.accession}</span></td>
                <td className="num"><b>{r.n_runs_full_match}</b> / {r.n_runs_total}</td>
                <td className="small">{Object.entries(r.full_match_by_subtable).map(([k, v]: any) => `${k}: ${v}`).join("; ")}</td>
                <td className="small">{r.match_notes.join(" ")}</td>
                <td className="small">{r.matching_runs.slice(0, 3).map((m: any) => (
                  <span key={m.id} className="block">CSV record {m.source.row} · {m.run_label}: O2 “{m.oxygen.source_text}”, p “{m.pressure.source_text}”{m.oxygen_is_stream ? " (stream)" : ""}</span>))}</td>
              </tr>))}</tbody>
          </table></div>
          {misses.length > 0 && (<><h3>Closest misses</h3><ul className="evidence-list">{misses.map((r: any) => (
            <li key={r.investigation.id}><strong>{r.investigation.acronym}</strong> CSV record {r.closest_miss.source.row}: {r.closest_miss.why}</li>))}</ul></>)}
        </>)}
      </section>
      {pts && <LunarChart data={pts} />}
      {rank && (
        <section className="section">
          <h2 className="display">Ranking agrees with the coverage check <span className="aside">same row counts</span></h2>
          <div className="table-wrap"><table>
            <thead><tr><th>Rank</th><th>Investigation</th><th>Scenario fit</th><th>Rows meeting the lunar target</th><th>Tests-at-target criterion</th></tr></thead>
            <tbody>{rank.results.slice(0, 10).map((r: any) => {
              const atm = r.breakdown.find((b: any) => b.criterion === "target_conditions");
              return (<tr key={r.investigation.id}><td className="num">{r.rank}</td><td><Link href={`/investigations/${r.investigation.id}`}>{r.investigation.acronym}</Link>
                {r.investigation.is_ground && <span className="muted small block">ground / modeling</span>}</td>
                <td className="num">{r.score}</td><td className="num">{r.target_rows ?? 0}</td>
                <td className="small">{atm ? `${atm.match} × weight ${atm.weight} = ${atm.contribution} pts` : "—"}</td></tr>);
            })}</tbody>
          </table></div>
          <p className="muted small">{rank.order_note} Scenario fit is research fit, not hazard. Ranking version {rank.ranking_version}.</p>
        </section>
      )}
      {stats?.partial_gravity_gap && (
        <section className="section">
          <h2 className="display">The partial-gravity gap</h2>
          <Notice kind="warn">{stats.partial_gravity_gap.text} <a href={stats.partial_gravity_gap.citation_url} target="_blank" rel="noreferrer">brief ↗</a></Notice>
          <p>All matches above are microgravity (or 1-g ground) data. No PSI row tests lunar gravity, which NASA's Combustion Science page gives as &ldquo;its 1/6 reduced gravity level&rdquo; (describing
            FM2, which is not in PSI) <a href="https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/" target="_blank" rel="noreferrer">NASA Combustion Science ↗</a>.
            So these results bound the question but do not answer it for the Moon.</p>
        </section>
      )}
    </>
  );
}
