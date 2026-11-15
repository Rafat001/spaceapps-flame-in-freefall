import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AskQuota, type Quota, quotaText } from "../components/AskQuota";

const w = (limit: number, used: number, resets_at: number | null = null) => ({ limit, used, remaining: limit - used, resets_at });
const Q: Quota = { own_key: false, server_ai: true, provider: "groq", model: "openai/gpt-oss-120b",
  you: { minute: w(10, 1), day: w(200, 13) }, site: { minute: w(25, 3), day: w(900, 88) } };

describe("Ask quota counter", () => {
  it("shows no counter while AI answers are available", () => {
    expect(quotaText(Q, false)).toBe("");
    expect(quotaText(null, false)).toBe("");
  });
  it("tells the visitor when a limit is hit and when it resets", () => {
    const q = { ...Q, you: { minute: w(3, 0), day: w(50, 50, 1_800_000_000) }, site: { minute: w(7, 0), day: w(70, 1) } };
    const t = quotaText(q, false);
    expect(t).toMatch(/^AI answer limit reached · next AI answer after /);
    expect(t).not.toMatch(/this minute|Site-wide/);
  });
  it("own key: no site limit", () => {
    expect(quotaText(Q, true)).toBe("Using your own key: no site limit applies.");
    expect(quotaText({ own_key: true }, false)).toBe("Using your own key: no site limit applies.");
  });
  it("no server key: AI off, computed answers still work", () => {
    expect(quotaText({ own_key: false, server_ai: false }, false)).toMatch(/AI summaries are off.*Computed answers and citations still work/);
  });
  it("renders an aria-live status and the prototype note linking to Settings", () => {
    const html = renderToStaticMarkup(<AskQuota quota={Q} ownKey={false} />);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).not.toContain("this minute");
    expect(html).toMatch(/hackathon prototype/);
    expect(html).toMatch(/AI summaries on Groq are capped/);
    expect(html).toContain("always free and unlimited");
    expect(html).toContain('href="/settings"');
  });
});
