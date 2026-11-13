"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Citations } from "@/components/Citations";
import { ErrorBox, EvidenceLabel, Loading, PageHead } from "@/components/ui";

export default function Earth() {
  const [d, setD] = useState<any>(null);
  const [ex, setEx] = useState<any>(null);
  const [err, setErr] = useState<unknown>(null);
  useEffect(() => { api("/api/earth").then(setD).catch(setErr); api("/api/explainer").then(setEx).catch(() => {}); }, []);
  return (
    <>
      <PageHead no="06" kicker="Earth add-on" title="From space fire research to fire safety on Earth">
        <p>Links between official NASA resources, PSI investigations and Earth uses. <b>Documented</b> links are stated in a source and quoted;
          <b> Inferred</b> links are thematic suggestions by this app and are labelled as such.</p>
      </PageHead>
      <ErrorBox error={err} />
      {!d ? <Loading /> : (<>
        <section className="section">
          {d.resource_items.map((it: any) => (
            <article key={it.id} className="dossier">
              <h2>{it.title}</h2>
              <Citations items={it.quotes} title="Official sources" />
              <h3>PSI investigations</h3>
              {it.links.length === 0 ? <p className="cond-unknown">No PSI investigation is linked by the sources; none is suggested.</p> : (
                <ul className="evidence-list">{it.links.map((l: any) => (
                  <li key={l.investigation_id}><EvidenceLabel text={l.kind === "Documented" ? "Documented" : "Inferred (app suggestion)"} />{" "}
                    <Link href={`/investigations/${l.investigation_id}`}>{l.acronym}</Link> <span className="muted small">{l.accession}</span> — {l.why}</li>))}</ul>)}
            </article>))}
        </section>
        <section className="section">
          <h2 className="display">Earth benefits stated in PSI records <EvidenceLabel text="Documented (PSI researchImpacts)" /></h2>
          <ul className="evidence-list">{d.psi_documented.map((p: any) => (
            <li key={p.investigation_id}><div><Link href={`/investigations/${p.investigation_id}`}>{p.acronym}</Link> <span className="muted small">{p.accession}</span></div>
              <blockquote>{p.excerpt}</blockquote></li>))}</ul>
        </section>
      </>)}
      {ex && (<section className="section">
        <h2 className="display">Why flames differ in microgravity <span className="aside">official sources only</span></h2>
        <Citations items={ex.items} title="Quoted explanation" />
      </section>)}
    </>
  );
}
