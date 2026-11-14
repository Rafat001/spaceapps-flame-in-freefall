"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { condText, type Cond } from "@/lib/format";

export function EvidenceLabel({ text }: { text?: string | null }) {
  if (!text) return null;
  const kind = /Not reported/i.test(text) ? "nr" : /AI/.test(text) ? "ai" : /brief/i.test(text) ? "brief"
    : /Curator/i.test(text) ? "rule" : /Not established/i.test(text) ? "nr" : "src";
  return <span className={`label label-${kind}`}>{text}</span>;
}

const NOTICE_TAG = { info: "Note", warn: "Caveat", error: "Error" } as const;

export function Notice({ kind = "info", children }: { kind?: "info" | "warn" | "error"; children: ReactNode }) {
  return (
    <div role={kind === "error" ? "alert" : "note"} className={`notice notice-${kind}`}>
      <span className="notice-tag">{NOTICE_TAG[kind]}</span>
      <div className="notice-body">{children}</div>
    </div>
  );
}

export function CondCell({ c, showSource = false }: { c?: Cond | null; showSource?: boolean }) {
  const t = condText(c);
  return (
    <span className={c?.known ? "cond" : "cond cond-unknown"}>
      {t}
      {c?.known && c.n_rows !== undefined && <span className="muted"> ({c.n_rows}/{c.n_total} rows)</span>}
      {c?.known && c.contexts && c.contexts.length > 0 && <span className="muted small block">{c.contexts.join("; ")}</span>}
      {showSource && c?.source_text ? <span className="muted small block">source: “{c.source_text}”</span> : null}
    </span>
  );
}

export function Loading({ what = "Loading" }: { what?: string }) {
  return <p aria-live="polite" className="loading">{what}…</p>;
}

export function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null;
  return <Notice kind="error">{String((error as Error).message || error)}</Notice>;
}

export function InvLink({ id, children }: { id: string; children: ReactNode }) {
  return <Link href={`/investigations/${id}`}>{children}</Link>;
}

/** Editorial page head: section number + kicker in the margin, display title, optional lede. */
export function PageHead({ no, kicker, title, hideTitle, children }: { no: string; kicker: string; title: ReactNode; hideTitle?: boolean; children?: ReactNode }) {
  return (
    <header className="page-head">
      <p className="kicker"><span className="kicker-no">§ {no}</span> {kicker}</p>
      <h1 className={hideTitle ? "sr-only" : "display"}>{title}</h1>
      {children && <div className="lede">{children}</div>}
    </header>
  );
}

export function Disclaimer() {
  return (
    <Notice kind="warn">
      Research discovery tool, <strong>not</strong> a certified fire-risk calculator, materials qualification system, or
      spacecraft safety authority. PSI currently has <strong>no partial-gravity combustion data</strong>; microgravity results
      do not directly establish lunar or Martian performance.
    </Notice>
  );
}
