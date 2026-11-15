import Link from "next/link";

type Win = { limit: number; used: number; remaining: number | null; resets_at: number | null };
export type Quota = {
  own_key: boolean; message?: string; server_ai?: boolean; provider?: string | null; model?: string | null;
  you?: { minute: Win; day: Win }; site?: { minute: Win; day: Win };
};

const PROVIDER_NAMES: Record<string, string> = { groq: "Groq", gemini: "Gemini", openai: "OpenAI", anthropic: "Anthropic" };
const clock = (t: number) => new Date(t * 1000).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

/** Plain-text status line. Empty while answers are available; only speaks up for own key, AI off, or a hit limit. */
export function quotaText(q: Quota | null, ownKey: boolean): string {
  if (ownKey || q?.own_key) return "Using your own key: no site limit applies.";
  if (!q) return "";
  if (!q.server_ai || !q.you || !q.site) return "AI summaries are off on this site right now. Computed answers and citations still work.";
  const blocked = [q.you.minute, q.site.minute, q.you.day, q.site.day].find((w) => w.remaining === 0 && w.resets_at);
  return blocked?.resets_at ? `AI answer limit reached · next AI answer after ${clock(blocked.resets_at)}` : "";
}

export function AskQuota({ quota, ownKey }: { quota: Quota | null; ownKey: boolean }) {
  const prov = quota?.provider ? PROVIDER_NAMES[quota.provider] ?? quota.provider : "Groq";
  return (
    <div className="quota">
      <p className="quota-count" role="status" aria-live="polite">{quotaText(quota, ownKey)}</p>
      <p className="quota-note">
        This is a hackathon prototype, so AI summaries on {prov} are capped per visitor and per day to keep the shared key&apos;s
        cost bounded. Computed answers and citations are always free and unlimited. For more AI answers, add your own Groq key in <Link href="/settings">Settings</Link>; it stays in this browser tab only.
      </p>
    </div>
  );
}
