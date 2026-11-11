"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ErrorBox, Loading, Notice, PageHead } from "@/components/ui";

export default function Settings() {
  const [s, setS] = useState<any>(null);
  const [err, setErr] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const load = () => api("/api/settings/ai").then(setS).catch(setErr);
  useEffect(() => { load(); }, []);
  async function update(body: any) {
    setBusy(true); setErr(null);
    try { setS(await api("/api/settings/ai", { method: "PUT", body: JSON.stringify(body) })); } catch (x) { setErr(x); }
    setBusy(false);
  }
  if (!s) return <><ErrorBox error={err} /><Loading /></>;
  return (
    <>
      <PageHead no="06" kicker="Settings" title="AI provider settings">
        <p>Catalog, filters, coverage, compare and ranking never need an LLM or API key. The assistant uses the LLM below;
        retrieval uses the embedding provider. Defaults come from <code>.env</code>; changes here last until the API restarts. API keys are
        read from environment variables only and are never sent from the browser.</p>
      </PageHead>
      <ErrorBox error={err} />
      <div className="settings-grid">
      <section className="console">
        <p className="console-title" aria-hidden="true"><span>Assistant</span><span>LLM</span></p>
        <h2>Language model</h2>
        <label htmlFor="llm">Provider</label>
        <select id="llm" disabled={busy} value={s.llm.configured_provider} onChange={(e) => update({ ai_llm_provider: e.target.value })}>
          <option value="local">Local / free — Ollama ({s.models.ollama})</option>
          <option value="openai">OpenAI ({s.models.openai}) — needs OPENAI_API_KEY</option>
          <option value="anthropic">Anthropic ({s.models.anthropic}) — needs ANTHROPIC_API_KEY</option>
          <option value="none">None — retrieval-only mode</option>
        </select>
        <Notice kind={s.llm.ok ? "info" : "warn"}>{s.llm.ok ? "Ready: " : "Not ready: "}{s.llm.message}</Notice>
        <p className="kv">Keys present: OpenAI <b>{s.keys_present.openai ? "yes" : "no"}</b> · Anthropic <b>{s.keys_present.anthropic ? "yes" : "no"}</b> · Ollama URL <b>{s.ollama_base_url}</b></p>
      </section>
      <section className="console">
        <p className="console-title" aria-hidden="true"><span>Retrieval</span><span>Vectors</span></p>
        <h2>Embeddings (vector search)</h2>
        <label htmlFor="emb">Provider</label>
        <select id="emb" disabled={busy} value={s.embeddings.requested} onChange={(e) => update({ ai_embedding_provider: e.target.value })}>
          <option value="local">Local / free — sentence-transformers ({s.models.local_embedding})</option>
          <option value="openai">OpenAI ({s.models.openai_embedding}) — needs OPENAI_API_KEY</option>
          <option value="hash">Offline hash embeddings (no download; lower quality)</option>
        </select>
        <p className="kv">Active: <b>{s.embeddings.active}</b> ({s.embeddings.model})</p>
        {s.embeddings.note && <Notice kind="warn">{s.embeddings.note}</Notice>}
        <Notice kind={s.vector_index.matches_active_embedder ? "info" : "warn"}>
          Vector index: {s.vector_index.count ?? 0} chunks, backend {s.vector_index.backend ?? "none"}.{" "}
          {s.vector_index.message || "Matches the active embedder."}</Notice>
        <button className="secondary" disabled={busy} onClick={async () => { setBusy(true); try { await api("/api/ingest/rebuild", { method: "POST" }); await load(); } catch (x) { setErr(x); } setBusy(false); }}>
          {busy ? "Working…" : "Rebuild indexes with active embedder"}</button>
      </section>
      </div>
    </>
  );
}
