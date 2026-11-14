import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AskQuota, type Quota, quotaText } from "../components/AskQuota";

const w = (limit: number, used: number, resets_at: number | null = null) => ({ limit, used, remaining: limit - used, resets_at });
const Q: Quota = { own_key: false, server_ai: true, provider: "gemini", model: "gemini-3.8-flash",
  you: { minute: w(10, 1), day: w(200, 13) }, site: { minute: w(25, 3), day: w(900, 88) } };

describe("Ask quota counter", () => {
  it("shows remaining per minute, per day and site-wide from the API values", () => {
    expect(quotaText(Q, false)).toBe("AI answers left for you: 9/10 this minute · 187/200 today · Site-wide today: 812/900");
  });
  it("uses whatever limits the API returns (nothing hard-coded)", () => {
    const q = { ...Q, you: { minute: w(3, 0), day: w(50, 50, 1_800_000_000) }, site: { minute: w(7, 0), day: w(70, 1) } };
    const t = quotaText(q, false);
    expect(t).toContain("3/3 this minute");
    expect(t).toContain("0/50 today");
    expect(t).toContain("Site-wide today: 69/70");
    expect(t).toContain("next AI answer after");
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
    expect(html).toContain("9/10 this minute");
    expect(html).toMatch(/hackathon prototype/);
    expect(html).toMatch(/Gemini&#x27;s free tier|Gemini's free tier/);
    expect(html).toContain("always free and unlimited");
    expect(html).toContain('href="/settings"');
  });
});
