"use client";
import { useEffect, useState } from "react";
import { API_BASE, api } from "@/lib/api";
import { PROVIDERS, type Provider, clearByok, getByok, maskKey, safeTransport, setByok } from "@/lib/byok";
import { ErrorBox, Loading, Notice, PageHead } from "@/components/ui";

function ByokPanel() {
  const [cur, setCur] = useState<ReturnType<typeof getByok>>(null);
  const [provider, setProvider] = useState<Provider>("groq");
  const [model, setModel] = useState("");
  const [key, setKey] = useState("");
  useEffect(() => { const b = getByok(); setCur(b); if (b) { setProvider(b.provider); setModel(b.model || ""); } }, []);
  const prov = PROVIDERS.find((p) => p.id === provider)!;
  const def = prov.defaultModel;
  const transportOk = safeTransport(API_BASE);
  return (
    <section className="console">
      <p className="console-title" aria-hidden="true"><span>Assistant</span><span>Your key</span></p>
      <h2>Use your own API key (optional)</h2>
      <p>Without a key the assistant still answers: the direct answer and interpretation are computed from the data. A key only adds an AI-written summary.</p>
      <Notice><b>Recommended free option: Groq.</b> Create a free key at <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer">console.groq.com/keys</a>.
        Only Groq&apos;s free-plan production models are allowed (GPT OSS 120B, GPT OSS 20B; free plan 30 requests/min, 1,000/day,
        8K tokens/min — <a href="https://console.groq.com/docs/rate-limits" target="_blank" rel="noreferrer">Groq rate limits</a>).
        If Groq says the limit is reached, you get the computed answer without the AI summary.</Notice>
      <ul className="kv">
        <li>Kept only in this browser tab (sessionStorage). Closing the tab removes it.</li>
        <li>Sent over HTTPS in a request header, only with assistant questions.</li>
        <li>The server uses it for that one request. It is never stored, logged or shown back.</li>
      </ul>
      {!transportOk && <Notice kind="warn">The API address is not HTTPS, so your key will not be sent.</Notice>}
      {cur ? (
        <>
          <Notice>Active in this tab: <b>{PROVIDERS.find((p) => p.id === cur.provider)?.label}</b> · model {cur.model || PROVIDERS.find((p) => p.id === cur.provider)?.defaultModel} · key {maskKey(cur.key)}</Notice>
          <button className="secondary" onClick={() => { clearByok(); setCur(null); setKey(""); }}>Remove key from this tab</button>
        </>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); if (key.trim().length < 16) return; setByok({ provider, key, model }); setCur(getByok()); setKey(""); }}>
          <label htmlFor="byok-provider">Provider</label>
          <select id="byok-provider" value={provider} onChange={(e) => { setProvider(e.target.value as Provider); setModel(""); }}>
            {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <label htmlFor="byok-model">Model{prov.models ? "" : " (optional)"}</label>
          {prov.models ? (
            <select id="byok-model" value={model || def} onChange={(e) => setModel(e.target.value)}>
              {prov.models.map((m) => <option key={m} value={m}>{m}{m === def ? " (default)" : ""}</option>)}
            </select>
          ) : (
            <input id="byok-model" value={model} onChange={(e) => setModel(e.target.value)} placeholder={def} maxLength={100} autoComplete="off" />
          )}
          <label htmlFor="byok-key">API key</label>
          <input id="byok-key" type="password" value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" spellCheck={false} />
          <div className="actions"><button type="submit" disabled={key.trim().length < 16}>Use in this tab</button></div>
        </form>
      )}
    </section>
  );
}

export default function Settings() {
  const [s, setS] = useState<any>(null);
  const [err, setErr] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [admin, setAdmin] = useState(""); // kept in memory only, never stored
  const load = () => api("/api/settings/ai").then(setS).catch(setErr);
  useEffect(() => { load(); }, []);
  const adminHeaders = admin ? { "X-Admin-Token": admin } : undefined;
  async function update(body: any) {
    setBusy(true); setErr(null);
    try { setS(await api("/api/settings/ai", { method: "PUT", body: JSON.stringify(body), headers: adminHeaders })); } catch (x) { setErr(x); }
    setBusy(false);
  }
  if (!s) return <><ErrorBox error={err} /><Loading /></>;
  const locked = !s.admin?.enabled;
  return (
    <>
      <PageHead no="08" kicker="Settings" title="AI provider settings">
        <p>Catalog, filters, coverage, compare and ranking never need an LLM or API key. The assistant&apos;s direct answers are computed from the data;
        an LLM only adds a summary. Server defaults come from environment variables.</p>
      </PageHead>
      <ErrorBox error={err} />
      <div className="settings-grid">
      <ByokPanel />
      <section className="console">
        <p className="console-title" aria-hidden="true"><span>Server</span><span>LLM</span></p>
        <h2>Server language model</h2>
        <Notice kind={locked ? "warn" : "info"}>{s.admin?.message}</Notice>
        <label htmlFor="admin">Admin token (only for changing server settings)</label>
        <input id="admin" type="password" value={admin} onChange={(e) => setAdmin(e.target.value)} autoComplete="off" disabled={locked} />
        <label htmlFor="llm">Provider</label>
        <select id="llm" disabled={busy || locked} value={s.llm.configured_provider} onChange={(e) => update({ ai_llm_provider: e.target.value })}>
          <option value="groq">Groq, free plan — recommended ({s.models.groq}) — needs GROQ_API_KEY</option>
          <option value="local">Local / free — Ollama ({s.models.ollama})</option>
          <option value="openai">OpenAI ({s.models.openai}) — needs OPENAI_API_KEY</option>
          <option value="anthropic">Anthropic ({s.models.anthropic}) — needs ANTHROPIC_API_KEY</option>
          <option value="none">None — computed answers only</option>
        </select>
        <Notice kind={s.llm.ok ? "info" : "warn"}>{s.llm.ok ? "Ready: " : "Not ready: "}{s.llm.message}</Notice>
        <p className="kv">Server keys present: Groq <b>{s.keys_present.groq ? "yes" : "no"}</b> · OpenAI <b>{s.keys_present.openai ? "yes" : "no"}</b> · Anthropic <b>{s.keys_present.anthropic ? "yes" : "no"}</b></p>
        {s.ask_limits && <p className="small muted">Shared server key limits for AI summaries: {s.ask_limits.per_ip_per_min}/min and {s.ask_limits.per_ip_per_day}/day per visitor;
          site-wide {s.ask_limits.global_per_min}/min and {s.ask_limits.global_per_day}/day. Your own key is not counted.</p>}
      </section>
      <section className="console">
        <p className="console-title" aria-hidden="true"><span>Retrieval</span><span>Vectors</span></p>
        <h2>Embeddings (vector search)</h2>
        <label htmlFor="emb">Provider</label>
        <select id="emb" disabled={busy || locked} value={s.embeddings.requested} onChange={(e) => update({ ai_embedding_provider: e.target.value })}>
          <option value="local">Local / free — sentence-transformers ({s.models.local_embedding})</option>
          <option value="openai">OpenAI ({s.models.openai_embedding}) — needs OPENAI_API_KEY</option>
          <option value="hash">Offline hash embeddings (no download; lower quality)</option>
        </select>
        <p className="kv">Active: <b>{s.embeddings.active}</b> ({s.embeddings.model})</p>
        {s.embeddings.note && <Notice kind="warn">{s.embeddings.note}</Notice>}
        <Notice kind={s.vector_index.matches_active_embedder ? "info" : "warn"}>
          Vector index: {s.vector_index.count ?? 0} chunks, backend {s.vector_index.backend ?? "none"}.{" "}
          {s.vector_index.message || "Matches the active embedder."}</Notice>
        <button className="secondary" disabled={busy || locked} onClick={async () => { setBusy(true); try { await api("/api/ingest/rebuild", { method: "POST", headers: adminHeaders }); await load(); } catch (x) { setErr(x); } setBusy(false); }}>
          {busy ? "Working…" : "Rebuild indexes with active embedder"}</button>
      </section>
      </div>
    </>
  );
}
