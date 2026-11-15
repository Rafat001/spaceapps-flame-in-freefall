type Win = { limit: number; used: number; remaining: number | null; resets_at: number | null };
export type Quota = {
  own_key: boolean; message?: string; server_ai?: boolean; provider?: string | null; model?: string | null;
  you?: { minute: Win; day: Win }; site?: { minute: Win; day: Win };
};

/** Plain-text status line. Empty unless the visitor uses their own key or AI is off on this site. */
export function quotaText(q: Quota | null, ownKey: boolean): string {
  if (ownKey || q?.own_key) return "Using your own key: no site limit applies.";
  if (q && (!q.server_ai || !q.you || !q.site)) return "AI summaries are off on this site right now. Computed answers and citations still work.";
  return "";
}

export function AskQuota({ quota, ownKey }: { quota: Quota | null; ownKey: boolean }) {
  const text = quotaText(quota, ownKey);
  if (!text) return null;
  return (
    <div className="quota">
      <p className="quota-count" role="status" aria-live="polite">{text}</p>
    </div>
  );
}
