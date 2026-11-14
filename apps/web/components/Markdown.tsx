"use client";
import ReactMarkdown from "react-markdown";

export type CiteSource = { ref: string; source_url?: string | null; investigation_id?: string | null; acronym?: string | null;
  section?: string | null; label?: string | null; excerpt?: string | null; locator?: string | null };

/** Where a citation marker should take the reader: the source itself, else the investigation page. */
export function citeHref(c: CiteSource | undefined): string | null {
  if (!c) return null;
  if (c.source_url) return c.source_url;
  if (c.investigation_id) return `/investigations/${encodeURIComponent(c.investigation_id)}`;
  return null;
}

function citeTitle(c: CiteSource): string {
  const who = [c.acronym, c.section].filter(Boolean).join(" · ");
  const ex = (c.excerpt || "").replace(/\s+/g, " ").slice(0, 220);
  return [who, c.label, ex && `“${ex}${(c.excerpt || "").length > 220 ? "…" : ""}”`].filter(Boolean).join("\n");
}

/**
 * Renders an LLM answer as markdown. 【S3】 and [S3] citation markers become links to the cited source
 * (opens in a new tab) when `citations` are given; otherwise they are shown as plain [S3].
 */
export function Markdown({ text, className = "", citations }: { text: string; className?: string; citations?: CiteSource[] }) {
  const byRef = new Map((citations || []).map((c) => [c.ref, c]));
  const md = String(text ?? "")
    .replace(/【(S\d+)[^】]*】/g, "[$1]")
    // the model sometimes wraps markers in bold ("**[S1]**"); drop that so no stray asterisks show
    .replace(/\*\*((?:\s*\[S\d+\])+)\s*\*\*/g, "$1")
    .replace(/\[(S\d+)\](?!\()/g, (_m, ref) => `[\\[${ref}\\]](#cite-${ref})`);
  return (
    <div className={`md ${className}`}>
      <ReactMarkdown
        components={{
          a: ({ href, children }) => {
            const m = /^#cite-(S\d+)$/.exec(href || "");
            if (!m) return <a href={href} target="_blank" rel="noreferrer">{children}</a>;
            const c = byRef.get(m[1]);
            const to = citeHref(c);
            if (!c || !to) return <b className="cite-ref">[{m[1]}]</b>;
            const external = /^https?:/.test(to);
            return (
              <a className="cite-ref" href={to} title={citeTitle(c)} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
                [{m[1]}]
              </a>
            );
          },
        }}
      >{md}</ReactMarkdown>
    </div>
  );
}
