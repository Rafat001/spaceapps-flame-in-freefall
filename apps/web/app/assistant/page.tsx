"use client";
import Link from "next/link";
import { useState } from "react";
import { API_BASE, api } from "@/lib/api";
import { assistantHeaders } from "@/lib/byok";
import { ErrorBox, EvidenceLabel, Loading, Notice, PageHead } from "@/components/ui";
import { Citations, Flags } from "@/components/Citations";

const EXAMPLES = [
  "Has any PSI test been run at a lunar-habitat-like atmosphere (O2 >= 30% and pressure <= 10.2 psi)?",
  "How many fuel samples were burned in Saffire-II, and which materials?",
  "What was the largest initial droplet diameter in FLEX, and which test was it?",
  "How did the ISS fine water-mist extinguishers come about, according to official sources?",
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
    try { const r = await api("/api/ask", { method: "POST", body: JSON.stringify({ question }), headers: assistantHeaders(API_BASE) }); setHist((h) => [r, ...h]); setQ(""); }
    catch (x) { setErr(x); }
    setBusy(false);
  }
  return (
    <>
      <PageHead no="05" kicker="Ask" title="Ask the evidence">
        Answers come only from the official resources: PSI records and experimental tables, NASA fact sheets, the Researcher&apos;s Guide,
        the brief, incident and spinoff pages, and the guidance video. Exact answers are computed from the data with row, page or
        timestamp citations; no key is needed. With your own key, an AI summary is added and labeled <EvidenceLabel text="AI interpretation" />.
      </PageHead>
      <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="ask">
        <label htmlFor="question">Question</label>
        <textarea id="question" rows={3} maxLength={1000} value={q} onChange={(e) => setQ(e.target.value)} placeholder="What has been measured about…" />
        <div className="actions"><button type="submit" disabled={busy}>{busy ? "Retrieving…" : "Ask"}</button></div>
        <p className="prompts-title">Try:</p>
        <ol className="prompts">{EXAMPLES.map((x) => <li key={x}><button type="button" onClick={() => ask(x)}>{x}</button></li>)}</ol>
      </form>
      <ErrorBox error={err} />
      {busy && <Loading what="Searching sources" />}
      {hist.map((r, i) => (
        <section key={i} className="dossier" aria-live="polite">
          <p className="dossier-no">Inquiry {String(hist.length - i).padStart(2, "0")}</p>
          <h2>{r.question}</h2>
          {r.policy_notes.map((n: string) => <Notice key={n} kind="warn">{n}</Notice>)}
          {r.mode === "abstained" && <Notice kind="warn"><strong>{r.answer}</strong></Notice>}
          {r.direct && (
            <div className="direct">
              <p className="direct-kind">{r.direct.answer_kind === "abstain" ? "Abstained" : "Direct answer"} · {r.direct.label}</p>
              {r.direct.answer_kind !== "abstain" && <div className="answer">{r.direct.answer}</div>}
              <Flags flags={r.direct.flags} />
              {r.direct.computation?.length > 0 && <p className="computation">How computed: {r.direct.computation.join("; ")}</p>}
              <Citations items={r.direct.citations} />
            </div>
          )}
          {r.llm_notice && <Notice kind="warn">{r.llm_notice}</Notice>}
          {r.ai_summary && (<>
            <p className="answer-meta"><EvidenceLabel text={r.ai_label} /> <span>{r.llm.provider} · {r.llm.model}{r.llm.byok ? " · your key (this request only)" : ""}</span></p>
            <div className="answer">{r.ai_summary}</div>
            {r.warnings?.map((w: string) => <Notice key={w} kind="warn">{w}</Notice>)}
          </>)}
          {r.mode === "direct" && r.setup_message && <p className="muted small">AI summary off: add your own key in <Link href="/settings">Settings</Link> (optional).</p>}
          {r.mode === "retrieval_only" && (<>{r.template_summary && <p className="answer">{r.template_summary}</p>}
            <Notice>{r.setup_message} <Link href="/settings">AI settings →</Link></Notice></>)}
          {r.mode === "llm" && (<>
            <p className="answer-meta"><EvidenceLabel text={r.answer_label} /> <span>{r.llm.provider} · {r.llm.model}</span></p>
            <div className="answer">{r.answer}</div>
            {r.warnings?.map((w: string) => <Notice key={w} kind="warn">{w}</Notice>)}
          </>)}
          <h3 className="sources-title">{r.mode === "retrieval_only" ? "Retrieved source snippets" : "Related passages (retrieval)"}</h3>
          {r.citations.length === 0 ? <p className="cond-unknown">No sources retrieved.</p> : (
            <ol className="sources">{r.citations.map((c: any) => (
              <li key={c.chunk_id} className="source">
                <div className="source-head">
                  <span className="source-ref">[{c.ref}]</span>
                  <span className="source-name">{c.acronym || "Challenge brief"}</span>
                  <span className="source-sec">{c.section}</span><span className="mono small">{c.locator}</span>
                  <EvidenceLabel text={c.label} />
                  {c.injection_flagged && <span className="label label-nr">instruction-like text removed</span>}
                </div>
                <blockquote>{c.excerpt}</blockquote>
                <span className="source-links">{c.source_url && <a href={c.source_url} target="_blank" rel="noreferrer">source ↗</a>}
                  {c.investigation_id && <Link href={`/investigations/${c.investigation_id}`}>record</Link>}
                  <span>page: {c.page}</span></span>
              </li>))}</ol>
          )}
        </section>
      ))}
    </>
  );
}
