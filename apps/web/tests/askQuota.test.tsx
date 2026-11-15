import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AskQuota, type Quota, quotaText } from "../components/AskQuota";

const w = (limit: number, used: number, resets_at: number | null = null) => ({ limit, used, remaining: limit - used, resets_at });
const Q: Quota = { own_key: false, server_ai: true, provider: "groq", model: "openai/gpt-oss-120b",
  you: { minute: w(10, 1), day: w(200, 13) }, site: { minute: w(25, 3), day: w(900, 88) } };

describe("Ask quota status", () => {
  it("shows nothing while AI answers are available, even when a limit is hit", () => {
    expect(quotaText(Q, false)).toBe("");
    expect(quotaText(null, false)).toBe("");
    const blocked = { ...Q, you: { minute: w(3, 3, 1_800_000_000), day: w(50, 50, 1_800_000_000) } };
    expect(quotaText(blocked, false)).toBe("");
    expect(renderToStaticMarkup(<AskQuota quota={Q} ownKey={false} />)).toBe("");
  });
  it("own key: no site limit", () => {
    expect(quotaText(Q, true)).toBe("Using your own key: no site limit applies.");
    expect(quotaText({ own_key: true }, false)).toBe("Using your own key: no site limit applies.");
  });
  it("no server key: AI off, computed answers still work", () => {
    expect(quotaText({ own_key: false, server_ai: false }, false)).toMatch(/AI summaries are off.*Computed answers and citations still work/);
  });
  it("renders an aria-live status without the prototype note", () => {
    const html = renderToStaticMarkup(<AskQuota quota={Q} ownKey={true} />);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).not.toMatch(/hackathon prototype|this minute|limit reached/);
  });
});
