"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { humanize, readCompare } from "@/lib/format";
import { CondCell, ErrorBox, EvidenceLabel, Loading, Notice } from "@/components/ui";

function Cell({ v }: { v: any }) {
  if (v && typeof v === "object" && "known" in v) return <><CondCell c={v} /> <EvidenceLabel text={v.label} />{v.note && <span className="muted small block">{v.note}</span>}</>;
  const val = v?.value;
  return <>{Array.isArray(val) ? val.join("; ") : typeof val === "number" && v.label?.startsWith("Catalog") ? `${Math.round(val * 100)}%` : String(val)}
    {" "}<EvidenceLabel text={v?.label} /></>;
}

function Compare() {
  const sp = useSearchParams();
  const router = useRouter();
  const [meta, setMeta] = useState<any>(null);
  const [ids, setIds] = useState<string[]>([]);
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<unknown>(null);
  useEffect(() => { api("/api/investigations?sort=accession&page_size=100").then(setMeta).catch(setErr); }, []);
  useEffect(() => {
    const fromUrl = (sp.get("ids") || "").split(",").filter(Boolean);
    setIds(fromUrl.length ? fromUrl : readCompare());
  }, [sp]);
  useEffect(() => {
    setData(null);
    if (ids.length >= 2) api("/api/compare", { method: "POST", body: JSON.stringify({ ids }) }).then(setData).catch(setErr);
  }, [ids.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (i: number, v: string) => {
    const n = [...ids]; n[i] = v; const clean = n.filter(Boolean);
    router.push(`/compare?ids=${clean.join(",")}`);
  };
  return (
    <>
      <h1>Compare investigations</h1>
      <p className="muted">Pick 2–3 investigations. Missing fields show <em>Not reported</em>; ranges aggregate individual PSI table rows.</p>
      <div className="row" style={{ maxWidth: 900 }}>
        {[0, 1, 2].map((i) => (
          <div key={i}><label htmlFor={`pick${i}`}>Investigation {i + 1}{i === 2 ? " (optional)" : ""}</label>
            <select id={`pick${i}`} value={ids[i] || ""} onChange={(e) => pick(i, e.target.value)}>
              <option value="">—</option>
              {meta?.items.map((c: any) => <option key={c.id} value={c.id}>{c.acronym} ({c.accession})</option>)}
            </select></div>
        ))}
      </div>
      <ErrorBox error={err} />
      {ids.length < 2 ? <Notice>Select at least two investigations.</Notice> : !data ? <Loading /> : (
        <>
          <div className="table-wrap" style={{ marginTop: 16, maxHeight: "none" }}><table>
            <thead><tr><th>Field</th>{data.investigations.map((c: any) => <th key={c.id}><Link href={`/investigations/${c.id}`}>{c.acronym}</Link></th>)}</tr></thead>
            <tbody>{data.field_order.map((f: string) => (
              <tr key={f}><th scope="row">{humanize(f)}</th>{data.investigations.map((c: any) => <td key={c.id}><Cell v={c.fields[f]} /></td>)}</tr>
            ))}</tbody>
          </table></div>
          <h2>Similarities</h2>
          <ul><li>Shared topics: {data.similarities.shared_topics.map(humanize).join(", ") || "none"}</li>
            <li>Same hardware: {data.similarities.same_hardware ? "yes" : "no"}</li>
            <li>Same fuel class: {data.similarities.same_fuel_class ? "yes" : "no"}</li></ul>
          {data.caveats.map((c: string) => <Notice key={c} kind="warn">{c}</Notice>)}
          <p><a className="btn secondary" href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/export.csv?ids=${ids.join(",")}`}>Download CSV summary</a></p>
        </>
      )}
    </>
  );
}

export default function Page() { return <Suspense fallback={<Loading />}><Compare /></Suspense>; }
