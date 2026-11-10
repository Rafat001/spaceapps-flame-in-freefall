"use client";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { ErrorBox, EvidenceLabel, Loading, Notice } from "@/components/ui";

const EXAMPLES = [
  "What does BASS tell us about airflow?",
  "Which studies measured smoke or aerosol characteristics, and what instruments did they use?",
  "Compare BASS and Saffire in objectives, fuel types, and test environments.",
  "Which records mention elevated oxygen conditions?",
  "What evidence is relevant to a lunar habitat, and what cannot be concluded from microgravity results?",
  "What is the exact flame spread rate of Nomex in microgravity?",
  "Does a material tested in microgravity automatically qualify as safe on the Moon?",
];

export default function Assistant() {
  const [q, setQ] = useState("");
  const [hist, setHist] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>(null);
  async function ask(question: string) {
    if (question.trim().length < 3) return;
    setBusy(true); setErr(null);
    try { const r = await api("/api/ask", { method: "POST", body: JSON.stringify({ question }) }); setHist((h) => [r, ...h]); setQ(""); }
    catch (x) { setErr(x); }
    setBusy(false);
  }
  return (
    <>
      <h1>Ask the evidence</h1>
      <p className="muted">Answers come only from indexed sources (PSI records, PSI experimental table summaries, official challenge brief),
        with citations. The assistant says so when the evidence is insufficient. AI text is labeled <EvidenceLabel text="AI interpretation" />.</p>
      <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="panel">
        <label htmlFor="question">Question</label>
        <textarea id="question" rows={3} maxLength={1000} value={q} onChange={(e) => setQ(e.target.value)} />
        <div style={{ marginTop: 10 }}><button type="submit" disabled={busy}>{busy ? "Retrieving…" : "Ask"}</button></div>
        <p className="small muted">Try:</p>
        <div className="chips">{EXAMPLES.map((x) => <button type="button" key={x} className="secondary small" onClick={() => ask(x)}>{x}</button>)}</div>
      </form>
      <ErrorBox error={err} />
      {busy && <Loading what="Searching sources" />}
      {hist.map((r, i) => (
        <section key={i} className="panel" style={{ marginTop: 16 }} aria-live="polite">
          <h2 style={{ marginTop: 0 }}>{r.question}</h2>
          {r.policy_notes.map((n: string) => <Notice key={n} kind="warn">{n}</Notice>)}
          {r.mode === "abstained" && <Notice kind="warn"><strong>{r.answer}</strong></Notice>}
          {r.mode === "retrieval_only" && <Notice>{r.setup_message} <Link href="/settings">AI settings →</Link></Notice>}
          {r.mode === "llm" && (<>
            <p><EvidenceLabel text={r.answer_label} /> <span className="muted small">{r.llm.provider} · {r.llm.model}</span></p>
            <div style={{ whiteSpace: "pre-wrap" }}>{r.answer}</div>
            {r.warnings?.map((w: string) => <Notice key={w} kind="warn">{w}</Notice>)}
          </>)}
          <h3>{r.mode === "retrieval_only" ? "Retrieved source snippets" : "Sources"}</h3>
          {r.citations.length === 0 ? <p className="cond-unknown">No sources retrieved.</p> : (
            <ol>{r.citations.map((c: any) => (
              <li key={c.chunk_id} style={{ marginBottom: 8 }}>
                <strong>[{c.ref}] {c.acronym || "Challenge brief"}</strong> · {c.section} <EvidenceLabel text={c.label} />
                {c.injection_flagged && <span className="label label-nr">instruction-like text removed</span>}
                <blockquote>{c.excerpt}</blockquote>
                <span className="small">{c.source_url && <a href={c.source_url} target="_blank" rel="noreferrer">source ↗</a>}
                  {c.investigation_id && <> · <Link href={`/investigations/${c.investigation_id}`}>record</Link></>}
                  <span className="muted"> · page: {c.page}</span></span>
              </li>))}</ol>
          )}
        </section>
      ))}
    </>
  );
}
