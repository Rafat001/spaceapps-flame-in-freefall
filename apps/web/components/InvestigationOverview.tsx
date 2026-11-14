"use client";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { api, qs, API_BASE } from "@/lib/api";
import { EvidenceLabel } from "@/components/ui";
import { assistantHeaders } from "@/lib/byok";

interface OverviewProps {
  invId: string;
  /** The search query that brought the user here (from ?q= on the explorer page). */
  query?: string | null;
}

function Shimmer() {
  return (
    <div className="overview-shimmer" aria-busy="true" aria-label="Loading overview…">
      <div className="shimmer-line shimmer-line--long" />
      <div className="shimmer-line shimmer-line--mid" />
      <div className="shimmer-line shimmer-line--long" />
      <div className="shimmer-line shimmer-line--short" />
    </div>
  );
}

export default function InvestigationOverview({ invId, query }: OverviewProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!invId) return;
    setLoading(true);
    setData(null);
    setError(null);

    const params = qs({ q: query || undefined });
    const headers = assistantHeaders(API_BASE);

    api(`/api/investigations/${invId}/overview${params}`, {
      headers: headers as Record<string, string>,
    })
      .then(setData)
      .catch((e) => setError(e?.message ?? "Failed to load overview"))
      .finally(() => setLoading(false));
  }, [invId, query]);

  const label = query
    ? `AI Overview — "${query}"`
    : "AI Overview";

  return (
    <section className="overview-section" aria-labelledby="overview-heading">
      <div className="overview-header">
        <h2 id="overview-heading">
          {label}
          <EvidenceLabel text={data?.answer_label ?? "AI synthesis (evidence-grounded)"} />
        </h2>
        {query && (
          <p className="overview-subtitle muted small">
            Summarising all work in this investigation related to <em>{query}</em>
          </p>
        )}
      </div>

      {loading && <Shimmer />}

      {error && (
        <div className="overview-error notice notice--warn">
          <strong>Could not load overview:</strong> {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* Setup / no-LLM notice */}
          {data.setup_message && (
            <div className="notice notice--info overview-notice">
              {data.setup_message}
            </div>
          )}
          {data.llm_notice && (
            <div className="notice notice--warn overview-notice">
              {data.llm_notice}
            </div>
          )}

          {/* Main answer */}
          {data.answer && (
            <div className="overview-answer prose">
              <ReactMarkdown>
                {String(data.answer).replace(/【(S\d+)】/g, "[$1]").replace(/\[(S\d+)\]/g, "**[$1]**")}
              </ReactMarkdown>
            </div>
          )}

          {/* Template summary fallback (no LLM) */}
          {!data.answer && data.template_summary && (
            <p className="overview-answer prose muted">{data.template_summary}</p>
          )}

          {/* Policy notes */}
          {data.policy_notes?.length > 0 && (
            <ul className="overview-policy-notes">
              {data.policy_notes.map((n: string, i: number) => (
                <li key={i} className="notice notice--warn small">
                  {n}
                </li>
              ))}
            </ul>
          )}

          {/* Citations */}
          {data.citations?.length > 0 && (
            <details className="overview-citations">
              <summary className="small">
                Sources used ({data.citations.length})
              </summary>
              <ol className="overview-cites-list">
                {data.citations.map((c: any) => (
                  <li key={c.ref} id={`cite-${c.ref}`}>
                    <strong>[{c.ref}]</strong>{" "}
                    {c.acronym && <span>{c.acronym} · </span>}
                    <span className="muted small">
                      {c.section && `${c.section} · `}
                      {c.locator || c.page}
                    </span>
                    {c.source_url && (
                      <> · <a href={c.source_url} target="_blank" rel="noreferrer" className="small">source ↗</a></>
                    )}
                    {c.excerpt && (
                      <blockquote className="cite-excerpt small muted">
                        {c.excerpt.slice(0, 300)}{c.excerpt.length > 300 ? "…" : ""}
                      </blockquote>
                    )}
                  </li>
                ))}
              </ol>
            </details>
          )}

          {/* Abstain / insufficient evidence */}
          {data.abstained && data.abstain_reason && (
            <p className="muted small overview-abstain">
              <em>Note: {data.abstain_reason}</em>
            </p>
          )}

          {/* Warnings */}
          {data.warnings?.length > 0 && data.warnings.map((w: string, i: number) => (
            <p key={i} className="muted small overview-warn">{w}</p>
          ))}
        </>
      )}
    </section>
  );
}
