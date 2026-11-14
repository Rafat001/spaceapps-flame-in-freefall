import Link from "next/link";
import data from "@/lib/spacefire.json";

export type SFItem = (typeof data.groups)[number]["items"][number] & { related?: { href: string; label: string }[] };
export const SPACEFIRE = data;
const ROMAN = ["I", "II", "III"];
const year = (d: string) => d.match(/\d{4}/)?.[0] ?? "";

export function SpaceFireItem({ it }: { it: SFItem }) {
  return (
    <li id={it.id}>
      <article className="entry sf">
        <div className="sf-when">
          <span className="sf-year">{year(it.date)}</span>
          <span className="entry-acc">{it.host}</span>
        </div>
        <div>
          <h3 className="sf-title"><a href={it.url} target="_blank" rel="noreferrer">{it.title} <span aria-hidden="true">↗</span>
            <span className="sr-only"> (opens in a new tab)</span></a></h3>
          <p className="sf-meta">{it.site} · {it.date}</p>
          <p className="sf-note"><span className="sf-note-tag">Challenge resources tab</span>{it.resources_tab}</p>
          <dl className="nasa-facts">
            {it.excerpts.map((q, i) => (
              <div key={i}><dt>{it.excerpt_labels[i]}</dt>
                <dd><q>{q}</q> <a className="cite-link" href={it.url} target="_blank" rel="noreferrer">{it.title}, page text ↗</a></dd></div>
            ))}
          </dl>
          {it.related?.map((r) => <p key={r.href} className="sf-related"><Link href={r.href}>{r.label} →</Link></p>)}
        </div>
      </article>
    </li>
  );
}

export function SpaceFireGroups() {
  return (
    <>
      {data.groups.map((g, gi) => (
        <section key={g.id} className="section" aria-labelledby={`sf-${g.id}`}>
          <div className="section-head"><h2 id={`sf-${g.id}`} className="display"><span className="sf-roman">{ROMAN[gi]}</span>{g.title}</h2></div>
          <ol className="entries">{g.items.map((it) => <SpaceFireItem key={it.id} it={it as SFItem} />)}</ol>
        </section>
      ))}
    </>
  );
}

/** Compact index for the home page. */
export function SpaceFireTeaser() {
  return (
    <section className="sf-teaser" aria-labelledby="sf-teaser-title">
      <p className="kicker"><span className="kicker-no">Context</span> Official challenge resources</p>
      <h2 id="sf-teaser-title" className="display"><Link href="/spacefire">SpaceFire Evolution →</Link></h2>
      <div className="sf-teaser-cols">
        {data.groups.map((g, gi) => (
          <div key={g.id}>
            <h3><span className="sf-roman">{ROMAN[gi]}</span>{g.title}</h3>
            <ul>{g.items.map((it) => <li key={it.id}><Link href={`/spacefire#${it.id}`}>{it.title}</Link>
              <span className="muted"> · {year(it.date)}</span></li>)}</ul>
          </div>
        ))}
      </div>
    </section>
  );
}
