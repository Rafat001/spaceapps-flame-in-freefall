"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ErrorBox, Loading, Notice, PageHead } from "@/components/ui";
import { CiteLink, FactList, SourceNotes } from "@/components/NasaSummary";

const ORDER = ["current", "future", "saffire", "fact_sheet", "shuttle", "facility"];

function Status({ s }: { s: any }) {
  if (!s) return <p className="xp-status muted">Status not stated in the source.</p>;
  if (s.heading) return <p className="xp-status">Listed under <q>{s.quote}</q> on the <CiteLink c={s.citation} /></p>;
  return <p className="xp-status"><q>{s.quote}</q> <CiteLink c={s.citation} /></p>;
}

function Related({ items }: { items: any[] }) {
  if (!items?.length) return null;
  return (
    <p className="xp-related"><span className="xp-related-tag">Related PSI records</span>
      {items.map((r, i) => (
        <span key={r.investigation_id}>{i > 0 && " · "}<Link href={`/investigations/${r.investigation_id}`}>{r.acronym}</Link>
          <span className="muted small"> ({r.why})</span></span>))}
    </p>
  );
}

function Item({ it, subs }: { it: any; subs: any[] }) {
  const [first, ...rest] = it.facts;
  return (
    <li>
      <article className="entry xp" id={it.id}>
        <h3 className="entry-acr">{it.acronym}<span className="entry-acc">{it.kind === "facility" ? "ISS facility" : "No PSI record"}</span></h3>
        <div>
          <p className="entry-title">{it.name}</p>
          <ul className="tags"><li className="tag-nopsi">{it.label}</li><li>{it.group_label}</li></ul>
          <Status s={it.status} />
          <FactList facts={rest.length > 2 ? [first, rest[0]] : it.facts} />
          {rest.length > 2 && (
            <details className="xp-more"><summary>{rest.length - 1} more excerpts</summary><FactList facts={rest.slice(1)} /></details>
          )}
          <SourceNotes notes={it.notes} title="Sources disagree" />
          {subs.length > 0 && (
            <div className="xp-subs">
              <h4>Investigations selected under {it.acronym}</h4>
              <ul>{subs.map((s) => (
                <li key={s.id} id={s.id}><b>{s.acronym}</b> <span className="muted">{s.name}</span>
                  {s.facts.map((f: any, i: number) => <p key={i}><q>{f.quote}</q> <CiteLink c={f.citation} /></p>)}</li>))}</ul>
            </div>
          )}
          <Related items={it.related} />
        </div>
      </article>
    </li>
  );
}

export default function BeyondPsi() {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState<unknown>(null);
  useEffect(() => { api("/api/nasa/other-experiments").then(setD).catch(setErr); }, []);
  const top = (d?.items || []).filter((i: any) => !i.parent);
  return (
    <>
      <PageHead no="07" kicker="Beyond PSI" title="Other NASA combustion experiments">
        <p>Experiments and ISS facilities that NASA’s Combustion Science page, its fact sheets and the challenge brief describe,
          but that have <b>no record in PSI</b>. Everything below is quoted word for word with its source.</p>
      </PageHead>
      <Notice>These are described by NASA but have no PSI test data, so they are never counted, filtered or ranked in this app.
        Ask “What is FLARE?” and you get NASA’s description; ask for their measured data and the assistant declines.</Notice>
      <ErrorBox error={err} />
      {!d ? <Loading /> : ORDER.filter((g) => top.some((i: any) => i.group === g)).map((g) => (
        <section key={g} className="section" aria-labelledby={`g-${g}`}>
          <div className="section-head"><h2 id={`g-${g}`} className="display">{d.groups[g]}</h2></div>
          <ol className="entries">
            {top.filter((i: any) => i.group === g).map((it: any) => (
              <Item key={it.id} it={it} subs={d.items.filter((s: any) => s.parent === it.id)} />))}
          </ol>
        </section>
      ))}
      {d?.adjacent_psi_records?.length > 0 && (
        <section className="section" aria-labelledby="g-adjacent">
          <div className="section-head"><h2 id="g-adjacent" className="display">Other PSI records on the official search link</h2></div>
          <p className="muted">{d.adjacent_psi_note}</p>
          <ol className="entries">{d.adjacent_psi_records.map((r: any) => (
            <li key={r.accession}><article className="entry xp" id={r.accession.toLowerCase()}>
              <h3 className="entry-acr">{r.acronym || r.accession}<span className="entry-acc">{r.accession}</span></h3>
              <div>
                <p className="entry-title">{r.title}</p>
                <ul className="tags"><li className="tag-nopsi">Not Combustion Science</li><li>{r.research_area}</li><li>{r.project_type}</li></ul>
                {r.why_listed && <p>Why it matches “combustion”: <q>{r.why_listed}</q> <span className="muted small">(PSI record, {r.why_field})</span></p>}
                <p><a href={r.url} target="_blank" rel="noreferrer">Open on PSI ↗</a></p>
              </div>
            </article></li>))}</ol>
        </section>
      )}
    </>
  );
}
