// Bring-your-own-key (decision D3).
// - The key lives only in sessionStorage, in this browser tab (cleared when the tab closes). Never localStorage, never cookies.
// - It is attached only to AI requests (POST /api/ask for the Assistant and Explorer synthesis, and
//   GET /api/investigations/{id}/overview), only over HTTPS (or to a local dev API).
// - The server uses it for that one request and never stores, logs or returns it.

export type Provider = "groq" | "gemini" | "openai" | "anthropic";
/** The Settings UI and the API allowlist offer only Groq's GPT OSS 120B (console.groq.com/docs/models).
 *  Other provider ids remain on the type so a stale key from an older build is ignored by getByok. */
export const GROQ_MODELS = ["openai/gpt-oss-120b"] as const;
export const PROVIDERS: { id: Provider; label: string; defaultModel: string; models?: readonly string[] }[] = [
  { id: "groq", label: "Groq · GPT OSS 120B", defaultModel: "openai/gpt-oss-120b", models: GROQ_MODELS },
];
const K = { key: "byok.key", provider: "byok.provider", model: "byok.model" };

type StoreLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
function store(): StoreLike | null {
  try {
    return typeof window !== "undefined" && window.sessionStorage ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

export interface Byok { provider: Provider; key: string; model?: string }

export function getByok(s: StoreLike | null = store()): Byok | null {
  const key = s?.getItem(K.key);
  const provider = s?.getItem(K.provider) as Provider | null;
  if (!key || !provider || !PROVIDERS.some((p) => p.id === provider)) return null;
  return { provider, key, model: s?.getItem(K.model) || undefined };
}

export function setByok(b: Byok, s: StoreLike | null = store()): void {
  if (!s) return;
  s.setItem(K.provider, b.provider);
  s.setItem(K.key, b.key.trim());
  if (b.model?.trim()) s.setItem(K.model, b.model.trim());
  else s.removeItem(K.model);
}

export function clearByok(s: StoreLike | null = store()): void {
  if (!s) return;
  for (const k of Object.values(K)) s.removeItem(k);
}

export function maskKey(key: string): string {
  return key.length <= 8 ? "••••" : `${key.slice(0, 4)}••••${key.slice(-2)}`;
}

/** True when a key may be sent to this API base: HTTPS, or a local development API. */
export function safeTransport(apiBase: string): boolean {
  try {
    const u = new URL(apiBase);
    return u.protocol === "https:" || (u.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname));
  } catch {
    return false;
  }
}

/** Headers for an AI request. Empty unless a key is set and the transport is safe.
 *  Use ONLY for POST /api/ask and GET /api/investigations/{id}/overview (the API refuses the key anywhere else). */
export function assistantHeaders(apiBase: string, s: StoreLike | null = store()): Record<string, string> {
  const b = getByok(s);
  if (!b || !safeTransport(apiBase)) return {};
  const h: Record<string, string> = { "X-LLM-Provider": b.provider, "X-LLM-Key": b.key };
  if (b.model) h["X-LLM-Model"] = b.model;
  return h;
}
