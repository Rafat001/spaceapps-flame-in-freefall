"use client";
import Link from "next/link";
import { citeHref } from "@/components/Markdown";

export function Citation({ c }: { c: any }) {
  const to = citeHref(c);
  return (
    <li className="source">
      <div className="source-head">
        <span className="source-name">{c.acronym || c.label}</span>
        <span className="source-sec mono">{c.locator}</span>
        {c.column && <span className="muted small">column “{c.column}”</span>}
        <span className={`label label-${/auto-captions|frame/.test(c.label) ? "rule" : /brief/i.test(c.label) ? "brief" : "src"}`}>{c.label}</span>
        {c.provenance?.kind === "reference" && <span className="label label-rule">reference of {c.provenance.reference_of}</span>}
      </div>
      {c.quote && <blockquote>{c.quote}</blockquote>}
      <span className="source-links">
        {to && /^https?:/.test(to) && <a href={to} target="_blank" rel="noreferrer">source ↗</a>}
        {c.investigation_id && <Link href={`/investigations/${c.investigation_id}`}>record</Link>}
        {c.file && <span className="muted small">{c.file}</span>}
      </span>
    </li>
  );
}

export function Citations({ items, title = "Citations" }: { items: any[]; title?: string }) {
  if (!items?.length) return null;
  return (
    <>
      <h3 className="sources-title">{title}</h3>
      <ol className="sources">{items.map((c, i) => <Citation key={i} c={c} />)}</ol>
    </>
  );
}

export function Flags({ flags }: { flags: any[] }) {
  if (!flags?.length) return null;
  return (
    <ul className="flags">{flags.map((f, i) => (
      <li key={i}><span className="label label-nr">{f.code?.replace(/_/g, " ")}</span>{" "}
        {f.row && <span className="mono small">row {f.row} </span>}{f.message}
        {f.suggestion && <span className="muted small"> Suggested reading: {f.suggestion} (not applied)</span>}
        <span className="muted small"> · {f.rule}</span></li>))}
    </ul>
  );
}
