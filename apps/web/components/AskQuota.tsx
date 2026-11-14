import Link from "next/link";

type Win = { limit: number; used: number; remaining: number | null; resets_at: number | null };
export type Quota = {
  own_key: boolean; message?: string; server_ai?: boolean; provider?: string | null; model?: string | null;
  you?: { minute: Win; day: Win }; site?: { minute: Win; day: Win };
};

const PROVIDER_NAMES: Record<string, string> = { groq: "Groq", gemini: "Gemini", openai: "OpenAI", anthropic: "Anthropic" };
const clock = (t: number) => new Date(t * 1000).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const frac = (w: Win) => `${w.remaining ?? w.limit}/${w.limit}`;

/** Plain-text counter line. Every number comes from the API (no limits are hard-coded here). */
export function quotaText(q: Quota | null, ownKey: boolean): string {
  if (ownKey || q?.own_key) return "Using your own key: no site limit applies.";
  if (!q) return "Checking how many AI answers are left…";
  if (!q.server_ai || !q.you || !q.site) return "AI summaries are off on this site right now. Computed answers and citations still work.";
  let s = `AI answers left for you: ${frac(q.you.minute)} this minute · ${frac(q.you.day)} today · Site-wide today: ${frac(q.site.day)}`;
  const blocked = [q.you.minute, q.site.minute, q.you.day, q.site.day].find((w) => w.remaining === 0 && w.resets_at);
  if (blocked?.resets_at) s += ` · next AI answer after ${clock(blocked.resets_at)}`;
  return s;
}

export function AskQuota({ quota, ownKey }: { quota: Quota | null; ownKey: boolean }) {
  const prov = quota?.provider ? PROVIDER_NAMES[quota.provider] ?? quota.provider : "Gemini";
  return (
    <div className="quota">
      <p className="quota-count" role="status" aria-live="polite">{quotaText(quota, ownKey)}</p>
      <p className="quota-note">
        This is a hackathon prototype, so AI summaries run on {prov}&apos;s free tier, which allows only a limited number of
        requests. Computed answers and citations are always free and unlimited. For more AI answers, add your own Gemini key in <Link href="/settings">Settings</Link>; it stays in this browser tab only.
      </p>
    </div>
  );
}
