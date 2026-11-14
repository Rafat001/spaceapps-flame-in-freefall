"use client";
import { EvidenceLabel } from "./ui";
import { citeHref } from "./Markdown";

type Cite = { label: string; title: string; locator: string; url: string };
type Fact = { kind: string; label: string; quote: string; citation: Cite };
type Note = { kind: string; text: string; quotes: { quote: string; citation: Cite }[]; psi_value: string | null };

/** Short source name for a citation, e.g. "FLEX fact sheet, p. 3" or "NASA Combustion Science page". */
export function citeName(c: Cite) {
  const doc = c.label === "NASA fact sheet" ? c.title.replace(" (NASA GRC)", "")
    : c.label === "NASA Glenn experiment page" ? c.title.replace(" (NASA GRC)", " page") : c.label;
  return c.locator && c.locator !== "page text" ? `${doc}, ${c.locator}` : doc;
}

export function CiteLink({ c, quote }: { c: Cite; quote?: string }) {
  return <a className="cite-link" href={citeHref({ source_url: c.url, quote }) || c.url} target="_blank" rel="noreferrer">{citeName(c)} ↗</a>;
}

/** Facts grouped under their label, in the order the API sends them. */
export function FactList({ facts }: { facts: Fact[] }) {
  const groups: [string, Fact[]][] = [];
  for (const f of facts) {
    const g = groups.find(([l]) => l === f.label);
    if (g) g[1].push(f); else groups.push([f.label, [f]]);
  }
  return (
    <dl className="nasa-facts">
      {groups.map(([label, fs]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{fs.map((f, i) => <p key={i}><q>{f.quote}</q> <CiteLink c={f.citation} quote={f.quote} /></p>)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SourceNotes({ notes, title }: { notes: Note[]; title: string }) {
  if (!notes?.length) return null;
  return (
    <div className="nasa-notes">
      <h3>{title}</h3>
      <ul>
        {notes.map((n, i) => (
          <li key={i}>
            <p className="nasa-note-text">{n.text}</p>
            <div className="vs">
              {n.quotes.map((q, k) => (
                <div key={k} className="vs-side"><span className="vs-tag">NASA</span><q>{q.quote}</q> <CiteLink c={q.citation} quote={q.quote} /></div>
              ))}
              {n.psi_value && <div className="vs-side"><span className="vs-tag vs-psi">PSI</span><span>{n.psi_value}</span></div>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function NasaSummary({ s, acronym }: { s: any; acronym: string }) {
  if (!s) return null;
  return (
    <section className="nasa" aria-labelledby="nasa-title">
      <p className="dossier-no">NASA program summary <EvidenceLabel text="Official resource, quoted verbatim" /></p>
      <h2 id="nasa-title">What NASA says about {acronym}</h2>
      {s.lead && (
        <figure className="nasa-lead">
          <blockquote>{s.lead.quote}</blockquote>
          <figcaption><CiteLink c={s.lead.citation} quote={s.lead.quote} /></figcaption>
        </figure>
      )}
      <FactList facts={s.facts} />
      <SourceNotes notes={s.notes} title="Where NASA’s text and the PSI record differ" />
      {s.program && (
        <details className="nasa-program">
          <summary>About the {s.program.name} program</summary>
          <FactList facts={s.program.facts} />
          <SourceNotes notes={s.program.notes} title="Inconsistencies inside the program fact sheet" />
        </details>
      )}
      <p className="muted small nasa-foot">{s.note}</p>
    </section>
  );
}
